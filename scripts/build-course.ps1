param([string]$CourseId = 'biology-foundation-models')
$ErrorActionPreference = 'Stop'
if ($CourseId -notmatch '^[a-z0-9-]+$') { throw 'CourseId must use lowercase letters, numbers and hyphens' }
$repo = Split-Path -Parent $PSScriptRoot
$course = Join-Path $repo "example\$CourseId\course.json"
& (Join-Path $repo 'skills\community-course-ppt\scripts\build-course.ps1') -Course $course
