# Renders the app icons and splash with the game's own Cubo (tools/cubo-icons.js injected into
# www/index.html, headless Chrome) and writes the PNGs into www/icons/ and resources/ (dev only).
# Then `npm run assets` turns resources/ into the iOS and Android icons and splash screens.
import base64, pathlib
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome')
    page = browser.new_page(viewport={'width': 400, 'height': 800})
    page.goto((root / 'www' / 'index.html').as_uri())
    page.wait_for_timeout(800)
    page.add_script_tag(path=str(root / 'tools' / 'cubo-icons.js'))
    for name, url in page.evaluate('window.cuboIcons()').items():
        (root / name).parent.mkdir(exist_ok=True)
        (root / name).write_bytes(base64.b64decode(url.split(',', 1)[1]))
        print('wrote ' + name)
    browser.close()
