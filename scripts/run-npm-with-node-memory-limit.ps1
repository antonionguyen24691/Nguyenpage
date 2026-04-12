if ($args.Count -lt 1) {
  throw "Usage: run-npm-with-node-memory-limit.ps1 <script-name> [memory-mb] [-- <forwarded args>]"
}

$scriptName = $args[0]
$memoryMb = 16384
$forwardArgsStart = 1

if ($args.Count -ge 2 -and $args[1] -match '^\d+$') {
  $memoryMb = [int]$args[1]
  $forwardArgsStart = 2
}

if ($args.Count -gt $forwardArgsStart -and $args[$forwardArgsStart] -eq "--") {
  $forwardArgsStart += 1
}

$forwardArgs = @()
if ($args.Count -gt $forwardArgsStart) {
  $forwardArgs = $args[$forwardArgsStart..($args.Count - 1)]
}

$existingNodeOptions = $env:NODE_OPTIONS
$memoryOption = "--max-old-space-size=$memoryMb"

if ([string]::IsNullOrWhiteSpace($existingNodeOptions)) {
  $env:NODE_OPTIONS = $memoryOption
} elseif ($existingNodeOptions -notmatch "(^|\s)--max-old-space-size=") {
  $env:NODE_OPTIONS = "$existingNodeOptions $memoryOption"
}

$npmArgs = @("run", $scriptName)
if ($forwardArgs.Count -gt 0) {
  $npmArgs += "--"
  $npmArgs += $forwardArgs
}

Write-Host "NODE_OPTIONS=$($env:NODE_OPTIONS)"
& npm.cmd @npmArgs
exit $LASTEXITCODE
