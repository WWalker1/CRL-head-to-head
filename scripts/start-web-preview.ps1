param(
  [ValidateRange(1024, 65535)][int]$WebPort = 3100,
  [switch]$EnablePublicLookup
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$nextEntry = Join-Path $projectRoot 'node_modules/next/dist/bin/next'
if (-not (Test-Path -LiteralPath $nextEntry)) {
  throw 'Install project dependencies with npm ci before starting the preview.'
}
$previousSiteUrl = $env:NEXT_PUBLIC_SITE_URL
$previousLookup = $env:PUBLIC_PLAYER_LOOKUP_ENABLED
Push-Location -LiteralPath $projectRoot
try {
  $env:NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:$WebPort"
  $env:PUBLIC_PLAYER_LOOKUP_ENABLED = if ($EnablePublicLookup) { '1' } else { '0' }
  Write-Host "Preview: http://127.0.0.1:$WebPort/guides"
  Write-Host 'Keep this terminal open. Ctrl+C stops the preview.'
  if ($EnablePublicLookup) {
    Write-Host 'Public lookup is enabled for this process and uses configured game/model services and shared quotas.'
  }
  & node $nextEntry dev --hostname 127.0.0.1 --port $WebPort
  if ($LASTEXITCODE -ne 0) { throw "Preview exited with code $LASTEXITCODE. Check the startup output above." }
} finally {
  $env:NEXT_PUBLIC_SITE_URL = $previousSiteUrl
  $env:PUBLIC_PLAYER_LOOKUP_ENABLED = $previousLookup
  Pop-Location
}
