# Start the Nhanh task tracker (project-task-tracking) if it is not already answering. Used at Windows sign-in and by
# studio-setup.sh --tracker-start. One server per data directory: when the port already answers as nhanh-local, do nothing.
#   powershell -NoProfile -ExecutionPolicy Bypass -File start-tracker.ps1 -Dir <tracker repo> [-Port 5173]
param(
    [Parameter(Mandatory = $true)][string]$Dir,
    [int]$Port = 5173
)
$ErrorActionPreference = 'Stop'

$logDir = Join-Path $Dir '.local'
New-Item -Path $logDir -ItemType Directory -Force | Out-Null
$launchLog = Join-Path $logDir 'windows-logon.log'
function Write-LaunchLog($message) {
    Add-Content -LiteralPath $launchLog -Value ("{0:s} {1}" -f (Get-Date), $message)
}

try {
    $health = $null
    try { $health = Invoke-RestMethod "http://127.0.0.1:$Port/api/health" -TimeoutSec 3 } catch { }
    if ($health.service -eq 'nhanh-local') { Write-LaunchLog "Tracker already answers on port $Port."; exit 0 }
    if ($health) { throw "Port $Port is served by something that is not the tracker." }
    if (!(Test-Path (Join-Path $Dir 'server\index.js'))) { throw "No tracker in $Dir." }

    $node = (Get-Command node.exe -CommandType Application).Source
    $env:PORT = "$Port"
    $server = Start-Process -FilePath $node -ArgumentList 'server/index.js' -WorkingDirectory $Dir -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logDir 'windows-server.stdout.log') `
        -RedirectStandardError (Join-Path $logDir 'windows-server.stderr.log')
    Write-LaunchLog "Started tracker (PID $($server.Id), port $Port)."
} catch {
    Write-LaunchLog $_.Exception.Message
    Write-Error $_.Exception.Message -ErrorAction Continue
    exit 1
}
