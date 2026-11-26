# run_bake.ps1 - 공방 라이트맵 굽기 한 줄 실행기(Windows PowerShell 5.1 이상).
#   powershell -ExecutionPolicy Bypass -File run_bake.ps1                  # 낮+밤, 보통 화질
#   powershell -ExecutionPolicy Bypass -File run_bake.ps1 -Quality smoke   # 5분 안 연기 시험(작은 대상 2개)
#   -Quality smoke|fast|normal|high   -Time both|day|night   -Threads 0(전부)   -Format rgbm|png16
#   -CheckOnly   찾은 Blender 와 버전만 보여 주고 끝낸다 · -PickBlender   blender.exe 를 창에서 골라 기억한다(pc_bake\blender_path.txt)
# Blender 를 찾아(blender_path.txt · 환경 변수 BLENDER_EXE · Program Files · Steam · 레지스트리 · PATH), `blender --version` 으로 버전을 읽고
# 3.6 이상이면(4.2 LTS 1순위, 다음은 가장 새 판) 배경 모드로 bake.py 를 돌린다. bake.py 가 판마다 다른 API 를 스스로 고른다.
# 결과: pc_bake\out\house_<화질>.zip (끝나면 탐색기로 연다). 꺼졌다 다시 실행하면 끝난 대상은 건너뛴다.
param(
  [ValidateSet('smoke', 'fast', 'normal', 'high')][string]$Quality = 'normal',
  [ValidateSet('both', 'day', 'night')][string]$Time = 'both',
  [int]$Threads = 0,
  [ValidateSet('rgbm', 'png16')][string]$Format = 'rgbm',
  [switch]$NoOpen,
  [switch]$CheckOnly,
  [switch]$PickBlender
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$DownloadUrl = 'https://www.blender.org/download/lts/4-2/'
$SavedPath = Join-Path $here 'blender_path.txt'
$PickPS = 'powershell -ExecutionPolicy Bypass -File "' + (Join-Path $here 'run_bake.ps1') + '" -PickBlender'
$PickCMD = '"' + (Join-Path $here 'run_bake.cmd') + '" pick'

function Get-BlenderVersion([string]$exe) {
  try {
    $v = & $exe --version 2>$null | Select-Object -First 1
    if ($v -match 'Blender\s+(\d+)\.(\d+)') { return [version]("{0}.{1}" -f $Matches[1], $Matches[2]) }
  } catch { }
  return $null
}

function Test-Supported($v) { return $v -and ($v.Major -gt 3 -or ($v.Major -eq 3 -and $v.Minor -ge 6)) }

function Find-Blender {
  $c = New-Object System.Collections.Generic.List[string]
  if (Test-Path $SavedPath) { $sp = (Get-Content $SavedPath -Raw).Trim().Trim('"'); if ($sp) { $c.Add($sp) } }
  if ($env:BLENDER_EXE) { $c.Add($env:BLENDER_EXE.Trim('"')) }
  foreach ($pf in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:ProgramW6432, "$env:LOCALAPPDATA\Programs")) {
    if (-not $pf) { continue }
    $bf = Join-Path $pf 'Blender Foundation'
    if (Test-Path $bf) {
      $dirs = Get-ChildItem $bf -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'Blender*' } |
        Sort-Object @{ Expression = { if ($_.Name -eq 'Blender 4.2') { 0 } else { 1 } } }, @{ Expression = { $_.Name }; Descending = $true }
      foreach ($d in $dirs) { $c.Add((Join-Path $d.FullName 'blender.exe')) }
    }
  }
  # Steam(기본 자리 + libraryfolders.vdf 의 다른 라이브러리)
  $steamRoots = @()
  foreach ($k in @('HKCU:\Software\Valve\Steam', 'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam', 'HKLM:\SOFTWARE\Valve\Steam')) {
    try { $p = (Get-ItemProperty $k -ErrorAction Stop); if ($p.SteamPath) { $steamRoots += $p.SteamPath }; if ($p.InstallPath) { $steamRoots += $p.InstallPath } } catch { }
  }
  $steamRoots += "${env:ProgramFiles(x86)}\Steam"
  foreach ($s in ($steamRoots | Select-Object -Unique)) {
    $c.Add((Join-Path $s 'steamapps\common\Blender\blender.exe'))
    $vdf = Join-Path $s 'steamapps\libraryfolders.vdf'
    if (Test-Path $vdf) {
      foreach ($m in [regex]::Matches((Get-Content $vdf -Raw), '"path"\s+"([^"]+)"')) {
        $c.Add((Join-Path ($m.Groups[1].Value -replace '\\\\', '\') 'steamapps\common\Blender\blender.exe'))
      }
    }
  }
  # 레지스트리(설치 프로그램 목록 · .blend 연결)
  foreach ($k in @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*')) {
    try {
      Get-ItemProperty $k -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Blender*' } | Sort-Object DisplayVersion -Descending | ForEach-Object {
        if ($_.InstallLocation) { $c.Add((Join-Path $_.InstallLocation 'blender.exe')) }
        if ($_.DisplayIcon) { $c.Add(($_.DisplayIcon -split ',')[0].Trim('"')) }
      }
    } catch { }
  }
  try {
    $cmd = (Get-ItemProperty 'Registry::HKEY_CLASSES_ROOT\blendfile\shell\open\command' -ErrorAction Stop).'(default)'
    if ($cmd -match '"([^"]+blender[^"]*\.exe)"') { $c.Add($Matches[1]) }
  } catch { }
  $g = Get-Command blender.exe -ErrorAction SilentlyContinue
  if ($g) { $c.Add($g.Source) }
  $best = $null; $bestV = $null; $script:TooOld = $null
  foreach ($p in ($c | Where-Object { $_ } | Select-Object -Unique)) {
    if (-not (Test-Path $p -PathType Leaf)) { continue }
    $v = Get-BlenderVersion $p
    if (-not (Test-Supported $v)) { if ($v) { $script:TooOld = "$v ($p)" }; continue }
    if ($v.Major -eq 4 -and $v.Minor -eq 2) { return @{ Exe = $p; Version = $v } }   # 4.2 LTS 가 1순위
    if (-not $best -or $v -gt $bestV) { $best = $p; $bestV = $v }                    # 다음은 가장 새 판
  }
  if ($best) { return @{ Exe = $best; Version = $bestV } }
  return $null
}

if ($PickBlender) {
  Add-Type -AssemblyName System.Windows.Forms
  $dlg = New-Object System.Windows.Forms.OpenFileDialog
  $dlg.Title = 'blender.exe'; $dlg.Filter = 'blender.exe|blender.exe'; $dlg.InitialDirectory = $env:ProgramFiles
  if ($dlg.ShowDialog() -ne 'OK') { Write-Host '고르지 않았습니다. 다시 실행해 blender.exe 를 고르세요.' -ForegroundColor Yellow; exit 1 }
  $v = Get-BlenderVersion $dlg.FileName
  if (-not (Test-Supported $v)) { Write-Host ("고른 파일의 Blender 판({0})은 쓸 수 없습니다 - 3.6 이상(권장 4.2 LTS: $DownloadUrl)을 설치하세요." -f $v) -ForegroundColor Yellow; exit 1 }
  Set-Content -Path $SavedPath -Value $dlg.FileName -Encoding UTF8
  Write-Host ("기억했습니다: Blender {0} - {1}. 이제 굽기 명령을 다시 실행하세요." -f $v, $dlg.FileName) -ForegroundColor Green
  exit 0
}

$b = Find-Blender
if (-not $b) {
  if ($script:TooOld) { Write-Host "Blender $($script:TooOld) 는 너무 오래된 판입니다 - $DownloadUrl 에서 Blender 4.2 LTS(.msi)를 설치한 뒤 같은 명령을 다시 실행하세요." -ForegroundColor Yellow }
  else { Write-Host "Blender 를 찾지 못했습니다 - $DownloadUrl 에서 Blender 4.2 LTS(.msi)를 설치하거나, 이미 깔려 있으면 아래 명령으로 blender.exe 를 직접 고르세요." -ForegroundColor Yellow }
  Write-Host "  PowerShell: $PickPS"
  Write-Host "  cmd:        $PickCMD"
  exit 1
}
Write-Host ("Blender {0}: {1}" -f $b.Version, $b.Exe)
if ($CheckOnly) {
  Write-Host '이 Blender 로 구울 수 있습니다(3.6 이상). 다른 blender.exe 를 쓰려면:'
  Write-Host "  PowerShell: $PickPS"
  Write-Host "  cmd:        $PickCMD"
  exit 0
}
if (-not ($b.Version.Major -eq 4 -and $b.Version.Minor -eq 2)) {
  Write-Host ("Blender {0} 로 굽습니다(판에 맞춰 API 를 고릅니다. 문제가 나면 4.2 LTS: $DownloadUrl)." -f $b.Version) -ForegroundColor Yellow
}
$times = if ($Time -eq 'both') { 'day,night' } else { $Time }
$out = Join-Path $here 'out'
New-Item -ItemType Directory -Force -Path $out | Out-Null
Write-Host ("굽기 시작: 화질 {0}, 시간 {1}. 창을 닫거나 PC 가 꺼져도 다시 실행하면 끝난 곳부터 이어 굽습니다. 진행: {2}" -f $Quality, $times, (Join-Path $out "house_$Quality\bake_log.txt"))

# 굽는 동안 PC 가 잠들지 않게(화면은 꺼져도 된다). 끝나면 원래대로.
$sig = '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
try { $pw = Add-Type -MemberDefinition $sig -Name 'RoomBakePower' -Namespace 'RoomBake' -PassThru; [void]$pw::SetThreadExecutionState([uint32]'0x80000001') } catch { $pw = $null }
$argv = @('-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '-P', (Join-Path $here 'bake.py'), '--',
  '--time', $times, '--quality', $Quality, '--format', $Format, '--threads', "$Threads", '--out', $out, '--scene', (Join-Path $here 'scene'))
try {
  & $b.Exe @argv
  $rc = $LASTEXITCODE
} finally {
  if ($pw) { [void]$pw::SetThreadExecutionState([uint32]'0x80000000') }
}
$zip = Join-Path $out "house_$Quality.zip"
if ($rc -eq 0 -and (Test-Path $zip)) {
  Write-Host ("끝났습니다. 이 파일을 채팅에 올려 주세요: {0}" -f $zip) -ForegroundColor Green
  if (-not $NoOpen) { Start-Process explorer.exe -ArgumentList "/select,`"$zip`"" }
  exit 0
}
Write-Host ("굽기가 끝나지 않았습니다(종료 코드 {0}). 같은 명령을 다시 실행하면 이어서 굽습니다. 기록: {1}" -f $rc, (Join-Path $out "house_$Quality\bake_log.txt")) -ForegroundColor Yellow
exit 1
