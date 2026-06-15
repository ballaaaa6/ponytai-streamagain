$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$nodePath = (Get-Command node.exe).Source
$taskName = "Ponytai StreamAgain Agent"

try {
  $action = New-ScheduledTaskAction -Execute $nodePath -Argument "agent/server.js" -WorkingDirectory $projectRoot
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 7) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Runs the Ponytai StreamAgain local FFmpeg agent at Windows logon." -Force | Out-Null
  Start-ScheduledTask -TaskName $taskName
  Write-Host "Installed and started scheduled task: $taskName"
} catch {
  $startup = [Environment]::GetFolderPath("Startup")
  $vbsPath = Join-Path $startup "Ponytai StreamAgain Agent.vbs"
  $command = "cd /d `"$projectRoot`" && `"$nodePath`" agent/server.js"
  $vbs = @"
Set shell = CreateObject("WScript.Shell")
shell.Run "cmd.exe /c $command", 0, False
"@
  Set-Content -Path $vbsPath -Value $vbs -Encoding ASCII
  Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`"" -WindowStyle Hidden
  Write-Host "Scheduled task failed, installed Startup Folder launcher instead."
  Write-Host "Launcher: $vbsPath"
}

Write-Host "Project: $projectRoot"
