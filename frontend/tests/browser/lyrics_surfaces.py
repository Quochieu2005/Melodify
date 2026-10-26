"""Full database lyrics + real media-clock regression across all lyric surfaces.

Run against the existing servers: python tests/browser/lyrics_surfaces.py
Metadata/lyrics are fetched from the real API first, then replayed unchanged to
avoid the single-worker PHP media stream blocking concurrent API requests.
Audio is NOT mocked. No account/catalog writes; view-count POSTs are intercepted.
"""
import json
import os
import re
import sys
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright
from player_lyrics_queue import AUDIO_PROBE, FRONTEND, API

sys.stdout.reconfigure(encoding="utf-8")
SLUGS = [
    "khong-phai-dang-vua-dau-son-tung-m-tp",
    "buong-doi-tay-nhau-ra-son-tung-m-tp",
    "co-em-cho-min-mra",
    "xin-anh-dung-justatee-lk-emily",
]


def get(path):
    with urlopen(API + "/v1" + path, timeout=45) as response:
        return json.load(response)


def admin_cues(records):
    # Same parse rule as the admin's saved standard LRC, no plain-text matching.
    for record in records:
        source = record.get("synced_lyrics") or (record.get("content") if record.get("is_synced") else "") or ""
        rows = []
        for raw in source.splitlines():
            matches = re.findall(r"\[(\d+):(\d+(?:\.\d+)?)\]", raw)
            text = re.sub(r"\[\d+:\d+(?:\.\d+)?\]", "", raw).strip()
            if text:
                rows.extend({"time": int(m) * 60 + float(s), "text": text} for m, s in matches)
        if rows:
            return sorted(rows, key=lambda row: row["time"])
    return []


def assert_cues(locator, expected):
    expect(locator).to_have_count(len(expected))
    actual = locator.evaluate_all("nodes => nodes.map(n => ({time: Number(n.dataset.lyricTime), text: n.textContent.trim()}))")
    assert actual == expected, "Rendered saved cues differ from admin"


def context_for(browser, payloads):
    context = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    context.add_init_script(AUDIO_PROBE)
    context.route("**/api/v1/songs/*/view", lambda route: route.fulfill(json={"recorded": False, "views": 0}))
    def reply(result):
        return lambda route: route.fulfill(json=result)
    for slug, song, lyrics in payloads:
        context.route("**/api/v1/songs/" + slug + "/lyrics", reply(lyrics))
        context.route(re.compile(r"/api/v1/songs/" + re.escape(slug) + r"(?:\?.*)?$"), reply(song))
    return context


def assert_audio_seek(page, target):
    page.wait_for_function("t => window.__audios.some(a => a.readyState >= 1 && a.currentTime >= t - .06 && a.currentTime < t + 1)", arg=target, timeout=30000)


def exercise_clock(page, lines, cues, player):
    page.wait_for_function("window.__audios.some(a => a.readyState >= 2 && !a.paused)", timeout=30000)
    # Use a vocal cue within even a preview's permitted playback window.
    index = next(i for i, row in enumerate(cues) if 17 <= row["time"] < 29 and not re.match(r"^(Bài [Hh]át|Ca [Ss]ĩ):", row["text"]))
    target = cues[index]["time"]
    lines.nth(index).click()
    assert_audio_seek(page, target)
    expect(lines.nth(index)).to_have_attribute("aria-current", "true")
    # Seek the native audio just before a cue, then let real playback cross it.
    page.evaluate("t => {const a=window.__audios.find(a=>a.readyState>=1); a.pause(); a.currentTime=t;}", target - .35)
    page.wait_for_function("window.__audios.some(a => a.paused && !a.seeking)")
    expect(lines.nth(index)).not_to_have_attribute("aria-current", "true")
    page.evaluate("window.__audios.find(a=>a.readyState>=1).play()")
    expect(lines.nth(index)).to_have_attribute("aria-current", "true", timeout=5000)
    player.get_by_role("button", name="Tạm dừng", exact=True).click()
    clock = page.evaluate("window.__audios.find(a=>a.readyState>=1).currentTime")
    page.wait_for_timeout(650)
    assert page.evaluate("window.__audios.find(a=>a.readyState>=1).currentTime") == clock
    expect(lines.nth(index)).to_have_attribute("aria-current", "true")
    # A backwards lyric click must seek to the earlier stored cue too.
    earlier = max(0, index - 1)
    lines.nth(earlier).click()
    assert_audio_seek(page, cues[earlier]["time"])


def run():
    payloads = [(slug, get("/songs/" + slug), get("/songs/" + slug + "/lyrics")) for slug in SLUGS]
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            for slug, song, lyrics in ([] if os.getenv('LYRICS_FOR_YOU_ONLY') else payloads):
                context = context_for(browser, payloads)
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(FRONTEND + "/song/" + slug, wait_until="networkidle")
                expect(page.get_by_role("heading", name=song["data"]["title"], exact=True)).to_be_visible()
                plain = lyrics["data"][0]["plain_lyrics"].replace("\r\n", "\n")
                assert page.locator("[data-plain-lyrics]").text_content().replace("\r\n", "\n") == plain
                assert page.locator("[data-plain-lyrics]").evaluate("e => !e.closest('.lyric-scroll')")
                page.locator("main").get_by_role("button", name="Phát", exact=True).click()
                player = page.get_by_role("region", name="Trình phát nhạc")
                cues = admin_cues(lyrics["data"])
                lines = page.locator("#lyrics button[data-lyric-time]")
                assert_cues(lines, cues)
                exercise_clock(page, lines, cues, player)
                player.get_by_role("button", name="Lời bài hát", exact=True).click()
                overlay = page.get_by_role("dialog", name="Lời bài hát toàn màn hình")
                overlay_lines = overlay.locator("button[data-lyric-time]")
                assert_cues(overlay_lines, cues)
                exercise_clock(page, overlay_lines, cues, player)
                # Manual scrolling must not be taken over by the next lyric.
                region = overlay.get_by_role("region", name="Nội dung lời bài hát")
                region.evaluate("e => {e.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:100})); e.scrollTop=400;}")
                page.evaluate("window.__audios.find(a=>a.readyState>=1).currentTime=20")
                page.wait_for_timeout(500)
                assert abs(region.evaluate("e => e.scrollTop") - 400) < 2
                assert not errors, errors
                context.close()
                print("PASS detail/fullscreen + full text + real clock/seek: " + slug, flush=True)

            # Force recommendations only for deterministic song choice; lyrics
            # and song records remain unmodified real database API responses.
            context = context_for(browser, payloads)
            context.route("**/api/v1/genres*", lambda route: route.fulfill(json={"data": [{"id": "pop", "name": "Pop", "status": "active"}], "meta": {"last_page": 1}}))
            context.route("**/api/v1/for-you/artists*", lambda route: route.fulfill(json={"data": [{"id": str(i), "name": "Artist" + str(i)} for i in range(3)]}))
            index = [0]
            def recommendation(route):
                result = payloads[index[0]][1]
                index[0] += 1
                route.fulfill(json=result)
            context.route("**/api/v1/for-you/song*", recommendation)
            page = context.new_page()
            page.goto(FRONTEND + "/for-you", wait_until="networkidle")
            assert 'Pop' in page.locator('main').inner_text()
            page.get_by_role("button", name=re.compile(r"^Pop")).click()
            page.get_by_role("button", name=re.compile(r"^Tiếp tục")).click()
            for i in range(3):
                page.get_by_role("button", name=re.compile("Artist" + str(i))).click()
            page.get_by_role("button", name=re.compile(r"^Tìm nhạc cho tôi")).click()
            for i in range(2):
                cues = admin_cues(payloads[i][2]["data"])
                lines = page.locator("main button[data-lyric-time]")
                assert_cues(lines, cues)
                exercise_clock(page, lines, cues, page.get_by_role("region", name="Trình phát nhạc"))
                assert page.get_by_text("Theo lời đang phát", exact=True).count() == 0
                assert page.get_by_text(re.compile("dòng lời đồng bộ.*Cuộn")).count() == 0
                assert lines.first.evaluate("e => getComputedStyle(e.parentElement.parentElement).overflowY") == "visible"
                print("PASS for-you + all saved cues + real clock/seek: " + payloads[i][0], flush=True)
                if i == 0:
                    page.get_by_role("button", name="Bài đề xuất tiếp theo", exact=True).click()
            context.close()
        finally:
            browser.close()


if __name__ == "__main__":
    run()
