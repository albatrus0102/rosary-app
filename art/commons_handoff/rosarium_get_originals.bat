@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='%~f0'; iex ((Get-Content -LiteralPath $f -Encoding UTF8 | Select-Object -Skip 4) -join [Environment]::NewLine)"
pause
exit /b
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Drawing
$desk = [Environment]::GetFolderPath('Desktop')
$dir = Join-Path $desk 'rosarium_originals'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$ua = 'RosariumImageFetch/1.0 (personal non-commercial prayer app; Wikimedia Commons originals)'
$files = @(
  @('01_pieta_A.jpg','https://upload.wikimedia.org/wikipedia/commons/f/ff/Michelangelo%27s_Pieta,_St._Peter%27s_Basilica,_Vatican_City_(48466681337).jpg',6000,4000),
  @('01_pieta_B.jpg','https://upload.wikimedia.org/wikipedia/commons/6/6b/Michelangelo%27s_Pieta,_St._Peter%27s_Basilica,_Vatican_City_(48466667502).jpg',6000,4000),
  @('03_st_peter_bronze_A.jpg','https://upload.wikimedia.org/wikipedia/commons/8/82/St._Peter%27s_Basilica,_Bronze_Statue_of_St._Peter_(48466478846).jpg',4000,6000),
  @('04_ciborium_A.jpg','https://upload.wikimedia.org/wikipedia/commons/a/ab/Ciborium_in_the_Basilica_di_San_Giovanni_in_Laterano_2013.jpg',3168,4752),
  @('04_ciborium_B.jpg','https://upload.wikimedia.org/wikipedia/commons/7/71/High_Altar_and_Ciborium,_Basilica_San_Giovanni_in_Laterano_(45603136844).jpg',3648,5472),
  @('05_apse_mosaic_A.jpg','https://upload.wikimedia.org/wikipedia/commons/1/16/Apse_mosaic_of_the_Basilica_of_Saint_Paul_Outside_the_Walls.jpg',3000,2000),
  @('05_apse_mosaic_B.jpg','https://upload.wikimedia.org/wikipedia/commons/1/15/Apse_mosaic_Basilica_of_St_Paul_Outside_the_Walls.jpg',3000,2000),
  @('06_st_paul_tomb_A.jpg','https://upload.wikimedia.org/wikipedia/commons/e/e7/St._Paul%27s_Tomb.jpg',6280,5048),
  @('07_madonna_albero_A.jpg','https://upload.wikimedia.org/wikipedia/commons/d/de/Chapel_of_the_Madonna_dell%27Albero,_Milan_Cathedral.jpg',3782,5741),
  @('08_hawkwood_A.jpg','https://upload.wikimedia.org/wikipedia/commons/2/24/Paolo_uccello,_Monumento_equestre_di_John_Hawkwood,_1436,_01.JPG',1908,2936),
  @('08_hawkwood_B.jpg','https://upload.wikimedia.org/wikipedia/commons/c/cc/Paolo_uccello,_Monumento_equestre_di_John_Hawkwood,_1436,_01-edit.jpg',1773,2845),
  @('09_tolentino_A.jpg','https://upload.wikimedia.org/wikipedia/commons/4/41/Andrea_del_castagno,_Monumento_equestre_di_Niccol%C3%B2_da_Tolentino,_1456,_01.JPG',1776,2728),
  @('09_tolentino_B.jpg','https://upload.wikimedia.org/wikipedia/commons/b/be/Firenze.Duomo.Tolentino.JPG',834,1224),
  @('10_dante_A.jpg','https://upload.wikimedia.org/wikipedia/commons/e/e2/Michelino_DanteAndHisPoem.jpg',5477,4326),
  @('10_dante_B.jpg','https://upload.wikimedia.org/wikipedia/commons/7/7b/Dante_Domenico_di_Michelino.jpg',2048,1649)
)
$report = @()
$i = 0
foreach ($r in $files) {
  $i++
  $name = $r[0]; $url = $r[1]; $w = $r[2]; $h = $r[3]
  $dest = Join-Path $dir $name
  Write-Host ("[{0}/15] {1}" -f $i, $name)
  $ok = $false
  if (Test-Path $dest) { $ok = $true; Write-Host '   already downloaded' }
  for ($try = 1; (-not $ok) -and $try -le 6; $try++) {
    try {
      Invoke-WebRequest -Uri $url -OutFile $dest -UserAgent $ua -UseBasicParsing
      $ok = $true
    } catch {
      $wait = 30 * $try
      Write-Host ("   busy, waiting {0}s and retrying ({1}/6)" -f $wait, $try)
      Start-Sleep -Seconds $wait
    }
  }
  $status = 'error'; $size = ''; $hash = ''
  if ($ok) {
    try {
      $img = [System.Drawing.Image]::FromFile($dest)
      $iw = $img.Width; $ih = $img.Height; $img.Dispose()
      if ($iw -eq $w -and $ih -eq $h) { $status = 'ok' } else { $status = "size_mismatch_${iw}x${ih}" }
      $size = (Get-Item $dest).Length
      $hash = (Get-FileHash -Algorithm SHA256 $dest).Hash.ToLower()
    } catch { $status = 'not_an_image' }
  }
  Write-Host ("   -> {0}" -f $status)
  $report += [pscustomobject]@{ file = $name; status = $status; width = $w; height = $h; bytes = $size; sha256 = $hash; url = $url }
  Start-Sleep -Seconds 3
}
$report | Export-Csv -Path (Join-Path $dir 'report.csv') -NoTypeInformation -Encoding UTF8
$zip = Join-Path $desk 'rosarium_originals.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $dir '*') -DestinationPath $zip
$okc = ($report | Where-Object { $_.status -eq 'ok' }).Count
Write-Host ''
Write-Host ("DONE: {0}/15 ok. Upload this file to Claude:  {1}" -f $okc, $zip)
explorer.exe /select,"$zip"
