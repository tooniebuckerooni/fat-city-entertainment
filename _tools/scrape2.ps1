# Round 2: scrape blog archives, categories, and pagination chains discovered in page HTML.
$tools = $PSScriptRoot
$repo = Split-Path $tools -Parent
$scraped = Join-Path $tools "scraped"
$base = "https://www.fatcityentertainment.com"

# Collect candidate listing URLs from all blog HTML we have (scraped + exported index)
$sources = @(Get-ChildItem "$scraped\triviahostresources" -File) + @(Get-Item "$repo\triviahostresources.html") + @(Get-Item "$repo\50-event-ideas-2024.html")
$found = New-Object System.Collections.Generic.HashSet[string]
foreach ($f in $sources) {
    $h = Get-Content $f.FullName -Raw
    foreach ($m in [regex]::Matches($h, 'href="(?:https?://www\.fatcityentertainment\.com)?(/triviahostresources/(?:archives|category|previous)/[^"#?]+)"')) {
        [void]$found.Add([uri]::UnescapeDataString($m.Groups[1].Value).TrimEnd('/'))
    }
}
"Found $($found.Count) listing URLs"

$log = Join-Path $tools "scrape2-log.txt"
"" | Set-Content $log
$queue = New-Object System.Collections.Queue
$found | ForEach-Object { $queue.Enqueue($_) }
$done = New-Object System.Collections.Generic.HashSet[string]
while ($queue.Count -gt 0) {
    $path = $queue.Dequeue()
    if (-not $done.Add($path)) { continue }
    $rel = $path.TrimStart('/')
    $out = Join-Path $scraped (($rel -replace '/','\') + ".html")
    New-Item -ItemType Directory -Force (Split-Path $out -Parent) | Out-Null
    if (-not (Test-Path $out)) {
        $enc = $path -replace ' ', '%20'
        $code = curl.exe -s --compressed -o $out -w "%{http_code}" --retry 2 --max-time 30 -A "Mozilla/5.0 (site migration)" "$base$enc"
        "$code $path" | Add-Content $log
        Start-Sleep -Milliseconds 250
    }
    # discover further pagination links inside listing pages
    if (Test-Path $out) {
        $h = Get-Content $out -Raw
        foreach ($m in [regex]::Matches($h, 'href="(?:https?://www\.fatcityentertainment\.com)?(/triviahostresources/(?:archives|category|previous)/[^"#?]+)"')) {
            $p = [uri]::UnescapeDataString($m.Groups[1].Value).TrimEnd('/')
            if (-not $done.Contains($p)) { $queue.Enqueue($p) }
        }
    }
}
"Scraped total: $($done.Count)"
"Non-200s:"
Select-String -Path $log -Pattern '^(?!200)' | Select-Object -ExpandProperty Line
