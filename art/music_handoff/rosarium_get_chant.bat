@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='%~f0'; iex ((Get-Content -LiteralPath $f -Encoding UTF8 | Select-Object -Skip 4) -join [Environment]::NewLine)"
pause
exit /b
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$desk = [Environment]::GetFolderPath('Desktop')
$dir = Join-Path $desk 'rosarium_chant'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$ua = 'RosariumChantFetch/1.0 (personal non-commercial prayer app; 6 CC0/PD audio files)'
$api = 'https://commons.wikimedia.org/w/api.php'
$tracks = @(
  @('chant_veni_sancte_spiritus', 'File:Veni.sancte.spiritus.ogg'),
  @('chant_victimae_paschali', 'File:Ostersequenz.ogg'),
  @('chant_puer_natus_est', 'File:Puer.natus.est.ogg'),
  @('chant_rorate_caeli', 'File:Rorate.ogg'),
  @('chant_lamentatio_iii', 'File:Lamentation.III.Karsamstag.ogg'),
  @('chant_dies_irae', 'File:Dies.irae.ogg')
)
function StripHtml($s) { if ($null -eq $s) { return '' }; return (($s -replace '<[^>]+>', '') -replace '\s+', ' ').Trim() }
function Polite($block) {
  for ($try = 1; $try -le 3; $try++) {
    try { return & $block } catch {
      if ($try -eq 3) { throw }
      $wait = 60 * $try
      Write-Host ("   busy, waiting {0}s and retrying ({1}/2)" -f $wait, $try)
      Start-Sleep -Seconds $wait
    }
  }
}
$report = @()
$i = 0
foreach ($t in $tracks) {
  $i++
  $id = $t[0]; $title = $t[1]
  Write-Host ("[{0}/6] {1}" -f $i, $title)
  $row = [ordered]@{ id = $id; commons_title = $title; file_page = ('https://commons.wikimedia.org/wiki/' + $title); status = 'error' }
  try {
    $q = $api + '?action=query&format=json&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Csha1%7Cextmetadata&titles=' + [uri]::EscapeDataString($title)
    $res = Polite { Invoke-RestMethod -Uri $q -UserAgent $ua }
    $page = $res.query.pages.PSObject.Properties | Select-Object -First 1
    $ii = $page.Value.imageinfo[0]
    $em = $ii.extmetadata
    $lic = ('' + $em.License.value).ToLower()
    $row.license = $lic
    $row.license_name = '' + $em.LicenseShortName.value
    $row.license_url = '' + $em.LicenseUrl.value
    $row.artist = StripHtml $em.Artist.value
    $row.credit = StripHtml $em.Credit.value
    $row.description = StripHtml $em.ImageDescription.value
    $row.date = StripHtml $em.DateTimeOriginal.value
    $row.url = $ii.url; $row.bytes = $ii.size; $row.mime = $ii.mime; $row.sha1 = $ii.sha1
    if (-not ($lic -eq 'cc0' -or $lic -eq 'pd' -or $lic.StartsWith('cc0-') -or $lic.StartsWith('pd-'))) {
      $row.status = 'rejected_license'
    } else {
      Start-Sleep -Seconds 5
      $name = $id + [IO.Path]::GetExtension(([uri]$ii.url).AbsolutePath)
      $dest = Join-Path $dir $name
      if (-not (Test-Path $dest)) { Polite { Invoke-WebRequest -Uri $ii.url -OutFile $dest -UserAgent $ua -UseBasicParsing } | Out-Null }
      $hash = (Get-FileHash -Algorithm SHA1 $dest).Hash.ToLower()
      $row.file = $name
      if ($hash -eq $ii.sha1) { $row.status = 'ok' } else { $row.status = 'sha1_mismatch' }
    }
  } catch { $row.error = '' + $_.Exception.Message }
  Write-Host ("   -> {0}  {1} | {2}" -f $row.status, $row.license_name, $row.artist)
  $report += [pscustomobject]$row
  Start-Sleep -Seconds 5
}
$json = ConvertTo-Json -InputObject @($report) -Depth 4
[IO.File]::WriteAllText((Join-Path $dir 'report.json'), $json, (New-Object Text.UTF8Encoding($false)))
$zip = Join-Path $desk 'rosarium_chant.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $dir '*') -DestinationPath $zip
$okc = @($report | Where-Object { $_.status -eq 'ok' }).Count
Write-Host ''
Write-Host ("DONE: {0}/6 ok. Upload this file to Claude:  {1}" -f $okc, $zip)
explorer.exe /select,"$zip"
