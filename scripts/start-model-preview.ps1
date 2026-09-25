param(
  [string]$Python,
  [int]$WebPort = 3001,
  [int]$ModelPort = 8768
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
Set-Location -LiteralPath $projectRoot

if (-not $Python) {
  $Python = Join-Path $projectRoot 'models/.venv/Scripts/python.exe'
  if (-not (Test-Path -LiteralPath $Python)) {
    $gitDirectory = (git rev-parse --path-format=absolute --git-common-dir).Trim()
    $Python = Join-Path (Split-Path $gitDirectory) 'models/.venv/Scripts/python.exe'
  }
}
if (-not (Test-Path -LiteralPath $Python)) { throw 'Pass -Python with the path to a Python environment containing models/service/requirements.txt.' }
if (-not (Test-Path 'models/data/bundle/bundle.json')) { throw 'Export the model bundle first. See LOCAL_DEVELOPMENT.md.' }
if (-not (Test-Path 'node_modules')) {
  & npm.cmd ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
foreach ($port in @($WebPort, $ModelPort)) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $port is already in use. Stop that service or select another port."
  }
}

$env:MODEL_TOOLS_ENABLED = '1'
$env:NEXT_PUBLIC_MODEL_TOOLS_ENABLED = '1'
$env:MODEL_LOCAL_PREVIEW = '1'
$env:MODEL_SERVICE_URL = "http://127.0.0.1:$ModelPort"
$env:MODEL_SERVICE_TOKEN = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$env:MODEL_BUNDLE = Join-Path $projectRoot 'models/data/bundle'
$env:NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:$WebPort"
# Local model preview never reads the original workspace .env or contacts Supabase.
Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:NEXT_PUBLIC_SUPABASE_ANON_KEY -ErrorAction SilentlyContinue
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force '.local' | Out-Null
$serviceProcess = Start-Process -FilePath $Python -ArgumentList @('-m', 'uvicorn', 'service.app:app', '--app-dir', 'models', '--host', '127.0.0.1', '--port', "$ModelPort") -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput "$projectRoot/.local/model.out.log" -RedirectStandardError "$projectRoot/.local/model.err.log"
try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if ($serviceProcess.HasExited) { throw 'Model service exited. Read .local/model.err.log.' }
    try { $response = Invoke-RestMethod "$env:MODEL_SERVICE_URL/ready" -TimeoutSec 1; if ($response.ready) { $ready = $true; break } } catch {}
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Model service did not become ready. Read .local/model.err.log.' }
  Write-Host "Model ready. Open http://127.0.0.1:$WebPort/deck-builder when Next.js reports Ready."
  Write-Host 'Ctrl+C stops the preview. Friend history and sharing require a separate Supabase test project.'
  & npm.cmd run dev -- --hostname 127.0.0.1 --port $WebPort
} finally {
  if (-not $serviceProcess.HasExited) { Stop-Process -Id $serviceProcess.Id }
}
