param([Parameter(Mandatory=$true)][string]$InputDirectory,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$inputRoot=(Resolve-Path -LiteralPath $InputDirectory).Path
$outputRoot=[IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($outputRoot) | Out-Null
$files=@(Get-ChildItem -LiteralPath $inputRoot -Filter '*.pptx' -File -Recurse)
if ($files.Count -eq 0) { throw 'No PPTX files found' }
$powerpoint=$null
$records=@()
try {
  foreach ($file in $files) {
    for($attempt=1;$attempt -le 3;$attempt++) {
      try {$powerpoint=New-Object -ComObject PowerPoint.Application;break}
      catch {if($attempt -eq 3){throw};Start-Sleep -Milliseconds 750}
    }
    $relative=[IO.Path]::GetRelativePath($inputRoot,$file.FullName)
    $relativeDir=[IO.Path]::GetDirectoryName($relative)
    $target=Join-Path $outputRoot $relativeDir
    [IO.Directory]::CreateDirectory($target) | Out-Null
    $pdf=Join-Path $target ($file.BaseName+'.pdf')
    $pngDir=Join-Path $target ($file.BaseName+'-pages')
    [IO.Directory]::CreateDirectory($pngDir) | Out-Null
    $deck=$null
    try {
      $deck=$powerpoint.Presentations.Open($file.FullName,-1,0,0)
      $count=$deck.Slides.Count
      $deck.SaveAs($pdf,32)
      $deck.Export($pngDir,'PNG',1440,810)
      $actual=@(Get-ChildItem -LiteralPath $pngDir -Filter '*.PNG' -File | Where-Object { $_.Name -notlike 'inspect-*' }).Count
      if($actual -ne $count) {throw "PNG count $actual != slides $count"}
      $records += [pscustomobject]@{pptx=$file.FullName;pdf=$pdf;pages=$pngDir;slideCount=$count;pngCount=$actual;renderer='Microsoft PowerPoint'}
      Write-Output ("EXPORTED {0}: {1} pages" -f $file.Name,$count)
    } finally {
      if($deck){try{$deck.Close()}catch{};[Runtime.InteropServices.Marshal]::FinalReleaseComObject($deck)|Out-Null}
      if($powerpoint){try{if($powerpoint.Presentations.Count -eq 0){$powerpoint.Quit()}}catch{};[Runtime.InteropServices.Marshal]::FinalReleaseComObject($powerpoint)|Out-Null;$powerpoint=$null}
      Start-Sleep -Milliseconds 750
    }
  }
} finally {if($powerpoint){try{if($powerpoint.Presentations.Count -eq 0){$powerpoint.Quit()}}catch{};[Runtime.InteropServices.Marshal]::FinalReleaseComObject($powerpoint)|Out-Null};[GC]::Collect();[GC]::WaitForPendingFinalizers()}
$records | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $outputRoot 'powerpoint-export.json') -Encoding utf8
