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
  $vbs = @"
Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "$projectRoot"
shell.Run """$nodePath"" agent/server.js", 0, False
"@
  Set-Content -Path $vbsPath -Value $vbs -Encoding ASCII
  Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`"" -WindowStyle Hidden
  Write-Host "Scheduled task failed, installed Startup Folder launcher instead."
  Write-Host "Launcher: $vbsPath"
}

$startup = [Environment]::GetFolderPath("Startup")
$tunnelVbsPath = Join-Path $startup "Ponytai StreamAgain Tunnel.vbs"
$tunnelScript = Join-Path $projectRoot "scripts\start-tunnel.ps1"
$tunnelVbs = @"
Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "$projectRoot"
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File ""$tunnelScript""", 0, False
"@
Set-Content -Path $tunnelVbsPath -Value $tunnelVbs -Encoding ASCII
Write-Host "Installed Startup Folder tunnel launcher: $tunnelVbsPath"

Write-Host "Project: $projectRoot"
