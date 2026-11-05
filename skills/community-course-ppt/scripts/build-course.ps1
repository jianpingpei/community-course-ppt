param([Parameter(Mandatory=$true)][string]$Course,[ValidateSet('auto','slidep','pptxgenjs')][string]$Engine='auto')
$ErrorActionPreference='Stop'
$env:PYTHONUTF8='1'
$python=if($env:COURSE_PPT_PYTHON){$env:COURSE_PPT_PYTHON}else{'python'}
& $python (Join-Path $PSScriptRoot 'build_course.py') --course $Course --engine $Engine
if($LASTEXITCODE -ne 0){throw 'Course build failed'}
