$ErrorActionPreference = 'Stop'
$labRoot = $PSScriptRoot
$labPython = Join-Path $labRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $labPython)) { throw 'Missing models/.venv Python. See EXPERIMENT_REPORT.md for setup.' }
Write-Host 'Open http://127.0.0.1:8766 in your browser. Keep this terminal open; Ctrl+C stops the lab.'
& $labPython (Join-Path $labRoot 'lab_server.py')
