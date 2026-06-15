$ErrorActionPreference = "Stop"

$taskName = "Ponytai StreamAgain Agent"
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Removed: $taskName"
} else {
  Write-Host "Task not found: $taskName"
}

$startup = [Environment]::GetFolderPath("Startup")
$vbsPath = Join-Path $startup "Ponytai StreamAgain Agent.vbs"
if (Test-Path $vbsPath) {
  Remove-Item $vbsPath -Force
  Write-Host "Removed: $vbsPath"
}
