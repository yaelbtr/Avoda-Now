$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $repoRoot "docs\\ai\\skills"
$targetRoot = Join-Path $HOME ".codex\\skills"

if (-not (Test-Path -LiteralPath $sourceRoot)) {
  throw "Source skills directory not found: $sourceRoot"
}

if (-not (Test-Path -LiteralPath $targetRoot)) {
  New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
}

$skills = Get-ChildItem -LiteralPath $sourceRoot -Directory | Where-Object {
  $_.Name -like "avodanow-*"
}

foreach ($skill in $skills) {
  $destination = Join-Path $targetRoot $skill.Name
  Copy-Item -LiteralPath $skill.FullName -Destination $destination -Recurse -Force
  Write-Output "Installed $($skill.Name) -> $destination"
}
