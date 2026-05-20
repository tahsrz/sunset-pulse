$ErrorActionPreference = "Stop"

$pulseRoot = "C:\Users\Taz\SunsetPulse"
$warsRoot = "C:\Users\Taz\SunsetWars"
$orchestrator = Join-Path $warsRoot "orchestrator.py"
$python = "C:\Python312\python.exe"
$logDir = Join-Path $pulseRoot "scripts\logs"
$outLog = Join-Path $logDir "web-knowledge-worker.out.log"
$errLog = Join-Path $logDir "web-knowledge-worker.err.log"
$launchLog = Join-Path $logDir "web-knowledge-worker.launch.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $warsRoot "knowledge_hub\seeds") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $warsRoot "knowledge_hub\processed") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $warsRoot "cartridges\universe") | Out-Null

$existing = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" |
  Where-Object { $_.CommandLine -like "*$orchestrator*" }

if ($existing) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $launchLog -Value "[$timestamp] Web knowledge worker already running as PID $($existing.ProcessId)."
  exit 0
}

$env:PYTHONUNBUFFERED = "1"
Set-Location $warsRoot

try {
  & $python $orchestrator 1>> $outLog 2>> $errLog
} finally {
  Set-Location $pulseRoot
  npm run atlas:publish 1>> $outLog 2>> $errLog
}
