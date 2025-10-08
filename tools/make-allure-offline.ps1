<#  make-allure-single.ps1
    Turn Allure static report (index.html) into ONE offline .html using single-file-cli.
    No local web server is started.
#>

[CmdletBinding()]
param(
  [string]$ReportDir = "allure-report",
  [string]$Output = "allure-report.single.html",
  [int]$WaitSeconds = 60
)

$ErrorActionPreference = "Stop"

Write-Host "== make-allure-single.ps1 =="
Write-Host "ReportDir: $ReportDir"
Write-Host "Output   : $Output"

# 0) Sanity
if (-not (Test-Path $ReportDir)) {
  throw "ReportDir not found: $ReportDir"
}
$index = Join-Path $ReportDir "index.html"
if (-not (Test-Path $index)) {
  throw "index.html not found at: $index (did Allure generate?)"
}

# 1) Ensure npm is available
Write-Host "Checking Node/npm..."
$null = & cmd /c "node -v" 2>$null
if ($LASTEXITCODE -ne 0) { throw "Node is not on PATH on this agent." }
$null = & cmd /c "npm -v" 2>$null
if ($LASTEXITCODE -ne 0) { throw "npm is not on PATH on this agent." }

# 2) npx single-file-cli on the LOCAL FILE (no server)
#    IMPORTANT flags:
#    --block-scripts false              -> let the page JS render contents before capture
#    --browser-wait-until networkIdle   -> wait until network goes idle
#    --browser-wait-until-delay 1500    -> and then wait a bit more
#    --self-extracting-archive          -> result is a single HTML that contains everything
#    --resolve-links false              -> keep the current link forms to avoid rewriting mishaps
#    We pass a relative path ".\allure-report\index.html" so Chromium loads it via file://

$indexRel = ".\{0}" -f (Resolve-Path $index | Split-Path -NoQualifier).ToString().TrimStart('\')
if (-not (Test-Path $indexRel)) {
  # Fall back to absolute path if relative fails
  $indexRel = (Resolve-Path $index).Path
}

Write-Host "Capturing: $indexRel"
if (Test-Path $Output) { Remove-Item $Output -Force }

$cmd = @(
  'npx','-y','single-file-cli',
  $indexRel,
  '-o', $Output,
  '--block-scripts','false',
  '--browser-wait-until','networkIdle',
  '--browser-wait-until-delay','1500',
  '--self-extracting-archive','true',
  '--resolve-links','false'
)

Write-Host "Running: $($cmd -join ' ')"
$start = Get-Date
$proc = Start-Process -FilePath $cmd[0] -ArgumentList $cmd[1..($cmd.Count-1)] -NoNewWindow -PassThru -Wait
$dur = [int](New-TimeSpan -Start $start -End (Get-Date)).TotalSeconds
Write-Host "single-file-cli exit code: $($proc.ExitCode) (took ${dur}s)"
if ($proc.ExitCode -ne 0) {
  throw "single-file-cli failed with exit code $($proc.ExitCode)"
}

if (-not (Test-Path $Output)) {
  throw "Expected output file not created: $Output"
}

# 3) Verify content (basic check)
$sz = (Get-Item $Output).Length
Write-Host "Created $Output ($sz bytes)"
Write-Host "DONE."
