# Scrape full pagination chains (ascending N until 404) for blog categories/archives.
$tools = $PSScriptRoot
$base = "https://www.fatcityentertainment.com"
$chains = @(
    "/triviahostresources/category/all",
    "/triviahostresources/category/entertainment",
    "/triviahostresources/category/music-bingo",
    "/triviahostresources/category/trivia-hosting",
    "/triviahostresources/category/holidays",
    "/triviahostresources/category/bingo-card-ideas",
    "/triviahostresources/category/free-events",
    "/triviahostresources/category/fat-city-faces",
    "/triviahostresources/category/sports-pub-night",
    "/triviahostresources/category/standup-comedy",
    "/triviahostresources/category/triv101",
    "/triviahostresources/category/video-game-trivia",
    "/triviahostresources/category/vr-trivia",
    "/triviahostresources/previous"
)
foreach ($chain in $chains) {
    for ($n = 2; $n -le 40; $n++) {
        $u = "$chain/$n"
        $dest = Join-Path "$tools\scraped" (($u.TrimStart('/') -replace '/','\') + ".html")
        if (Test-Path $dest) { continue }
        New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
        $code = curl.exe -s --compressed --retry 2 -A "Mozilla/5.0 (site migration)" -o $dest -w "%{http_code}" "$base$u"
        if ($code -ne "200") {
            Remove-Item $dest -ErrorAction SilentlyContinue
            "$chain ends at $($n-1)"
            break
        }
        Start-Sleep -Milliseconds 250
    }
}
"chain scrape complete"
