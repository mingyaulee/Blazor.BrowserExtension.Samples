Get-ChildItem . -Directory | ForEach-Object {
    $CurrentPath = $_.FullName
    $DistPath = Join-Path $CurrentPath "dist"
    If (Test-Path ($DistPath)) {
        Remove-Item -Recurse -Force $DistPath
    }
}

dotnet publish -c Release
