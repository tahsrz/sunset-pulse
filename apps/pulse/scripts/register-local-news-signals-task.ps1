$ErrorActionPreference = "Stop"

$taskName = "SunsetPulse Local News Signals"
$script = "C:\Users\Taz\SunsetPulse\apps\pulse\scripts\start-local-news-signals.ps1"
$startAt = (Get-Date).AddMinutes(1)

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`"" `
  -WorkingDirectory "C:\Users\Taz\SunsetPulse\apps\pulse"

$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At $startAt `
  -RepetitionInterval (New-TimeSpan -Minutes 30) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

$principal = New-ScheduledTaskPrincipal `
  -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive `
  -RunLevel Limited

$task = New-ScheduledTask `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description "Publishes local Ollama-enriched Sunset Pulse news signals to production every 30 minutes."

Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
Get-ScheduledTask -TaskName $taskName
