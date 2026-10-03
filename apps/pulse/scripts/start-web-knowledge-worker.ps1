$ErrorActionPreference = "Stop"

$pulseRoot = "C:\Users\Taz\SunsetPulse"
$appRoot = Join-Path $pulseRoot "apps\pulse"
$warsRoot = "C:\Users\Taz\SunsetWars"
$orchestrator = Join-Path $warsRoot "orchestrator.py"
$python = "C:\Python312\python.exe"
$logDir = Join-Path $appRoot "scripts\logs"
$outLog = Join-Path $logDir "web-knowledge-worker.out.log"
$errLog = Join-Path $logDir "web-knowledge-worker.err.log"
$launchLog = Join-Path $logDir "web-knowledge-worker.launch.log"
$wikiOutLog = Join-Path $logDir "wikipedia-crawl4ai.out.log"
$wikiErrLog = Join-Path $logDir "wikipedia-crawl4ai.err.log"
$composeFile = Join-Path $pulseRoot "infra\local\compose.yaml"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
if (Test-Path -LiteralPath $warsRoot) {
  New-Item -ItemType Directory -Force -Path (Join-Path $warsRoot "knowledge_hub\seeds") | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $warsRoot "knowledge_hub\processed") | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $warsRoot "cartridges\universe") | Out-Null
}

if (-not (Test-Path -LiteralPath $composeFile)) {
  throw "The local Docker Compose file was not found at $composeFile."
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is required to run the Wikipedia crawler."
}

& docker compose -f $composeFile --profile wikipedia up -d --build wikipedia-crawler 1>> $wikiOutLog 2>> $wikiErrLog
if ($LASTEXITCODE -ne 0) {
  throw "The Docker Wikipedia crawler failed to start. See $wikiErrLog."
}
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $launchLog -Value "[$timestamp] Wikipedia Crawl4AI worker started in Docker using the wikipedia-data volume."

$existing = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" |
  Where-Object { $_.CommandLine -like "*$orchestrator*" }

if ($existing) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $launchLog -Value "[$timestamp] Web knowledge worker already running as PID $($existing.ProcessId)."
  exit 0
}

if (-not (Test-Path -LiteralPath $orchestrator)) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $launchLog -Value "[$timestamp] SunsetWars orchestrator is unavailable; Wikipedia Crawl4AI worker remains active."
  exit 0
}

$env:PYTHONUNBUFFERED = "1"
Set-Location $warsRoot

try {
  & $python $orchestrator 1>> $outLog 2>> $errLog
} finally {
  Set-Location $appRoot
  npm run atlas:publish 1>> $outLog 2>> $errLog
}
