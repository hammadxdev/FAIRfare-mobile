[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string[]]$TargetPath = @()
)

$ErrorActionPreference = 'Continue'
$ExpectedRoot = 'D:\ride\mobile'
$RepoRoot = (Get-Location).Path
$Failures = 0
$Warnings = 0

function Report-Result {
    param(
        [ValidateSet('PASS', 'WARN', 'FAIL')][string]$Status,
        [string]$Check,
        [string]$Detail
    )

    Write-Output ('{0} | {1} | {2}' -f $Status, $Check, $Detail)
    if ($Status -eq 'FAIL') { $script:Failures++ }
    if ($Status -eq 'WARN') { $script:Warnings++ }
}

if ($RepoRoot -eq $ExpectedRoot) {
    Report-Result PASS 'workspace' $RepoRoot
} else {
    Report-Result FAIL 'workspace' ('expected {0}; found {1}' -f $ExpectedRoot, $RepoRoot)
}

$git = Get-Command git.exe -ErrorAction SilentlyContinue
if ($null -eq $git) {
    Report-Result FAIL 'git executable' 'git.exe was not found'
} else {
    try {
        $gitStatus = & $git.Source status --short --branch 2>&1
        if ($LASTEXITCODE -eq 0) {
            $statusText = (($gitStatus | Out-String).Trim())
            if ([string]::IsNullOrWhiteSpace($statusText)) { $statusText = '(clean or no status output)' }
            Report-Result PASS 'git status' $statusText
        } else {
            Report-Result FAIL 'git status' (($gitStatus | Out-String).Trim())
        }
    } catch {
        Report-Result FAIL 'git status' ('{0}: {1}' -f $_.Exception.GetType().FullName, $_.Exception.Message)
    }
}

$node = Get-Command node.exe -ErrorAction SilentlyContinue
if ($null -eq $node) {
    Report-Result FAIL 'node executable' 'node.exe was not found'
} else {
    try {
        $nodeVersion = & $node.Source --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Report-Result PASS 'node version' (($nodeVersion | Out-String).Trim())
        } else {
            Report-Result FAIL 'node version' (($nodeVersion | Out-String).Trim())
        }
    } catch {
        Report-Result FAIL 'node version' ('{0}: {1}' -f $_.Exception.GetType().FullName, $_.Exception.Message)
    }
}

$packagePath = Join-Path $RepoRoot 'package.json'
if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) {
    Report-Result FAIL 'package.json' 'file not found'
} else {
    try {
        $package = Get-Content -LiteralPath $packagePath -Raw -ErrorAction Stop | ConvertFrom-Json
        $scriptNames = @()
        if ($null -ne $package.scripts) {
            $scriptNames = @($package.scripts.PSObject.Properties | ForEach-Object { $_.Name })
        }
        $scriptSummary = if ($scriptNames.Count -gt 0) { $scriptNames -join ', ' } else { '(none)' }
        Report-Result PASS 'package.json' ('parsed; scripts: {0}' -f $scriptSummary)
    } catch {
        Report-Result FAIL 'package.json' ('{0}: {1}' -f $_.Exception.GetType().FullName, $_.Exception.Message)
    }
}

$harnessPaths = @('AGENTS.md', '.codex\fareRide-harness.md', '.codex\preflight.ps1', '.codex\test-targets.json')
foreach ($relativePath in $harnessPaths) {
    $absolutePath = Join-Path $RepoRoot $relativePath
    if (Test-Path -LiteralPath $absolutePath -PathType Leaf) {
        Report-Result PASS ('harness file ' + $relativePath) 'present'
    } else {
        Report-Result WARN ('harness file ' + $relativePath) 'not found'
    }
}

foreach ($relativePath in $TargetPath) {
    try {
        $absolutePath = if ([System.IO.Path]::IsPathRooted($relativePath)) { $relativePath } else { Join-Path $RepoRoot $relativePath }
        if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
            Report-Result FAIL ('target ' + $relativePath) 'file not found'
            continue
        }
        Get-Content -LiteralPath $absolutePath -TotalCount 1 -ErrorAction Stop | Out-Null
        Report-Result PASS ('target ' + $relativePath) 'exists and is readable; no write handle requested'
    } catch {
        Report-Result FAIL ('target ' + $relativePath) ('{0}: {1}' -f $_.Exception.GetType().FullName, $_.Exception.Message)
    }
}

Write-Output ('SUMMARY | FAIL={0} WARN={1}' -f $Failures, $Warnings)
if ($Failures -gt 0) { exit 1 }
exit 0
