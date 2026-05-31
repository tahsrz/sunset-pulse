$ErrorActionPreference = "Stop"

$appRoot = "C:\Users\Taz\SunsetPulse\apps\pulse"
$logDir = Join-Path $appRoot "scripts\logs"
$outLog = Join-Path $logDir "local-news-signals.out.log"
$errLog = Join-Path $logDir "local-news-signals.err.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Location $appRoot

npm run news:publish-local 1>> $outLog 2>> $errLog
