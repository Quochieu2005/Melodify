"""Real browser playback checks. Run with the locally running frontend/backend.

No credentials are required and this test does not edit/delete catalog records.
"""

import json
import argparse
import os
import sys
import unittest

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")


AUDIO_PROBE = """(() => {
  window.__audioEvents = [];
  window.__audios = [];
  const NativeAudio = window.Audio;
  window.Audio = class extends NativeAudio {
    constructor(...args) {
      super(...args);
      window.__audios.push(this);
      for (const name of ['loadstart', 'loadedmetadata', 'waiting', 'playing', 'pause', 'error']) {
        this.addEventListener(name, () => window.__audioEvents.push({
          name, at: performance.now(), src: this.currentSrc, error: this.error?.code
        }));
      }
    }
  };
})();"""


class PlayerInteractions(unittest.TestCase):
    def test_playback_controls_and_mobile(self):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.add_init_script(AUDIO_PROBE)
            page.goto(os.getenv("FRONTEND_URL", "http://localhost:3000") + "/home")
            page.wait_for_load_state("networkidle")
            buttons = page.get_by_role("button", name="Phát ").all()
            available = [(b.get_attribute("aria-label"), b) for b in buttons if b.is_visible()]
            self.assertTrue(available, "No playable song buttons on the home page")
            preferred = os.getenv("PLAYER_TEST_SONG", "Thằng Hầu")
            selected = next(((label, b) for label, b in available if preferred in (label or "")), available[0])
            label, button = selected
            button = page.get_by_role("button", name=label, exact=True).first
            button.evaluate("element => element.scrollIntoView({block: 'center'})")
            button.locator("..").hover()
            started = page.evaluate("performance.now()")
            button.click()
            try:
                page.wait_for_function("window.__audios.some(a => !a.paused && a.currentTime > 0 && a.readyState >= 2)", timeout=20000)
                events = page.evaluate("window.__audioEvents")
                playing = next(e for e in events if e["name"] == "playing" and e["at"] >= started)
                print(json.dumps({"song": label, "click_to_playing_ms": round(playing["at"] - started), "events": events}, ensure_ascii=False))
                player = page.get_by_role("region", name="Trình phát nhạc")
                player.get_by_role("button", name="Tạm dừng", exact=True).click()
                page.wait_for_function("window.__audios.every(a => a.paused)")
                player.get_by_role("button", name="Phát", exact=True).click()
                page.wait_for_function("window.__audios.some(a => !a.paused && a.currentTime > 0)")
                page.get_by_role("slider", name="Tiến trình bài hát").fill("5")
                page.wait_for_function("window.__audios.some(a => a.currentTime >= 4.9)")
                page.set_viewport_size({"width": 390, "height": 844})
                self.assertTrue(player.get_by_role("button", name="Tạm dừng", exact=True).is_visible(), "Mobile player has no visible pause button")
            finally:
                print(json.dumps({"browser_errors": errors, "audio_events": page.evaluate("window.__audioEvents")}, ensure_ascii=False))
                page.evaluate("window.__audios.forEach(a => { a.pause(); a.removeAttribute('src'); a.load(); })")
                browser.close()
            self.assertEqual([], errors)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--song')
    args, remaining = parser.parse_known_args()
    if args.song:
        os.environ['PLAYER_TEST_SONG'] = args.song
    unittest.main(argv=[sys.argv[0], *remaining])
