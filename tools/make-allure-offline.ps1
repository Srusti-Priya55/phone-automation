param(
  [string]$ReportDir = "allure-report",
  [string]$OutFile   = "allure-report.single.html",
  [int]$MaxWaitSec   = 20
)

$ErrorActionPreference = "Stop"

Write-Host "==> Input report dir: $ReportDir"
if (-not (Test-Path $ReportDir)) {
  throw "Report folder '$ReportDir' not found."
}

# Find a free TCP port on loopback
function Get-FreePort {
  $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  $port = ($listener.LocalEndpoint).Port
  $listener.Stop()
  return $port
}

$port = Get-FreePort
$baseUrl = "http://127.0.0.1:$port"

# Start "http-server" from npm in background
# Requires Node on PATH; Jenkinsfile sets NODE_HOME/PATH.
$sfCmd  = "npx"
$sfArgs = "-y single-file-cli `"$baseUrl/index.html`" -o `"$OutFile`" --block-scripts false --browser-wait-until networkIdle --browser-wait-until-delay 1500"
& $sfCmd $sfArgs
c

# Health check
$ok = $false
for ($i=0; $i -lt $MaxWaitSec; $i++) {
  Start-Sleep -Seconds 1
  try {
    $resp = Invoke-WebRequest "$baseUrl/index.html" -UseBasicParsing -TimeoutSec 5
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) { $ok = $true; break }
  } catch { }
}
if (-not $ok) {
  try { if ($proc -and !$proc.HasExited) { $proc.Kill() } } catch {}
  throw "Local server failed to start on $baseUrl"
}

# Build single-file HTML with SingleFile CLI (headless Chromium)
# Key flags:
#  --block-scripts false       -> let Allure JS execute while capturing
#  --browser-wait-until ...    -> wait for network to be idle
#  --browser-wait-until-delay  -> small delay after idle
Write-Host "==> Capturing $baseUrl/index.html -> $OutFile"
$sfCmd  = "npx"
$sfArgs = "-y single-file-cli `"$baseUrl/index.html`" -o `"$OutFile`" --block-scripts false --browser-wait-until networkIdle --browser-wait-until-delay 1500"
$LASTEXITCODE = 0
& $sfCmd $sfArgs
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $OutFile)) {
  try { if ($proc -and !$proc.HasExited) { $proc.Kill() } } catch {}
  throw "Single-file generation failed; output not found: $OutFile"
}

Write-Host "==> Single HTML created: $OutFile  (size: $((Get-Item $OutFile).Length) bytes)"

# Stop server
try {
  if ($proc -and !$proc.HasExited) {
    $proc.Kill()
  }
} catch {}

exit 0
