"""Verify a chart starts the complete chart queue and shuffle is a real permutation.

Run from frontend/: python tests/browser/chart_full_queue_shuffle.py
Requires the local frontend/backend and Python Playwright. Song view events are
intercepted so the check does not change catalog analytics.
"""

import json
import os
import sys
import tempfile
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
FRONTEND = os.getenv("FRONTEND_URL", "http://localhost:3000")
API = os.getenv("API_URL", "http://127.0.0.1:8000/api")
CHART_SLUG = os.getenv("PLAYER_CHART_SLUG", "top-50-nhac-viet")


def get(path):
    with urlopen(API + path, timeout=25) as response:
        return json.load(response)


def read_player_state(page):
    return page.evaluate("JSON.parse(sessionStorage.getItem('melodify_player_state'))")


def run():
    chart = get("/v1/charts/" + CHART_SLUG)["data"]
    full_songs = chart["songs"]
    assert len(full_songs) == chart["song_count"] and len(full_songs) > 5
    home_charts = get("/v1/home/bootstrap")["data"]["charts"]
    populated_chart_count = sum(1 for item in home_charts if item["song_count"] > 0 and item["songs"])
    empty_chart_titles = [item["title"] for item in home_charts if item["song_count"] == 0 or not item["songs"]]

    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        context.add_init_script("""(() => {
          window.__playerAudios = [];
          const NativeAudio = window.Audio;
          window.Audio = class extends NativeAudio {
            constructor(...args) { super(...args); window.__playerAudios.push(this); }
          };
        })();""")
        page = context.new_page()
        page.set_default_timeout(5000)
        page.set_default_navigation_timeout(30_000)
        page.route("**/api/v1/songs/*/view", lambda route: route.fulfill(json={"recorded": False, "views": 0}))
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        try:
            page.goto(FRONTEND + "/home", wait_until="networkidle")
            ranking_section = page.locator("section[aria-labelledby='ranking-heading']")
            expect(ranking_section.locator("article")).to_have_count(populated_chart_count)
            for empty_title in empty_chart_titles:
                expect(ranking_section.get_by_role("heading", name=empty_title, exact=True)).to_have_count(0)
            first_song_title = chart["songs"][0]["title"]
            menu_button = page.get_by_role("button", name="Tùy chọn bài " + first_song_title, exact=True).first
            menu_button.locator("xpath=ancestor::li").hover()
            menu_button.click()
            action_menu = page.get_by_role("menu", name="Thao tác bài " + first_song_title, exact=True).first
            expect(action_menu).to_be_visible()
            ranking_track = page.locator("section[aria-labelledby='ranking-heading'] [aria-label='Bảng xếp hạng'] > div").first
            overflow_values = ranking_track.evaluate("element => [getComputedStyle(element).overflowX, getComputedStyle(element).overflowY]")
            assert overflow_values == ["visible", "visible"], overflow_values
            page.keyboard.press("Escape")
            results.append("song action menu opens fully on the Home chart cards")

            page.goto(FRONTEND + "/charts", wait_until="networkidle")
            menu_button = page.get_by_role("button", name="Tùy chọn bài " + first_song_title, exact=True).first
            menu_button.locator("xpath=ancestor::li").hover()
            menu_button.click()
            action_menu = page.get_by_role("menu", name="Thao tác bài " + first_song_title, exact=True).first
            expect(action_menu).to_be_visible()
            page.keyboard.press("Escape")
            results.append("song action menu opens on the Charts gallery cards")

            page.goto(FRONTEND + "/home", wait_until="networkidle")
            page.get_by_role("button", name="Phát toàn bộ " + chart["title"], exact=True).click()
            page.wait_for_function("expected => JSON.parse(sessionStorage.getItem('melodify_player_state'))?.queue?.length === expected", arg=len(full_songs))
            normal_state = read_player_state(page)
            canonical_ids = [entry["queueEntryId"] for entry in normal_state["originalQueue"]]
            assert len(normal_state["queue"]) == len(full_songs)
            assert canonical_ids == [entry["queueEntryId"] for entry in normal_state["queue"]]
            results.append(f"chart play loads all {len(full_songs)} songs, not only the five previews")

            player = page.get_by_role("region", name="Trình phát nhạc")
            player.get_by_role("button", name="Danh sách phát", exact=True).click()
            drawer = page.get_by_role("complementary", name="Danh sách phát")
            expect(drawer.locator("ol li")).to_have_count(len(full_songs) - 1)

            shuffle_button = player.get_by_role("button", name="Phát ngẫu nhiên", exact=True)
            shuffle_button.click()
            page.wait_for_function("JSON.parse(sessionStorage.getItem('melodify_player_state')).shuffle === true")
            first_shuffle = read_player_state(page)
            first_shuffle_ids = [entry["queueEntryId"] for entry in first_shuffle["queue"]]
            assert first_shuffle_ids != canonical_ids
            assert len(set(first_shuffle_ids)) == len(full_songs)
            visible_upcoming = drawer.locator("ol li button[aria-label^='Phát ']").evaluate_all(
                "buttons => buttons.map(button => button.getAttribute('aria-label').slice(4).trim())"
            )
            assert visible_upcoming == [entry["title"].strip() for entry in first_shuffle["queue"][1:]], {
                "visible": visible_upcoming,
                "expected": [entry["title"] for entry in first_shuffle["queue"][1:]],
            }

            shuffle_button.click()
            page.wait_for_function("JSON.parse(sessionStorage.getItem('melodify_player_state')).shuffle === false")
            restored_ids = [entry["queueEntryId"] for entry in read_player_state(page)["queue"]]
            assert restored_ids == canonical_ids

            shuffle_button.click()
            page.wait_for_function("JSON.parse(sessionStorage.getItem('melodify_player_state')).shuffle === true")
            second_shuffle_ids = [entry["queueEntryId"] for entry in read_player_state(page)["queue"]]
            assert second_shuffle_ids != first_shuffle_ids
            results.append("shuffle changes the visible upcoming order without duplicate entries; off restores the original order")

            player.get_by_role("button", name="Bật lặp lại toàn bộ danh sách", exact=True).click()
            page.wait_for_function("JSON.parse(sessionStorage.getItem('melodify_player_state')).repeatMode === 'all'")
            all_repeat_button = player.get_by_role("button", name="Lặp lại toàn bộ danh sách", exact=True)
            all_repeat_svg = all_repeat_button.locator("svg")
            assert all_repeat_svg.locator("use").get_attribute("href") == "#icon-player_refresh_icon"
            assert all_repeat_svg.bounding_box()["width"] == 24
            all_repeat_svg.screenshot(path=os.path.join(tempfile.gettempdir(), "melodify-repeat-all.png"))
            drawer.locator("ol li").last.locator("button[aria-label^='Phát ']").click()
            page.wait_for_function("state => JSON.parse(sessionStorage.getItem('melodify_player_state')).currentIndex === state - 1", arg=len(full_songs))
            page.evaluate("window.__playerAudios.at(-1).dispatchEvent(new Event('ended'))")
            page.wait_for_function("JSON.parse(sessionStorage.getItem('melodify_player_state')).currentIndex === 0")
            expect(all_repeat_button).to_be_visible()

            player.get_by_role("button", name="Lặp lại toàn bộ danh sách", exact=True).click()
            page.wait_for_function("JSON.parse(sessionStorage.getItem('melodify_player_state')).repeatMode === 'one'")
            one_repeat_button = player.get_by_role("button", name="Lặp lại một bài", exact=True)
            one_repeat_svg = one_repeat_button.locator("svg")
            assert one_repeat_svg.locator("use").get_attribute("href") == "#icon-player_refresh_one_icon"
            one_repeat_svg.screenshot(path=os.path.join(tempfile.gettempdir(), "melodify-repeat-one.png"))
            page.evaluate("window.__playerAudios.at(-1).dispatchEvent(new Event('ended'))")
            page.wait_for_function("JSON.parse(sessionStorage.getItem('melodify_player_state')).repeatMode === 'one'")
            expect(one_repeat_button).to_be_visible()
            results.append("repeat-all wraps to the first queue entry; repeat-one and repeat-all expose distinct control states")
            assert not errors, errors
        finally:
            context.close()
            browser.close()

    print(json.dumps({"passed": results, "pageErrors": errors}, ensure_ascii=False))


if __name__ == "__main__":
    run()
