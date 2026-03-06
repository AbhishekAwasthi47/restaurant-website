New-Item -ItemType Directory -Force -Path 'uploads'

$map = @{
  'sashimi_moriawase_1772723375216.png' = 'sashimi-moriawase.jpg';
  'wagyu_nigiri_1772723394324.png' = 'wagyu-nigiri.jpg';
  'kaze_ramen_1772723415450.png' = 'kaze-ramen.jpg';
  'uni_ikura_don_1772723439448.png' = 'uni-ikura-don.jpg';
  'edamame_1772723481065.png' = 'edamame.jpg';
  'gyoza_1772723499574.png' = 'gyoza.jpg';
  'matcha_tiramisu_1772723521412.png' = 'matcha-tiramisu.jpg';
  'yuzu_sake_1772723539663.png' = 'yuzu-sake.jpg';
  'tempura_moriawase_1772723604497.png' = 'tempura.jpg';
  'miso_soup_1772723623251.png' = 'miso-soup.jpg';
  'black_sesame_panna_cotta_1772723642898.png' = 'sesame-panna-cotta.jpg'
}

$srcDir = 'C:\Users\91873\.gemini\antigravity\brain\75ca2b05-9ab0-41fe-99fe-5e831d696763'
$destDir = 'uploads'

foreach ($key in $map.Keys) {
    $src = Join-Path $srcDir $key
    $dest = Join-Path $destDir $map[$key]
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dest -Force
        Write-Host "Copied $key to $($map[$key])"
    } else {
        Write-Host "Missing $key"
    }
}

$fallbackSrc = Join-Path $srcDir 'matcha_tiramisu_1772723521412.png'
$fallbackDest = Join-Path $destDir 'hojicha-latte.jpg'
if (Test-Path $fallbackSrc) {
    Copy-Item -Path $fallbackSrc -Destination $fallbackDest -Force
    Write-Host "Copied fallback for hojicha-latte.jpg"
}
