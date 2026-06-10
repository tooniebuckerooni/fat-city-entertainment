# Refetch any scraped file that doesn't end in </html>, up to 4 passes.
$scraped = Join-Path $PSScriptRoot "scraped"
$base = "https://www.fatcityentertainment.com"
for ($pass = 1; $pass -le 4; $pass++) {
    $bad = Get-ChildItem $scraped -Recurse -File | Where-Object {
        $c = Get-Content $_.FullName -Raw
        (-not $c) -or (-not $c.TrimEnd().EndsWith('</html>'))
    }
    if (-not $bad) { "all complete after pass $($pass-1)"; exit 0 }
    "pass ${pass}: $($bad.Count) incomplete"
    foreach ($f in $bad) {
        $rel = $f.FullName.Substring($scraped.Length + 1) -replace '\\','/'
        # reconstruct live URL: blog listing/post URLs are extensionless; store/products keep .html
        $url = "/$rel"
        if ($rel -like 'triviahostresources/*') { $url = $url -replace '\.html$','' }
        if ($rel -eq 'trivia-store.html') { $url = '/store/c1/triviastore' }
        $enc = $url -replace ' ','%20'
        curl.exe -s --compressed --retry 2 --max-time 40 -A "Mozilla/5.0 (site migration)" -o $f.FullName "$base$enc" | Out-Null
        Start-Sleep -Milliseconds 500
    }
}
$bad = Get-ChildItem $scraped -Recurse -File | Where-Object { $c = Get-Content $_.FullName -Raw; (-not $c) -or (-not $c.TrimEnd().EndsWith('</html>')) }
"final incomplete: $($bad.Count)"
$bad | ForEach-Object { $_.FullName }
