"""Real browser layout check: the home page shows Album Hot, trending artists and playlists in ONE row at every
width. Run with the locally running frontend (and backend). No credentials needed, nothing is edited.

    python tests/browser/home_one_row.py --base http://localhost:3000
"""

import argparse
import sys
import unittest

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

WIDTHS = [480, 640, 800, 1024, 1180, 1280, 1440, 1600, 1920, 2300]

# For one section (found by its heading id): the grid that holds the cards, how many columns it has right now,
# how many cards exist, and the top position of every card that is actually displayed.
PROBE = """(headingId) => {
  const heading = document.getElementById(headingId);
  if (!heading) return null;
  const section = heading.closest('section');
  const grids = [...section.querySelectorAll('div')].filter((el) => getComputedStyle(el).display === 'grid' && el.children.length > 1);
  const grid = grids[0];
  if (!grid) return null;
  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const cards = [...grid.children];
  const visible = cards.filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0);
  return {
    columns,
    total: cards.length,
    visible: visible.length,
    tops: visible.map((el) => Math.round(el.getBoundingClientRect().top)),
    right: Math.max(...visible.map((el) => el.getBoundingClientRect().right)),
    gridRight: grid.getBoundingClientRect().right,
  };
}"""

SECTIONS = {
    'Album Hot': 'album-hot-heading',
    'Nghệ Sĩ Thịnh Hành': 'trending-artists-heading',
    'Playlist nổi bật': 'top-playlists-heading',
    'Playlist Melodify': 'all-playlists-heading',
}


class HomeOneRowTest(unittest.TestCase):
    base = 'http://localhost:3000'

    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        try:
            cls.browser = cls.pw.chromium.launch()
        except Exception:
            cls.browser = cls.pw.chromium.launch(channel='chrome')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def measure(self, width):
        page = self.browser.new_page(viewport={'width': width, 'height': 1000})
        try:
            page.goto(f'{self.base}/home', wait_until='networkidle', timeout=120_000)
            page.wait_for_selector('#album-hot-heading', timeout=60_000)
            found = {}
            for name, heading in SECTIONS.items():
                page.locator(f'#{heading}').scroll_into_view_if_needed(timeout=10_000) if page.locator(f'#{heading}').count() else None
                found[name] = page.evaluate(PROBE, heading)
            return found
        finally:
            page.close()

    def test_every_section_is_a_single_row_at_every_width(self):
        problems = []
        for width in WIDTHS:
            for name, data in self.measure(width).items():
                if data is None:
                    if name in ('Album Hot', 'Nghệ Sĩ Thịnh Hành'):
                        problems.append(f'{width}px: {name} not found')
                    continue
                label = f'{width}px {name}: columns={data["columns"]} total={data["total"]} visible={data["visible"]} tops={data["tops"]}'
                print(label)
                if data['visible'] == 0:
                    problems.append(f'{label} -> nothing visible')
                    continue
                if len(set(data['tops'])) != 1:
                    problems.append(f'{label} -> more than one row')
                if data['visible'] != min(data['columns'], data['total']):
                    problems.append(f'{label} -> expected {min(data["columns"], data["total"])} visible')
                if data['right'] > data['gridRight'] + 1:
                    problems.append(f'{label} -> overflows its container')
        self.assertEqual([], problems, '\n'.join(problems))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default=HomeOneRowTest.base)
    args, rest = parser.parse_known_args()
    HomeOneRowTest.base = args.base.rstrip('/')
    unittest.main(argv=[sys.argv[0], *rest], verbosity=2)
