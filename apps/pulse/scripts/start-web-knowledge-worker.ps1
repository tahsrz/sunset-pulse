$ErrorActionPreference = "Stop"

$pulseRoot = "C:\Users\Taz\SunsetPulse"
$appRoot = Join-Path $pulseRoot "apps\pulse"
$warsRoot = "C:\Users\Taz\SunsetWars"
$orchestrator = Join-Path $warsRoot "orchestrator.py"
$python = "C:\Python312\python.exe"
$crawlPython = Join-Path $appRoot ".venv-lead-intel\Scripts\python.exe"
$tsxCli = Join-Path $pulseRoot "node_modules\tsx\dist\cli.mjs"
$wikipediaScript = Join-Path $appRoot "scripts\crawl-wikipedia-to-tah.ts"
$logDir = Join-Path $appRoot "scripts\logs"
$outLog = Join-Path $logDir "web-knowledge-worker.out.log"
$errLog = Join-Path $logDir "web-knowledge-worker.err.log"
$launchLog = Join-Path $logDir "web-knowledge-worker.launch.log"
$wikiOutLog = Join-Path $logDir "wikipedia-crawl4ai.out.log"
$wikiErrLog = Join-Path $logDir "wikipedia-crawl4ai.err.log"
$wikipediaStateDir = Join-Path $appRoot ".pulse-local\wikipedia"
$wikipediaStatePath = Join-Path $wikipediaStateDir "ingestion-state.json"
$legacyWikipediaStatePath = Join-Path $appRoot "cartridges\wikipedia\ingestion-state.json"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path $wikipediaStateDir | Out-Null
if (-not (Test-Path -LiteralPath $wikipediaStatePath) -and (Test-Path -LiteralPath $legacyWikipediaStatePath)) {
  Copy-Item -LiteralPath $legacyWikipediaStatePath -Destination $wikipediaStatePath
}
if (Test-Path -LiteralPath $warsRoot) {
  New-Item -ItemType Directory -Force -Path (Join-Path $warsRoot "knowledge_hub\seeds") | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $warsRoot "knowledge_hub\processed") | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $warsRoot "cartridges\universe") | Out-Null
}

$existingWikipedia = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*crawl-wikipedia-to-tah*" }

if (-not $existingWikipedia) {
  if (-not (Test-Path -LiteralPath $tsxCli)) {
    throw "The installed tsx CLI was not found at $tsxCli."
  }
  if (-not (Test-Path -LiteralPath $wikipediaScript)) {
    throw "The Wikipedia ingestion script was not found at $wikipediaScript."
  }
  if (-not (Test-Path -LiteralPath $crawlPython)) {
    throw "The Crawl4AI Python environment was not found at $crawlPython."
  }
  & $crawlPython -c "from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig" 2>> $wikiErrLog
  if ($LASTEXITCODE -ne 0) {
    throw "The Crawl4AI Python environment failed its import preflight. See $wikiErrLog."
  }
  $env:LEAD_INTEL_PYTHON = $crawlPython
  $env:LEAD_INTEL_ALLOWED_DOMAINS = "wikipedia.org"
  $env:WIKIPEDIA_INGESTION_STATE_PATH = $wikipediaStatePath
  $wikiProcess = Start-Process `
    -FilePath "node.exe" `
    -ArgumentList @($tsxCli, $wikipediaScript, "--continuous") `
    -WorkingDirectory $appRoot `
    -RedirectStandardOutput $wikiOutLog `
    -RedirectStandardError $wikiErrLog `
    -WindowStyle Hidden `
    -PassThru
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $launchLog -Value "[$timestamp] Wikipedia Crawl4AI worker started as PID $($wikiProcess.Id)."
}

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
