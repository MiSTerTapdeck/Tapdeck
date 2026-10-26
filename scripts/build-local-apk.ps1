param(
    [ValidateSet('Dev', 'Preview', 'Production')]
    [string]$Mode,
    [switch]$Plan,
    [switch]$NoInstall
)

$ErrorActionPreference = 'Stop'
$source = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).ProviderPath
$build = Join-Path $env:USERPROFILE 'td'
$sdk = Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk'
$jdk = Join-Path $env:USERPROFILE '.gradle\jdks\eclipse_adoptium-17-amd64-windows.2'
$phone = 'HQ663Q04DE'
$phoneCertificate = '82ed55e194f5aa9348f36ef477254c5b343cb06b1af7f510ca4a093044a07fda'

function Show-Menu {
    Clear-Host
    Write-Host ''
    Write-Host '  TAPDECK  |  Local Android builder' -ForegroundColor DarkYellow
    Write-Host '  --------------------------------' -ForegroundColor DarkYellow
    Write-Host ''
    Write-Host '  1  Development' -ForegroundColor Cyan
    Write-Host '     Separate .dev app; needs Metro running to load the app.'
    Write-Host ''
    Write-Host '  2  Preview' -ForegroundColor Cyan
    Write-Host '     Standalone signed APK for this phone; runs typecheck.'
    Write-Host ''
    Write-Host '  3  Production' -ForegroundColor Cyan
    Write-Host '     Standalone signed APK; runs typecheck and tests.'
    Write-Host '     Uses the same release variant as Preview.'
    Write-Host ''
    Write-Host '  Q  Quit'
    Write-Host ''
    switch ((Read-Host 'Choose a build').Trim().ToUpperInvariant()) {
        '1' { return 'Dev' }
        '2' { return 'Preview' }
        '3' { return 'Production' }
        'Q' { return $null }
        default { throw 'No valid build was selected.' }
    }
}

if (-not $Mode) { $Mode = Show-Menu }
if (-not $Mode) { return }

Write-Host ''
Write-Host "Selected: $Mode" -ForegroundColor Cyan
Write-Host "Source:   $source"
Write-Host "Build:    $build"
Write-Host 'Signing credentials stay in the source folder and are never copied to the build folder.'
if ($Plan) {
    Write-Host 'Plan only: no files changed and no build started.'
    return
}

if (-not (Test-Path -LiteralPath (Join-Path $source 'package.json'))) {
    throw 'Tapdeck source package.json is missing.'
}
if (-not (Test-Path -LiteralPath (Join-Path $build 'package.json'))) {
    throw "Dedicated build folder $build is missing. Follow LOCAL-PHONE-APK-BUILD.txt once to create it."
}
$resolvedBuild = (Resolve-Path -LiteralPath $build).ProviderPath.TrimEnd('\')
$expectedBuild = [IO.Path]::GetFullPath($build).TrimEnd('\')
if ($resolvedBuild -ine $expectedBuild -or $resolvedBuild -ieq $source) {
    throw 'Build folder resolved to an unexpected path. Nothing was copied.'
}
if ((Get-Item -LiteralPath $build).Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw 'The build folder is a link or junction. Use a real short folder.'
}
if (-not (Test-Path -LiteralPath (Join-Path $jdk 'bin\java.exe'))) { throw "JDK 17 not found at $jdk." }
if (-not (Test-Path -LiteralPath (Join-Path $sdk 'platform-tools\adb.exe'))) { throw "Android SDK not found at $sdk." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm was not found on PATH.' }

$env:ANDROID_HOME = $sdk
$env:JAVA_HOME = $jdk
$env:Path = "$jdk\bin;$sdk\platform-tools;$env:Path"
$env:NODE_ENV = if ($Mode -eq 'Dev') { 'development' } else { 'production' }
$env:npm_config_cache = Join-Path $build '.npm-cache'

Write-Host ''
Write-Host 'Copying the latest project into the dedicated short build folder...' -ForegroundColor Yellow
# /MIR deletes stale files inside the checked, dedicated build copy only.
& robocopy $source $build /MIR /XD .git node_modules credentials build .gradle .cxx .npm-cache .tmp-local-signed local-apks /XF credentials.json build-log.txt settings-log.txt autolink.json autolink-error.txt /NFL /NDL /NP /NJH /NJS
if ($LASTEXITCODE -ge 8) { throw "Project copy failed (robocopy exit $LASTEXITCODE)." }

Push-Location $build
try {
    Write-Host 'Installing project dependencies...' -ForegroundColor Yellow
    & npm ci --include=dev
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }

    if ($Mode -in @('Preview', 'Production')) {
        Write-Host 'Checking TypeScript...' -ForegroundColor Yellow
        & npm run typecheck
        if ($LASTEXITCODE -ne 0) { throw 'Typecheck failed; no APK will be installed.' }
    }
    if ($Mode -eq 'Production') {
        Write-Host 'Running tests...' -ForegroundColor Yellow
        & npm test
        if ($LASTEXITCODE -ne 0) { throw 'Tests failed; no APK will be installed.' }
    }

    Push-Location (Join-Path $build 'android')
    try {
        Write-Host "Building $Mode APK locally..." -ForegroundColor Yellow
        if ($Mode -eq 'Dev') {
            & .\gradlew.bat assembleDebug '-PtapdeckSeparateDev=true'
        } else {
            & .\gradlew.bat assembleRelease
        }
        if ($LASTEXITCODE -ne 0) { throw 'Android build failed; no APK will be installed.' }
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}

$outputFolder = Join-Path $source 'local-apks'
New-Item -ItemType Directory -Path $outputFolder -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $outputFolder "Tapdeck-$($Mode.ToLowerInvariant())-$stamp.apk"

if ($Mode -eq 'Dev') {
    $builtApk = Join-Path $build 'android\app\build\outputs\apk\debug\app-debug.apk'
    if (-not (Test-Path -LiteralPath $builtApk)) { throw 'New development APK was not found.' }
    Copy-Item -LiteralPath $builtApk -Destination $target
} else {
    $builtApk = Join-Path $build 'android\app\build\outputs\apk\release\app-release.apk'
    $credentialsFile = Join-Path $source 'credentials.json'
    if (-not (Test-Path -LiteralPath $builtApk)) { throw 'New release APK was not found.' }
    if (-not (Test-Path -LiteralPath $credentialsFile)) { throw 'credentials.json is missing from the original Tapdeck folder.' }

    $credentials = Get-Content -LiteralPath $credentialsFile -Raw | ConvertFrom-Json
    $keystorePath = $credentials.android.keystore.keystorePath
    $keystore = if ([IO.Path]::IsPathRooted($keystorePath)) { $keystorePath } else { Join-Path $source $keystorePath }
    if (-not (Test-Path -LiteralPath $keystore)) { throw 'Signing keystore was not found.' }
    $signer = Join-Path $sdk 'build-tools\36.0.0\apksigner.bat'
    if (-not (Test-Path -LiteralPath $signer)) { throw 'Android apksigner was not found.' }

    Write-Host 'Signing with the existing phone certificate...' -ForegroundColor Yellow
    $env:TAPDECK_STORE_PASS = $credentials.android.keystore.keystorePassword
    $env:TAPDECK_KEY_PASS = $credentials.android.keystore.keyPassword
    try {
        & $signer sign --ks $keystore --ks-key-alias $credentials.android.keystore.keyAlias --ks-pass env:TAPDECK_STORE_PASS --key-pass env:TAPDECK_KEY_PASS --out $target $builtApk
        if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }
    } finally {
        Remove-Item Env:TAPDECK_STORE_PASS, Env:TAPDECK_KEY_PASS -ErrorAction SilentlyContinue
    }

    $verification = & $signer verify --print-certs $target
    if ($LASTEXITCODE -ne 0) { throw 'Signed APK failed verification.' }
    $certificateLine = $verification | Select-String 'Signer #1 certificate SHA-256 digest'
    if (-not $certificateLine) { throw 'Could not read the signed APK certificate.' }
    $fingerprint = ($certificateLine.ToString() -split ':')[-1].Trim().ToLowerInvariant()
    if ($fingerprint -ne $phoneCertificate) { throw 'The APK certificate does not match the phone. Nothing was installed.' }
    Write-Host "Certificate verified: $fingerprint" -ForegroundColor Green
}

Write-Host ''
Write-Host 'BUILD COMPLETE' -ForegroundColor Green
Write-Host "APK: $target"
if ($Mode -eq 'Dev') {
    Write-Host 'This is a separate Tapdeck Dev app. It needs Metro running from the original Tapdeck folder.'
    Write-Host "Metro command: cd '$source'; npx expo start --dev-client --host lan"
}
Write-Host ''
if (-not $NoInstall -and (Read-Host "Install this APK on phone $phone now? (Y/N)").Trim().ToUpperInvariant() -eq 'Y') {
    $adb = Join-Path $sdk 'platform-tools\adb.exe'
    & $adb -s $phone install -r $target
    if ($LASTEXITCODE -ne 0) { throw 'Phone installation failed. Do not uninstall Tapdeck.' }
    Write-Host 'Installed successfully. Existing phone app data was kept.' -ForegroundColor Green
} else {
    Write-Host 'APK saved. Phone installation skipped.'
}
