$ErrorActionPreference = "Stop"

$basePages = @(
  "index",
  "about",
  "gallery",
  "moringa-powder",
  "moringa-tea",
  "moringa-capsules",
  "trust-compliance"
)

$localeMeta = @{
  "ja" = "ja_JP"
  "zh" = "zh_CN"
  "ne" = "ne_NP"
}

foreach ($page in $basePages) {
  $src = "$page.html"
  if (!(Test-Path $src)) { continue }
  $baseContent = Get-Content $src -Raw

  foreach ($lang in @("ja", "zh", "ne")) {
    $dst = "$page-$lang.html"
    $content = $baseContent

    $content = $content.Replace('<html lang="en">', '<html lang="' + $lang + '">')

    $canonFile = "$page-$lang.html"
    if ($page -eq "index") { $canonFile = "index-$lang.html" }

    $content = [regex]::Replace($content, '<link rel="canonical" href="https://moringanepal.com/[^"]*" />', '<link rel="canonical" href="https://moringanepal.com/' + $canonFile + '" />', 1)
    $content = [regex]::Replace($content, '(<meta property="og:url" content=")https://moringanepal.com/[^"]*(" />)', '$1https://moringanepal.com/' + $canonFile + '$2', 1)
    $content = [regex]::Replace($content, '(<meta property="og:locale" content=")[^"]*(" />)', '$1' + $localeMeta[$lang] + '$2', 1)

    if ($page -ne "index") {
      $enUrl = "https://moringanepal.com/$page.html"
      $locUrl = "https://moringanepal.com/$page-$lang.html"
      $content = $content.Replace($enUrl, $locUrl)
    }

    Set-Content -Encoding UTF8 $dst $content
  }
}

Write-Host "Localized pages generated from English source."
