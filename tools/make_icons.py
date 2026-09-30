# Renders tools/icons.html in headless Chrome and writes the PNGs into icons/ (dev only).
import base64, pathlib
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome')
    page = browser.new_page()
    page.goto((root / 'tools' / 'icons.html').as_uri())
    for name, url in page.evaluate('window.icons').items():
        (root / 'icons' / name).write_bytes(base64.b64decode(url.split(',', 1)[1]))
        print('wrote icons/' + name)
    browser.close()
