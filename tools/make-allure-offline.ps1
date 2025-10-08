# tools/make-allure-offline.ps1
param(
  [string]$ReportDir   = "allure-report",
  [string]$OutFile     = "allure-report.single.html",
  [int]$Port           = 8123,
  [string]$BrowserExe  = ""   # e.g. "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ReportDir)) {
  throw "Folder '$ReportDir' not found. Generate Allure into '$ReportDir' first."
}

# Pick a port (fallback if busy)
try {
  $tcp = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
  $tcp.Start()
  $tcp.Stop()
} catch {
  $Port = Get-Random -Minimum 8200 -Maximum 8999
}

# Start a tiny static server for Allure (so fetch() works while we capture the page)
$serverArgs = @("-y","http-server", $ReportDir, "-p", "$Port", "--silent")
$serverProc = $null
try {
  $serverProc = Start-Process -FilePath "npx" -ArgumentList $serverArgs -PassThru -WindowStyle Hidden

  # Wait until index is reachable
  $baseUrl  = "http://127.0.0.1:$Port"
  $indexUrl = "$baseUrl/index.html"
  $ready = $false
  for ($i=0; $i -lt 40; $i++) {
    try {
      Invoke-WebRequest -Uri $indexUrl -UseBasicParsing -TimeoutSec 2 | Out-Null
      $ready = $true
      break
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $ready) {
    throw "Local server failed to start on $baseUrl"
  }

  # Build args for single-file
  $singleArgs = @(
    "single-file-cli", $indexUrl,
    "-o", $OutFile,
    "--block-scripts", "false",
    "--browser-wait-until", "networkIdle",
    "--browser-wait-until-delay", "1500",
    "--insert-meta-CSP"
  )
  if ($BrowserExe -ne "" -and (Test-Path $BrowserExe)) {
    $singleArgs += @("--browser-executable-path", $BrowserExe)
  }

  & npx -y @singleArgs
  Write-Host "✅ Created $OutFile"

} finally {
  if ($serverProc -and !$serverProc.HasExited) {
    try { Stop-Process -Id $serverProc.Id -Force } catch {}
  }
}
