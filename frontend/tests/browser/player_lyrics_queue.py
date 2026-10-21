"""Player drawer/fullscreen lyric regression checks against the running local app.

Run: python tests/browser/player_lyrics_queue.py
Requires Python Playwright + Chromium. Uses real API songs/audio and test-only
lyric responses for empty/error/plain states. View-count POSTs are intercepted;
no catalog or account records are changed. Optional env: FRONTEND_URL, API_URL,
PLAYER_LYRICS_SONG, PLAYER_QUEUE_SONG, PLAYER_SCREENSHOT_DIR.
"""

import json
import os
import sys
import tempfile
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
FRONTEND = os.getenv("FRONTEND_URL", "http://localhost:3000")
API = os.getenv("API_URL", "http://127.0.0.1:8000/api")
SONG = os.getenv("PLAYER_LYRICS_SONG", "the-gioi-cua-anh-tinh-ha-say-hi-duong-domic-wean-congb-buitruonglinh-van-toan")
NEXT = os.getenv("PLAYER_QUEUE_SONG", "buong-doi-tay-nhau-ra-son-tung-m-tp")
SCREENSHOTS = Path(os.getenv("PLAYER_SCREENSHOT_DIR", tempfile.gettempdir()))


def get(path):
    with urlopen(API + path, timeout=25) as response:
        return json.load(response)


def player_track(song):
    quality = next((q for q in song.get("audio_qualities", []) if not q["premium_only"] and q.get("audio_url")), None)
    return {
        "id": song["id"], "slug": song["slug"], "title": song["title"],
        "artist": ", ".join(a["name"] for a in song.get("artists", [])), "artists": song.get("artists", []),
        "coverUrl": song.get("cover_url") or "/images/cover-placeholder.svg",
        "durationSeconds": song["duration_seconds"], "audioUrl": quality["audio_url"] if quality else song.get("audio_url"),
        "audioQualities": song.get("audio_qualities", []), "selectedQualityId": quality["quality_id"] if quality else None,
        "qualityLabel": quality["label"] if quality else None,
        "isHot": False, "premiumOnly": False, "previewLimitSeconds": None,
    }


AUDIO_PROBE = """(() => {
  window.__audios = [];
  window.__audioLoads = 0;
  const NativeAudio = window.Audio;
  window.Audio = class extends NativeAudio {
    constructor(...args) {
      super(...args);
      window.__audios.push(this);
      this.addEventListener('loadstart', () => window.__audioLoads++);
    }
  };
})();"""


def setup(browser, tracks, fixture=None, index=0):
    context = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    context.add_init_script(AUDIO_PROBE)
    state = {"track": tracks[index], "queue": tracks, "currentIndex": index, "elapsed": 0, "isPlaying": False}
    context.add_init_script("sessionStorage.setItem('melodify_player_state', " + json.dumps(json.dumps(state)) + ");")
    context.route("**/api/v1/songs/*/view", lambda route: route.fulfill(json={"recorded": False, "views": 0}))
    if fixture is not None:
        context.route("**/api/v1/songs/*/lyrics", lambda route: route.fulfill(json={"data": fixture, "meta": {}}))
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(FRONTEND + "/home", wait_until="networkidle")
    player = page.get_by_role("region", name="Trình phát nhạc")
    expect(player.get_by_role("button", name="Lời bài hát", exact=True)).to_be_enabled()
    return context, page, player, errors


def run():
    first = player_track(get("/v1/songs/" + SONG)["data"])
    second = player_track(get("/v1/songs/" + NEXT)["data"])
    second_lyrics = get("/v1/songs/" + NEXT + "/lyrics")
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            context, page, player, errors = setup(browser, [first, second, first])
            # Inspect live controls before using them.
            assert "Lời bài hát" in player.locator("button").evaluate_all("nodes => nodes.map(n => n.getAttribute('aria-label'))")
            queue_trigger = player.get_by_role("button", name="Danh sách phát", exact=True)
            lyrics_trigger = player.get_by_role("button", name="Lời bài hát", exact=True)
            queue_trigger.click()
            drawer = page.get_by_role("complementary", name="Danh sách phát")
            expect(drawer).to_be_visible()
            expect(drawer.get_by_role("heading", name="Tiếp theo")).to_be_visible()
            expect(drawer.locator('button[aria-current="true"]')).to_have_count(1)
            expect(drawer.locator("ol li")).to_have_count(2)
            box = drawer.bounding_box()
            assert box["y"] == 0 and box["x"] + box["width"] == 1440 and box["height"] == 826
            page.screenshot(path=str(SCREENSHOTS / "melodify-player-queue.png"))
            page.keyboard.press("Escape")
            expect(queue_trigger).to_be_focused()
            expect(drawer).to_have_count(0)

            page.wait_for_function("window.__audios.some(a => a.readyState >= 1)", timeout=20000)
            lyrics_trigger.click()
            overlay = page.get_by_role("dialog", name="Lời bài hát toàn màn hình")
            expect(overlay).to_be_visible()
            lines = overlay.locator("button[data-lyric-time]")
            expect(lines.first).to_be_visible(timeout=20000)
            assert lines.count() > 5
            target = lines.nth(5)
            timestamp = float(target.get_attribute("data-lyric-time"))
            target.click()
            page.wait_for_function("t => window.__audios.some(a => a.readyState >= 1 && Math.abs(a.currentTime - t) < 0.05 && a.paused)", arg=timestamp)
            expect(target).to_have_attribute("aria-current", "true")
            assert page.url == FRONTEND + "/home"
            assert page.evaluate("document.body.style.overflow") == "hidden"
            page.screenshot(path=str(SCREENSHOTS / "melodify-player-lyrics-desktop.png"))

            # Real media stays playing after a lyric seek and after closing the view.
            player.get_by_role("button", name="Phát", exact=True).click()
            page.wait_for_function("window.__audios.some(a => !a.paused && a.readyState >= 2)", timeout=20000)
            earlier = lines.nth(2)
            earlier_time = float(earlier.get_attribute("data-lyric-time"))
            earlier.click()
            page.wait_for_function("t => window.__audios.some(a => !a.paused && a.currentTime >= t && a.currentTime < t + 1)", arg=earlier_time)
            loads = page.evaluate("window.__audioLoads")
            page.get_by_role("button", name="Thu gọn lời bài hát").click()
            expect(overlay).to_have_count(0)
            expect(lyrics_trigger).to_be_focused()
            assert page.evaluate("window.__audioLoads") == loads
            assert page.evaluate("window.__audios.some(a => !a.paused)")
            player.get_by_role("button", name="Tạm dừng", exact=True).click()
            assert page.evaluate("document.body.style.overflow") != "hidden"
            results.append("real LRC fetch + fractional/backwards seek + playing/paused state + no reload on close")

            lyrics_trigger.click()
            expect(lines.first).to_be_attached()
            # Menus remain above the lyric view; Escape dismisses only the menu.
            quality_trigger = player.locator('button[aria-label^="Chất lượng nghe:"]')
            quality_trigger.click()
            expect(page.get_by_role("region", name="Chất lượng nghe", exact=True)).to_be_visible()
            page.keyboard.press("Escape")
            expect(quality_trigger).to_be_focused()
            expect(overlay).to_be_visible()
            queue_trigger.focus()
            page.keyboard.press("Tab")
            expect(page.get_by_role("button", name="Thu gọn lời bài hát")).to_be_focused()
            page.keyboard.press("Shift+Tab")
            expect(queue_trigger).to_be_focused()
            for width in [1920, 768, 390, 320]:
                page.set_viewport_size({"width": width, "height": 844})
                expect(lyrics_trigger).to_be_visible()
                expect(player.get_by_role("button", name="Danh sách phát", exact=True)).to_be_visible()
                for element in [page.locator("#player-lyrics"), player]:
                    box = element.bounding_box()
                    assert box["x"] >= 0 and box["x"] + box["width"] <= width + 1, box
                    metrics = element.evaluate("e => { const content = e.id === 'player-lyrics' ? e.querySelector(':scope > div.relative') : e; return {scroll: content.scrollWidth, client: content.clientWidth, name: e.getAttribute('aria-label')}; }")
                    assert metrics["scroll"] <= metrics["client"] + 1, {"viewport": width, **metrics}
                if width == 390:
                    page.screenshot(path=str(SCREENSHOTS / "melodify-player-lyrics-mobile.png"))
            results.append("fullscreen and controls fit widths 320/390/768/1440/1920")

            # Changing queue item must clear the previous song's lyrics while loading.
            page.set_viewport_size({"width": 1440, "height": 900})
            held = []
            page.route("**/api/v1/songs/" + second["slug"] + "/lyrics", lambda route: held.append(route))
            queue_trigger.click()
            drawer.get_by_role("button", name="Phát " + second["title"], exact=True).click()
            expect(page.get_by_text("Đang tải lời bài hát…", exact=True)).to_be_visible()
            expect(lines).to_have_count(0)
            expect(drawer.locator('button[aria-current="true"]')).to_contain_text(second["title"])
            assert held
            held[0].fulfill(json=second_lyrics)
            expect(lines.first).to_be_attached()
            # Select the repeated first song at index 2, not its occurrence at index 0.
            drawer.get_by_role("button", name="Phát " + first["title"], exact=True).click()
            page.wait_for_function("JSON.parse(sessionStorage.getItem('melodify_player_state')).currentIndex === 2")
            expect(drawer.get_by_text("Các bài trước (2)", exact=True)).to_be_visible()
            expect(drawer.get_by_text("Chưa có bài tiếp theo. Chọn thêm bài hát từ album hoặc playlist.")).to_be_visible()
            page.keyboard.press("Escape")
            expect(drawer).to_have_count(0)
            expect(overlay).to_be_visible()
            page.keyboard.press("Escape")
            expect(overlay).to_have_count(0)
            assert not errors, errors
            context.close()
            results.append("queue selection/duplicate indexes + fresh lyrics on song change + layered Escape")

            # A late response for the old song must not overwrite the new song.
            context, page, player, errors = setup(browser, [first, second])
            delayed = []
            page.route("**/api/v1/songs/" + first["slug"] + "/lyrics", lambda route: delayed.append(route))
            player.get_by_role("button", name="Lời bài hát", exact=True).click()
            expect(page.get_by_text("Đang tải lời bài hát…", exact=True)).to_be_visible()
            player.get_by_role("button", name="Danh sách phát", exact=True).click()
            page.get_by_role("complementary", name="Danh sách phát").get_by_role("button", name="Phát " + second["title"], exact=True).click()
            expect(page.locator("button[data-lyric-time]").first).to_be_attached(timeout=20000)
            current_lines = page.locator("button[data-lyric-time]").all_text_contents()
            assert delayed
            delayed[0].fulfill(json={"data": [{"id": "old-test", "song_id": first["id"], "is_synced": True, "synced_lyrics": "[00:00.00]STALE_RESPONSE_MUST_NOT_APPEAR"}], "meta": {}})
            expect(page.get_by_text("STALE_RESPONSE_MUST_NOT_APPEAR", exact=True)).to_have_count(0)
            assert page.locator("button[data-lyric-time]").all_text_contents() == current_lines
            assert not errors, errors
            context.close()
            results.append("late previous-song response never overwrites current lyrics")

            for data, message in [([], "Bài hát chưa có lời."), ([{"id": "test", "song_id": first["id"], "language": "vi", "is_synced": False, "content": "Lời kiểm thử chưa có mốc thời gian"}], "Lời chưa có mốc thời gian")]:
                context, page, player, errors = setup(browser, [first], fixture=data)
                player.get_by_role("button", name="Lời bài hát", exact=True).click()
                expect(page.get_by_text(message, exact=False)).to_be_visible()
                expect(page.locator("button[data-lyric-time]")).to_have_count(0)
                assert not errors, errors
                context.close()
            results.append("plain/empty lyrics do not invent seek targets")

            preview_track = {**first, "previewLimitSeconds": 30, "durationSeconds": 30}
            preview_lyrics = [{"id": "preview-test", "song_id": first["id"], "language": "vi", "is_synced": True, "synced_lyrics": "[00:05.25]Trong đoạn nghe thử\n[00:45.50]Ngoài đoạn nghe thử"}]
            context, page, player, errors = setup(browser, [preview_track], fixture=preview_lyrics)
            player.get_by_role("button", name="Lời bài hát", exact=True).click()
            expect(page.get_by_role("button", name="Trong đoạn nghe thử", exact=True)).to_be_enabled()
            expect(page.get_by_role("button", name="Ngoài đoạn nghe thử", exact=True)).to_be_disabled()
            assert not errors, errors
            context.close()
            results.append("lyric seek respects the 30-second preview limit")

            context, page, player, errors = setup(browser, [first])
            attempts = []
            def retry_response(route):
                attempts.append(1)
                if len(attempts) == 1:
                    route.fulfill(status=503, json={"message": "Test unavailable"})
                else:
                    route.fulfill(json={"data": [], "meta": {}})
            page.route("**/api/v1/songs/*/lyrics", retry_response)
            player.get_by_role("button", name="Lời bài hát", exact=True).click()
            expect(page.get_by_text("Không tải được lời bài hát.", exact=True)).to_be_visible()
            page.get_by_role("button", name="Thử lại", exact=True).click()
            expect(page.get_by_text("Bài hát chưa có lời.", exact=False)).to_be_visible()
            assert len(attempts) == 2 and not errors
            context.close()
            results.append("lyrics API error and retry")
            print(json.dumps({"passed": results, "pageErrors": []}, ensure_ascii=False))
        finally:
            browser.close()


if __name__ == "__main__":
    run()
