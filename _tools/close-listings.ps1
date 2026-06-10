# Crawl-to-closure: scrape any blog listing URL (archives/category/previous
# pagination) that pages reference but we don't have, transform, repeat.
$tools = $PSScriptRoot
$repo = Split-Path $tools -Parent
$base = "https://www.fatcityentertainment.com"
for ($round = 1; $round -le 6; $round++) {
    $out = node "$tools\check-links.js" 2>&1 | Out-String
    $missing = [regex]::Matches($out, '(?m)^\s\s(/triviahostresources/(?:archives|category|previous)/\S+)\s') |
        ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    if (-not $missing) { "round ${round}: closed."; break }
    "round ${round}: scraping $($missing.Count) listing pages"
    foreach ($u in $missing) {
        $dest = Join-Path "$tools\scraped" (($u.TrimStart('/') -replace '/','\') + ".html")
        New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
        $code = curl.exe -s --compressed --retry 2 -A "Mozilla/5.0 (site migration)" -o $dest -w "%{http_code}" "$base$u"
        if ($code -ne "200") { "  $code $u"; Remove-Item $dest -ErrorAction SilentlyContinue }
        Start-Sleep -Milliseconds 300
    }
    node "$tools\transform.js" | Out-Null
    node "$tools\fix-protocol-relative.js" | Out-Null
    node "$tools\fix-legacy-links.js" | Out-Null
}
