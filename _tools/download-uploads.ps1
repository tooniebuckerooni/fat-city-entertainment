# Download missing /uploads/ files from the live site.
$tools = $PSScriptRoot
$repo = Split-Path $tools -Parent
$base = "https://www.fatcityentertainment.com"
$list = Get-Content (Join-Path $tools "missing-uploads.txt") | Where-Object { $_ }
$log = Join-Path $tools "uploads-log.txt"
"" | Set-Content $log
$fail = 0
foreach ($u in $list) {
    $out = Join-Path $repo ($u.TrimStart('/') -replace '/','\')
    if (Test-Path $out) { continue }
    New-Item -ItemType Directory -Force (Split-Path $out -Parent) | Out-Null
    $enc = ($u -replace ' ','%20') -replace '&','%26'
    # encode each path segment minimally: spaces, & already done; most are safe
    $code = curl.exe -s --compressed -o $out -w "%{http_code}" --retry 2 --max-time 60 -A "Mozilla/5.0 (site migration)" "$base$enc"
    "$code $u" | Add-Content $log
    if ($code -ne "200") { $fail++; Remove-Item $out -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 150
}
"done. failures: $fail"
Select-String -Path $log -Pattern '^(?!200)' | Select-Object -ExpandProperty Line | Select-Object -First 30
