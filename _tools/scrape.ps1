# Scrape pages missing from the Weebly export from the live site.
$tools = $PSScriptRoot
$repo = Split-Path $tools -Parent
$scraped = Join-Path $tools "scraped"
New-Item -ItemType Directory -Force $scraped | Out-Null

$urls = Get-Content (Join-Path $tools "all-urls.txt")
# Pages we don't already have as exported .html at repo root
$missing = $urls | Where-Object {
    $path = ([uri]$_).AbsolutePath.TrimStart('/')
    if ($path -eq '' -or $path -eq 'index.html') { return $false }
    -not (Test-Path (Join-Path $repo $path))
}
# Also grab the store landing page (in sitemap as trivia-store.html — included above if missing)
$log = Join-Path $tools "scrape-log.txt"
"" | Set-Content $log
$i = 0
foreach ($url in $missing) {
    $i++
    $path = ([uri]$url).AbsolutePath.TrimStart('/')
    # store as scraped/<urlpath> with .html appended for extensionless blog URLs
    $rel = $path
    if ($rel -notmatch '\.html$') { $rel = "$rel.html" }
    $out = Join-Path $scraped ($rel -replace '/', '\')
    New-Item -ItemType Directory -Force (Split-Path $out -Parent) | Out-Null
    if (Test-Path $out) { continue }
    $code = & curl.exe -s -o $out -w "%{http_code}" --retry 2 --max-time 30 -A "Mozilla/5.0 (site migration)" $url
    "$code $url" | Add-Content $log
    if ($code -ne "200") { Write-Output "FAIL $code $url" }
    Start-Sleep -Milliseconds 250
}
Write-Output "Done. $i fetched. Failures:"
Select-String -Path $log -Pattern '^(?!200)' | Select-Object -ExpandProperty Line
