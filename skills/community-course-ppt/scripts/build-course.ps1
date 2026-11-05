param([Parameter(Mandatory=$true)][string]$Course)
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$python = if ($env:COURSE_PPT_PYTHON) { $env:COURSE_PPT_PYTHON } else { 'python' }
$course = (Resolve-Path -LiteralPath $Course).Path
$courseRoot = Split-Path -Parent $course
$skill = $PSScriptRoot
$destination = Join-Path $courseRoot 'output'
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$stage = Join-Path $tempRoot ('community-course-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
try {
    node (Join-Path $skill 'build.mjs') --course $course --out $stage
    if ($LASTEXITCODE -ne 0) { throw 'PPTX generation failed' }
    & (Join-Path $skill 'export-powerpoint.ps1') -InputDirectory $stage -OutputDirectory $stage
    & $python (Join-Path $skill 'check_pptx.py') $stage --course $course
    if ($LASTEXITCODE -ne 0) { throw 'Course validation failed' }
    & $python (Join-Path $skill 'make-previews.py') $stage
    if ($LASTEXITCODE -ne 0) { throw 'Preview generation failed' }
    if ([IO.Path]::GetDirectoryName($destination) -ne $courseRoot) { throw 'Output path escapes course directory' }
    if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Recurse }
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    Get-ChildItem -LiteralPath $stage -File | Where-Object {
        $_.Extension -in @('.pptx', '.pdf', '.md', '.html') -or
        $_.Name -like '*-预览.png' -or $_.Name -eq 'manifest.json'
    } | Copy-Item -Destination $destination
    $report = Get-Content -LiteralPath (Join-Path $stage 'package-check.json') -Raw | ConvertFrom-Json
    foreach ($result in $report.results) { $result.file = [IO.Path]::GetFileName($result.file) }
    $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $destination 'validation.json') -Encoding utf8
    Write-Output "Course ready: $destination"
} finally {
    $resolvedStage = [IO.Path]::GetFullPath($stage)
    if ($resolvedStage.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
        [IO.Path]::GetFileName($resolvedStage).StartsWith('community-course-')) {
        Remove-Item -LiteralPath $resolvedStage -Recurse
    }
}
