@echo off
SETLOCAL
:: Sunset Pulse MLS Sync Task
:: Initiates the production data ingestion stream

set PROJECT_DIR=C:\Users\Taz\SunsetPulse
set LOG_DIR=%PROJECT_DIR%\scripts\logs
set TIMESTAMP=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%
set LOG_FILE=%LOG_DIR%\sync_%TIMESTAMP: =0%.log

:: Ensure log directory exists
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%DATE% %TIME%] Starting MLS Sync... >> "%LOG_FILE%"

cd /d "%PROJECT_DIR%"

:: Execute the sync script using tsx
:: We use the full path to npx to ensure reliability in scheduled tasks
"C:\Program Files\nodejs\npx.cmd" tsx scripts/sync-mls-production.ts >> "%LOG_FILE%" 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [%DATE% %TIME%] Sync completed successfully. >> "%LOG_FILE%"
) else (
    echo [%DATE% %TIME%] Sync failed with Error Level %ERRORLEVEL%. >> "%LOG_FILE%"
)

ENDLOCAL
