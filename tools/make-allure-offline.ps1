<# 
  make-allure-offline.ps1
  Creates a single-file, offline HTML from an Allure static report.

  Prereqs on the Jenkins agent (Windows):
  - Python 3 available as "py" or "python"
  - Node.js (so that "npx" works)
  - Internet egress to install single-file-cli on first run (npm)

  Example:
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-allure-offline.ps1 `
    -ReportDir "allure-report" `
    -Port 8123 `
    -Output "allure-report.single.html" `
    -WaitSeconds 40 `
    -Verbose:$true
#>

[CmdletBinding()]
param(
  [string]$ReportDir = "allure-report",
  [int]   $Port = 8123,
  [string]$Output = "allure-report.single.html",
  [int]   $WaitSeconds = 45,
  [switch]$Verbose
)

function Write-Info($msg)  { Write-Host "[INFO ] $msg"  -ForegroundColor Cyan }
function Write-Warn($msg)  { Write-Host "[WARN ] $msg"  -ForegroundColor Yellow }
function Write-Err ($msg)  { Write-Host "[ERROR] $msg"  -ForegroundColor Red }

# --- 0) Validate Allure folder ---
if (-not (Test-Path -LiteralPath $ReportDir)) {
  throw "Allure report folder not found: '$ReportDir'"
}
if (-not (Test-Path -LiteralPath (Join-Path $ReportDir 'index.html'))) {
  throw "index.html not found in '$ReportDir'. Did you run 'allure generate'?"
}

# --- 1) Locate Python ---
$pythonExe = $null
$py1 = Get-Command "py.exe"     -ErrorAction SilentlyContinue
$py2 = Get-Command "python.exe" -ErrorAction SilentlyContinue
if     ($py1) { $pythonExe = $py1.Source }
elseif ($py2) { $pythonExe = $py2.Source }
else   { throw "Python not found on PATH. Install Python 3 or ensure 'py'/'python' is available." }

Write-Info "Python: $pythonExe"

# --- 2) Locate npx (for single-file-cli) ---
$npxCmd1 = Get-Command "npx.cmd" -ErrorAction SilentlyContinue
$npxCmd2 = Get-Command "npx"     -ErrorAction SilentlyContinue
if     ($npxCmd1) { $npx = $npxCmd1.Source }
elseif ($npxCmd2) { $npx = $npxCmd2.Source }
else   { throw "npx not found on PATH. Install Node.js or add it to PATH." }

Write-Info "npx: $npx"

# --- 3) Start local server (hidden) in report directory ---
$baseUrl = "http://127.0.0.1:$Port/"
Write-Info "Starting local server on $baseUrl"

$server = $null
try {
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $pythonExe
  $startInfo.Arguments = "-m http.server $Port"
  $startInfo.WorkingDirectory = (Resolve-Path -LiteralPath $ReportDir).Path
  $startInfo.CreateNoWindow = $true
  $startInfo.WindowStyle = 'Hidden'
  $startInfo.UseShellExecute = $false
  $server = [System.Diagnostics.Process]::Start($startInfo)
}
catch {
  throw "Failed to start local Python server: $($_.Exception.Message)"
}

if (-not $server -or $server.HasExited) {
  throw "Python server failed to start (process ended immediately)."
}

# --- 4) Wait until server responds ---
$ok = $false
$deadline = (Get-Date).AddSeconds($WaitSeconds)
while ((Get-Date) -lt $deadline) {
  try {
    $resp = Invoke-WebRequest -Uri ($baseUrl + "index.html") -UseBasicParsing -TimeoutSec 5
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) { $ok = $true; break }
  }
  catch { Start-Sleep -Milliseconds 500 }
}
if (-not $ok) {
  try { if ($server -and -not $server.HasExited) { $server.Kill() } } catch {}
  throw "Local server failed to start on $baseUrl within ${WaitSeconds}s"
}

Write-Info "Server is up. Capturing as single HTML → $Output"

# --- 5) Ensure single-file-cli is available (will download on first run) ---
# We call npx with -y so it auto-installs without prompts.
$singleFileArgs = @(
  "-y", "single-file-cli",
  ($baseUrl + "index.html"),
  "-o", $Output,
  "--block-scripts", "false",
  "--browser-wait-until", "networkIdle",
  "--browser-wait-until-delay", "1500"
)

# Allow HTTP resources (Allure is local). Also disable headless debug noise.
$env:SINGLE_FILE_HTTP_ALLOW = "1"

# --- 6) Run capture ---
$exitCode = 0
try {
  Write-Verbose "Running: $npx $($singleFileArgs -join ' ')"
  $p = Start-Process -FilePath $npx -ArgumentList $singleFileArgs -NoNewWindow -PassThru -Wait
  $exitCode = $p.ExitCode
}
catch {
  $exitCode = 1
  Write-Err "single-file-cli failed: $($_.Exception.Message)"
}
finally {
  # --- 7) Stop server ---
  try {
    if ($server -and -not $server.HasExited) {
      Write-Info "Stopping local server (PID $($server.Id))"
      $server.Kill()
      $server.WaitForExit(3000) | Out-Null
    }
  } catch { Write-Warn "Failed to stop server: $($_.Exception.Message)" }
}

if ($exitCode -ne 0) {
  throw "single-file-cli returned exit code $exitCode"
}

if (-not (Test-Path -LiteralPath $Output)) {
  throw "Single HTML not created: '$Output'"
}

# --- 8) Final size/info ---
$size = (Get-Item -LiteralPath $Output).Length
Write-Info ("Created {0} ({1:N0} bytes)" -f $Output, $size)
exit 0
