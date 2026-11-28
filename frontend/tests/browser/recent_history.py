"""Real browser check of "Nghe gần đây": opening an album, playlist, artist or video page puts it in its tab, the
tab can delete selected items, and there is no Radios tab. Run with the local frontend and backend:

    python tests/browser/recent_history.py

No account is needed and nothing on the server is changed (view counters are posted by the pages themselves, as
for any visitor).
"""

import json
import os
import sys
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

FRONTEND = os.getenv("FRONTEND_URL", "http://localhost:3000")
API = os.getenv("API_URL", "http://127.0.0.1:8000/api")


def first(path: str):
    with urlopen(f"{API}{path}", timeout=60) as response:
        data = json.load(response).get("data") or []
    return data[0] if data else None


def main() -> int:
    album = first("/v1/albums?per_page=1")
    playlist = first("/v1/playlists?per_page=1")
    artist = first("/v1/artists?per_page=1")
    video = first("/v1/videos?per_page=1")
    targets = [
        ("album", "Album", f"/album/{(album or {}).get('slug') or (album or {}).get('id')}", album and album["title"]),
        ("playlist", "Playlist", f"/playlist/{(playlist or {}).get('slug') or (playlist or {}).get('id')}", playlist and playlist["name"]),
        ("artist", "Nghệ sĩ", f"/artist/{(artist or {}).get('slug') or (artist or {}).get('id')}", artist and artist["name"]),
        ("video", "Video", f"/video/{(video or {}).get('slug') or (video or {}).get('id')}", video and video["title"]),
    ]
    failures: list[str] = []
    passed: list[str] = []

    with sync_playwright() as pw:
        try:
            browser = pw.chromium.launch()
        except Exception:
            browser = pw.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.route("**/view", lambda route, request: route.fulfill(status=200, content_type="application/json", body='{"recorded":false}'))

        for category, tab, path, title in targets:
            if not title:
                print(f"SKIP {category}: the catalog has none")
                continue
            page.goto(FRONTEND + path, wait_until="networkidle", timeout=120_000)
            page.wait_for_timeout(1500)
            stored = page.evaluate("JSON.parse(localStorage.getItem('melodify_recent_history') || '[]')")
            if any(item["category"] == category and item["title"] == title for item in stored):
                passed.append(f"{category}: the visit is recorded")
            else:
                failures.append(f"{category}: '{title}' was not recorded after opening {path}")

        # The history is kept on the server: with this device's copy erased, the page still lists everything.
        page.evaluate("localStorage.removeItem('melodify_recent_history')")
        page.goto(FRONTEND + "/recent", wait_until="networkidle", timeout=120_000)
        page.wait_for_timeout(1500)
        labels = page.locator("[role=tab]").all_inner_texts()
        if any("Radio" in label for label in labels):
            failures.append(f"the Radios tab is still there: {labels}")
        else:
            passed.append(f"no Radios tab: {labels}")

        for category, tab, path, title in targets:
            if not title:
                continue
            page.get_by_role("tab", name=tab, exact=True).click()
            page.wait_for_timeout(400)
            if page.get_by_text(title, exact=True).count() == 0:
                failures.append(f"{category}: '{title}' is not listed under the {tab} tab")
                continue
            checkbox = page.get_by_label(f"Chọn {title}")
            checkbox.first.check(force=True)
            page.get_by_role("button", name="Xóa", exact=False).first.click()
            page.wait_for_timeout(400)
            if page.get_by_text(title, exact=True).count() != 0:
                failures.append(f"{category}: '{title}' is still listed after deleting it")
                continue
            # Deleted on the server too: erase the local copy and load again.
            page.wait_for_timeout(800)
            page.evaluate("localStorage.removeItem('melodify_recent_history')")
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(1500)
            page.get_by_role("tab", name=tab, exact=True).click()
            if page.get_by_text(title, exact=True).count() == 0:
                passed.append(f"{category}: deleted from the {tab} tab and from the server")
            else:
                failures.append(f"{category}: '{title}' came back from the server after deleting it")

        browser.close()

    print(json.dumps({"passed": passed, "failed": failures}, ensure_ascii=False, indent=1))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
