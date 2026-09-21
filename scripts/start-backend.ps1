$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$jdk25 = "C:\Program Files\Microsoft\jdk-25.0.3.9-hotspot"
if (Test-Path $jdk25) {
  $env:JAVA_HOME = $jdk25
}
if ($env:JAVA_HOME) {
  $env:Path = "$env:JAVA_HOME\bin;" + $env:Path
}
Write-Host "JAVA_HOME=$env:JAVA_HOME"
if (Test-Path "$root\.env") {
  Get-Content "$root\.env" | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $kv = $_ -split '=', 2
    if ($kv.Length -eq 2) {
      [Environment]::SetEnvironmentVariable($kv[0].Trim(), $kv[1].Trim(), "Process")
    }
  }
}
$mavenHome = Join-Path $root "backend\.mvn\apache-maven-3.9.9"
if (-not (Test-Path "$mavenHome\bin\mvn.cmd")) {
  $zip = Join-Path $env:TEMP "apache-maven-3.9.9-bin.zip"
  Write-Host "Downloading Maven 3.9.9..."
  Invoke-WebRequest -Uri "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.9/apache-maven-3.9.9-bin.zip" -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath (Join-Path $root "backend\.mvn") -Force
}
Set-Location (Join-Path $root "backend")
& "$mavenHome\bin\mvn.cmd" spring-boot:run
