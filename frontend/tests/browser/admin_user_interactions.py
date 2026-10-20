"""Authenticated browser regression suite against isolated MongoDB collections.

Requires the frontend on :3000. Starts/stops its own PHP test server on :8001.
Cloudinary uploads and outgoing HTTP are isolated by Backend/tests/Browser.
"""

import base64
import json
import math
import os
from pathlib import Path
import secrets
import struct
import subprocess
import sys
import time
import unittest
import urllib.request
import wave

from playwright.sync_api import sync_playwright, expect
from player_interactions import AUDIO_PROBE

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "Backend"
ADMIN = "http://127.0.0.1:8001"
FRONTEND = "http://localhost:3000"
PASSWORD = "BrowserTest!2026"


class AuthenticatedInteractions(unittest.TestCase):
    network = []

    @classmethod
    def observe_context(cls, context):
        def finished(request):
            from urllib.parse import urlsplit
            path = urlsplit(request.url).path
            if not path.startswith(('/admin/', '/api/')):
                return
            response = request.response()
            if response:
                cls.network.append({'method': request.method, 'path': path, 'status': response.status,
                    'duration_ms': round(request.timing['responseEnd']),
                    'server_timing': response.headers.get('server-timing')})
        context.on('requestfinished', finished)

    @staticmethod
    def close_context(context):
        context.unroute_all(behavior='ignoreErrors')
        context.close()

    @classmethod
    def setUpClass(cls):
        cls.env = {**os.environ, "MELODIFY_BROWSER_TEST_ID": secrets.token_hex(8)}
        result = subprocess.run(["rtk", "proxy", "php", "tests/Browser/fixtures.php"], cwd=BACKEND, env=cls.env, capture_output=True, text=True, encoding="utf-8", check=True)
        try:
            cls.fixtures = json.loads(result.stdout)
        except ValueError:
            raise RuntimeError(result.stdout + result.stderr)
        cls.directory = Path(cls.fixtures["directory"])
        cls.addClassCleanup(cls.cleanup_fixtures)
        with wave.open(str(cls.directory / "files/tone.wav"), "wb") as audio:
            audio.setparams((1, 2, 22050, 0, "NONE", "not compressed"))
            audio.writeframes(b"".join(struct.pack("<h", int(1500 * math.sin(2 * math.pi * 440 * i / 22050))) for i in range(22050 * 12)))
        (cls.directory / "files/cover.png").write_bytes(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1sAAAAASUVORK5CYII="))
        cls.serverlog = open(cls.directory / "server.log", "w", encoding="utf-8")
        cls.server = subprocess.Popen(["rtk", "proxy", "php", "-S", "127.0.0.1:8001", "-t", "public", "tests/Browser/router.php"], cwd=BACKEND, env=cls.env, stdout=cls.serverlog, stderr=subprocess.STDOUT)
        cls.addClassCleanup(cls.stop_server)
        for _ in range(100):
            try:
                urllib.request.urlopen(ADMIN + "/up", timeout=1)
                break
            except Exception:
                time.sleep(.1)
        else:
            raise RuntimeError("Test server did not start: " + (cls.directory / "server.log").read_text())
        cls.pw = sync_playwright().start()
        cls.addClassCleanup(cls.pw.stop)
        cls.browser = cls.pw.chromium.launch(headless=True)
        cls.addClassCleanup(cls.browser.close)
        cls.admin_context = cls.browser.new_context()
        cls.observe_context(cls.admin_context)
        login = cls.admin_context.new_page()
        login.goto(ADMIN + "/admin/login")
        login.locator('[name="email"]').fill("browser-admin@example.test")
        login.locator('[name="password"]').fill(PASSWORD)
        login.locator('button[type="submit"]').click()
        expect(login).to_have_url(ADMIN + "/admin/dashboard")
        login.close()

    @classmethod
    def stop_server(cls):
        # Stop only the process tree started by this test, never existing dev servers.
        if cls.server.poll() is None:
            subprocess.run(["rtk", "proxy", "taskkill", "/PID", str(cls.server.pid), "/T", "/F"], capture_output=True)
        cls.serverlog.close()

    @classmethod
    def cleanup_fixtures(cls):
        if hasattr(cls, 'directory'):
            (cls.directory / 'network.json').write_text(json.dumps(cls.network, ensure_ascii=False, indent=2), encoding='utf-8')
        subprocess.run(["rtk", "proxy", "php", "tests/Browser/fixtures.php", "cleanup"], cwd=BACKEND, env=cls.env, capture_output=True, check=True)
        # Temporary artifacts stay available for diagnosis; only the isolated DB is dropped.

    def setUp(self):
        self.page = self.admin_context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        self.addCleanup(self.page.close)

    def test_00_artist_section_uses_real_catalog_songs_before_weekly_activity(self):
        context = self.browser.new_context()
        self.observe_context(context)
        self.addCleanup(self.close_context, context)

        def proxy(route):
            response = route.fetch(url=route.request.url.replace("http://localhost:8000", ADMIN).replace("http://127.0.0.1:8000", ADMIN))
            route.fulfill(response=response)

        context.route("**/api/**", proxy)
        page = context.new_page()
        page.goto(FRONTEND + '/home')
        section = page.locator('section[aria-labelledby="trending-artists-heading"]')
        expect(section.get_by_text('Browser Artist', exact=True).first).to_be_visible()
        expect(section.get_by_text('Browser Fixture Song', exact=True)).to_be_visible()
        expect(section.get_by_text('Gợi ý nghệ sĩ có bài hát đã phát hành trên Melodify.')).to_be_visible()
        section.get_by_role('link', name='Thêm', exact=True).click()
        expect(page.get_by_role('heading', name='Nghệ sĩ nổi bật', exact=True)).to_be_visible()
        expect(page.get_by_role('heading', name='Browser Fixture Song', exact=True)).to_be_visible()
        for width in [390, 1440]:
            page.set_viewport_size({'width': width, 'height': 900})
            self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Fallback overflow at {width}')
            page.screenshot(path=str(self.directory / f'artist-fallback-{width}.png'), full_page=True)

    def test_01_admin_pages_and_form_rendering(self):
        self.page.goto(ADMIN + "/admin/dashboard")
        paths = self.page.locator('a[href*="/admin/"]').evaluate_all("els => [...new Set(els.map(a => new URL(a.href).pathname))]")
        for path in paths:
            if path.endswith("logout"):
                continue
            with self.subTest(path=path):
                started = time.perf_counter()
                response = self.page.goto(ADMIN + path)
                elapsed = round((time.perf_counter() - started) * 1000)
                self.assertLess(response.status, 400, path)
                print(json.dumps({"admin_page": path, "navigation_ms": elapsed}))
        for resource in ["songs", "artists", "albums", "topics", "genres", "playlists", "banners", "videos", "subscriptions", "admins"]:
            with self.subTest(create=resource):
                response = self.page.goto(f"{ADMIN}/admin/{resource}/create")
                self.assertLess(response.status, 400, resource)
                fields = self.page.locator('form input, form select, form textarea').evaluate_all("els => els.filter(e => e.type !== 'hidden').map(e => ({name:e.name,type:e.type,required:e.required,options:e.tagName==='SELECT'?[...e.options].map(o=>({value:o.value,text:o.text})):undefined}))")
                print(json.dumps({"form": resource, "field_count": len(fields)}, ensure_ascii=False))
        self.assertEqual([], self.errors)

    def test_02_song_create_edit_upload_and_delete(self):
        page = self.page
        page.goto(ADMIN + "/admin/songs/create")
        page.locator('[name="title"]').fill("Browser Upload Song")
        page.locator('[name="slug"]').fill("browser-upload-song")
        page.locator('[name="artist_name"]').fill("Browser Artist")
        page.locator('[name="status"]').select_option("published")
        m4a = Path(os.getenv('M4A_TEST_FILE', r'C:\Users\thait\Downloads\Thằng Hầu Remix - Hot TikTok.m4a'))
        page.locator('[name="audio_file"]').set_input_files(m4a if m4a.is_file() else self.directory / "files/tone.wav")
        expect(page.locator('[name="duration_seconds"]')).not_to_have_value('')
        page.locator('[name="cover_image_file"]').set_input_files(self.directory / "files/cover.png")
        page.locator('form.admin-resource-form button[type="submit"]').click()
        expect(page).to_have_url(ADMIN + "/admin/songs")
        row = page.locator('tr').filter(has_text="Browser Upload Song")
        expect(row).to_be_visible()
        edit = row.locator('a[href$="/edit"]').get_attribute("href")
        page.goto(edit)
        page.locator('[name="title"]').fill("Browser Upload Song Updated")
        page.locator('form.admin-resource-form button[type="submit"]').click()
        expect(page).to_have_url(ADMIN + "/admin/songs")
        api = page.request.get(ADMIN + "/api/v1/songs/browser-upload-song")
        self.assertEqual(200, api.status)
        data = api.json()["data"]
        self.assertEqual("Browser Upload Song Updated", data["title"])
        self.assertIn("/_browser/files/", data["audio_url"])
        row = page.locator('tr').filter(has_text="Browser Upload Song Updated")
        print(json.dumps({"song_row_controls": row.locator('button').evaluate_all("els=>els.map(e=>({text:e.innerText,title:e.title,aria:e.getAttribute('aria-label'),type:e.type}))")}, ensure_ascii=False))
        page.screenshot(path=str(self.directory / "song-updated.png"))
        delete_form = row.locator('form').filter(has=page.locator('input[name="_method"][value="DELETE"]'))
        page.on("dialog", lambda dialog: dialog.accept())
        delete_form.locator('button').click()
        # The UI uses a custom confirmation dialog, not a native confirm.
        confirm = page.get_by_role("button", name="Xóa vĩnh viễn", exact=True)
        if confirm.count() and confirm.last.is_visible():
            confirm.last.click()
        expect(page.locator('tr').filter(has_text="Browser Upload Song Updated")).to_have_count(0)
        self.assertEqual(404, page.request.get(ADMIN + "/api/v1/songs/browser-upload-song").status)
        self.assertEqual([], self.errors)

    def test_03_user_login_favorite_follow_playlist_logout(self):
        context = self.browser.new_context()
        self.observe_context(context)
        self.addCleanup(self.close_context, context)
        def proxy(route):
            response = route.fetch(url=route.request.url.replace("http://localhost:8000", ADMIN).replace("http://127.0.0.1:8000", ADMIN))
            route.fulfill(response=response)
        context.route("**/api/**", proxy)
        page = context.new_page()
        page.goto(FRONTEND + "/home")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="Đăng nhập", exact=True).first.click()
        print(json.dumps({"login_inputs": page.get_by_role('dialog').locator('input').evaluate_all("els=>els.map(e=>({type:e.type,name:e.name,placeholder:e.placeholder}))")}, ensure_ascii=False))
        page.get_by_role('dialog').locator('input[type="password"]').fill(PASSWORD)
        page.get_by_role('dialog').locator('input:not([type="password"]):not([type="checkbox"])').first.fill("browser-user@example.test")
        page.get_by_role('dialog').get_by_role('checkbox').last.check()
        page.get_by_role('dialog').get_by_role("button", name="Đăng nhập", exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        page.goto(FRONTEND + "/me")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_text("Browser Test User", exact=True).first).to_be_visible()
        print(json.dumps({"profile_buttons": page.get_by_role('button').evaluate_all("els=>els.map(e=>({text:e.innerText,aria:e.getAttribute('aria-label')}))")}, ensure_ascii=False))
        page.screenshot(path=str(self.directory / "user-profile.png"))
        page.get_by_role('button', name='Tạo playlist', exact=True).first.click()
        dialog = page.get_by_role('dialog')
        dialog.get_by_label('Tên playlist', exact=True).fill('Browser Personal Playlist')
        dialog.get_by_role('button', name='Tạo playlist', exact=True).click()
        expect(page.get_by_role('heading', name='Browser Personal Playlist', exact=True)).to_be_visible()
        personal_url = page.url
        page.goto(FRONTEND + '/artist/browser-artist')
        page.get_by_role('button', name='Theo dõi', exact=True).first.click()
        expect(page.get_by_role('button', name='Đang theo dõi', exact=True).first).to_be_visible()
        page.reload()
        expect(page.get_by_role('button', name='Đang theo dõi', exact=True).first).to_be_visible()
        page.goto(FRONTEND + '/playlist/browser-fixture-playlist')
        page.get_by_role('button', name='Thêm playlist vào yêu thích', exact=True).click()
        expect(page.get_by_role('button', name='Bỏ yêu thích playlist', exact=True)).to_be_visible()
        options = page.get_by_role('button', name='Tùy chọn bài Browser Fixture Song', exact=True)
        options.locator('..').hover()
        options.click()
        page.get_by_role('menuitem', name='Thêm vào playlist', exact=True).click()
        page.get_by_role('dialog').get_by_role('radio', name='Browser Personal Playlist').check()
        page.get_by_role('dialog').get_by_role('button', name='Thêm bài hát', exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        page.goto(personal_url)
        expect(page.get_by_text('Browser Fixture Song', exact=True).first).to_be_visible()
        page.reload()
        expect(page.get_by_text('Browser Fixture Song', exact=True).first).to_be_visible()
        page.get_by_role("button", name="Đăng xuất", exact=True).click()
        expect(page.get_by_role("button", name="Đăng nhập", exact=True).first).to_be_visible()

    def test_04_catalog_crud_forms(self):
        page = self.page
        for resource in os.getenv('CRUD_RESOURCES', 'artists,topics,genres,playlists,albums,banners,videos,subscriptions').split(','):
            with self.subTest(resource=resource):
                name = 'Browser CRUD ' + resource.title()
                slug = 'browser-crud-' + resource
                page.goto(f'{ADMIN}/admin/{resource}/create')
                form = page.locator('form.admin-resource-form')
                expect(form).to_be_visible()
                form.locator('button[type="submit"]').click()
                self.assertTrue(page.url.endswith('/create'), 'Empty form should not save')
                field_name = 'title' if form.locator('[name="title"]').count() else 'name'
                form.locator(f'[name="{field_name}"]').fill(name)
                if form.locator('[name="slug"]').count():
                    form.locator('[name="slug"]').fill(slug)
                if form.locator('[name="sort_order"]').count():
                    form.locator('[name="sort_order"]').fill('1')
                if form.locator('[name="image"]').count():
                    form.locator('[name="image"]').set_input_files(self.directory / 'files/cover.png')
                if resource == 'albums':
                    form.locator('[name="artist_ids[]"]').first.check()
                    form.locator('[name="song_ids[]"]').first.check()
                if resource in ['albums']:
                    form.locator('[name="status"]').select_option('published')
                elif resource == 'admins':
                    form.locator('[name="email"]').fill('browser-secondary@example.com')
                    form.locator('[name="role"]').select_option('admin')
                elif resource == 'videos':
                    form.locator('[name="video_url"]').fill(ADMIN + '/_browser/files/tone.wav')
                    form.locator('[name="artist_names"]').fill('Browser Artist')
                elif resource == 'subscriptions':
                    form.locator('[name="code"]').fill('BROWSERTEST')
                    form.locator('#plan-price-display').fill('10000')
                    form.locator('[name="billing_months"]').fill('1')
                started = time.perf_counter()
                form.locator('button[type="submit"]').click()
                page.wait_for_load_state('load')
                self.assertEqual(f'{ADMIN}/admin/{resource}', page.url, page.locator('.admin-field-error').all_text_contents())
                created_ms = round((time.perf_counter() - started) * 1000)
                row = page.locator('tr').filter(has_text=name)
                expect(row).to_be_visible()
                edit = row.locator('a[href$="/edit"]').get_attribute('href')
                page.goto(edit)
                page.locator(f'form.admin-resource-form [name="{field_name}"]').fill(name + ' Updated')
                started = time.perf_counter()
                page.locator('form.admin-resource-form button[type="submit"]').click()
                expect(page).to_have_url(f'{ADMIN}/admin/{resource}')
                updated_ms = round((time.perf_counter() - started) * 1000)
                row = page.locator('tr').filter(has_text=name + ' Updated')
                expect(row).to_be_visible()
                started = time.perf_counter()
                row.locator('form').filter(has=page.locator('input[name="_method"][value="DELETE"]')).locator('button').click()
                dialog = page.get_by_role('dialog')
                if dialog.count() and dialog.is_visible():
                    dialog.get_by_role('button', name='Xóa vĩnh viễn', exact=True).click()
                expect(page.locator('tr').filter(has_text=name + ' Updated')).to_have_count(0)
                deleted_ms = round((time.perf_counter() - started) * 1000)
                print(json.dumps({'crud': resource, 'create_ms': created_ms, 'update_ms': updated_ms, 'delete_ms': deleted_ms}))
        self.assertEqual([], self.errors)

    def test_05_password_recovery_form(self):
        context = self.browser.new_context()
        self.observe_context(context)
        self.addCleanup(self.close_context, context)
        def proxy(route):
            response = route.fetch(url=route.request.url.replace('http://localhost:8000', ADMIN).replace('http://127.0.0.1:8000', ADMIN))
            route.fulfill(response=response)
        context.route('**/api/**', proxy)
        page = context.new_page()
        page.goto(FRONTEND + '/home')
        page.get_by_role('button', name='Đăng nhập', exact=True).first.click()
        page.get_by_role('button', name='Quên mật khẩu?', exact=True).click()
        dialog = page.get_by_role('dialog', name='Khôi phục mật khẩu', exact=True)
        dialog.get_by_label('Email', exact=True).fill('browser-user@example.test')
        dialog.get_by_role('button', name='Gửi mã xác thực', exact=True).click()
        expect(dialog.get_by_label('Mã OTP', exact=True)).to_be_visible(timeout=20000)
        page.screenshot(path=str(self.directory / 'password-reset.png'))
        otp = (self.directory / 'otp.txt').read_text()
        dialog.get_by_label('Mã OTP', exact=True).fill(otp)
        dialog.get_by_role('button', name='Xác thực mã', exact=True).click()
        dialog.get_by_label('Mật khẩu mới', exact=True).fill('ChangedBrowser!2026')
        dialog.get_by_label('Xác nhận mật khẩu', exact=True).fill('ChangedBrowser!2026')
        dialog.get_by_role('button', name='Đặt lại mật khẩu', exact=True).click()
        expect(dialog.get_by_role('status')).to_have_text('Đặt lại mật khẩu thành công.')
        dialog.get_by_role('button', name='Quay lại đăng nhập', exact=True).click()
        page.get_by_role('dialog').get_by_role('textbox').first.fill('browser-user@example.test')
        page.get_by_role('dialog').locator('input[type="password"]').fill('ChangedBrowser!2026')
        page.get_by_role('dialog').get_by_role('checkbox').last.check()
        page.get_by_role('dialog').get_by_role('button', name='Đăng nhập', exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)

    def test_06_player_queue_volume_repeat_error_and_mobile(self):
        context = self.browser.new_context()
        self.observe_context(context)
        self.addCleanup(self.close_context, context)
        def proxy(route):
            response = route.fetch(url=route.request.url.replace('http://localhost:8000', ADMIN).replace('http://127.0.0.1:8000', ADMIN))
            route.fulfill(response=response)
        context.route('**/api/**', proxy)
        page = context.new_page()
        page.add_init_script(AUDIO_PROBE)
        page.goto(FRONTEND + '/playlist/browser-fixture-playlist')
        button = page.get_by_role('button', name='Phát Browser Fixture Song', exact=True)
        button.locator('..').hover()
        started = page.evaluate('performance.now()')
        button.click()
        page.wait_for_function('window.__audios.some(a => !a.paused && a.currentTime > 0)')
        events = page.evaluate('window.__audioEvents')
        playing = next(e for e in events if e['name'] == 'playing' and e['at'] >= started)
        print(json.dumps({'local_audio_click_to_playing_ms': round(playing['at'] - started)}))
        player = page.get_by_role('region', name='Trình phát nhạc')
        player.get_by_role('button', name='Phát ngẫu nhiên', exact=True).click()
        expect(player.get_by_role('button', name='Phát ngẫu nhiên', exact=True)).to_have_attribute('aria-pressed', 'true')
        player.get_by_role('button', name='Lặp lại', exact=True).click()
        expect(player.get_by_role('button', name='Lặp lại', exact=True)).to_have_attribute('aria-pressed', 'true')
        player.get_by_role('button', name='Lặp lại', exact=True).click()
        expect(player.get_by_role('button', name='Lặp lại một bài', exact=True)).to_have_attribute('aria-pressed', 'true')
        player.get_by_role('button', name='Âm lượng', exact=True).click()
        page.get_by_role('slider', name='Mức âm lượng', exact=True).fill('0.25')
        self.assertEqual(.25, page.evaluate('window.__audios.at(-1).volume'))
        page.get_by_role('button', name='Tắt âm thanh', exact=True).click()
        self.assertEqual(0, page.evaluate('window.__audios.at(-1).volume'))
        player.get_by_role('button', name='Danh sách phát', exact=True).click()
        expect(page.get_by_role('region', name='Hàng đợi phát nhạc')).to_be_visible()
        page.get_by_role('region', name='Hàng đợi phát nhạc').get_by_role('button', name='1 Browser Fixture Song').click()
        page.get_by_role('button', name='Đóng bảng điều khiển').click()
        player.get_by_role('link', name='Lời bài hát').click()
        expect(page.locator('#lyrics')).to_be_visible()
        page.set_viewport_size({'width': 390, 'height': 844})
        expect(player.get_by_role('button', name='Tạm dừng', exact=True)).to_be_visible()
        player.get_by_role('button', name='Tạm dừng', exact=True).click()
        page.wait_for_function('window.__audios.every(a => a.paused)')
        page.screenshot(path=str(self.directory / 'player-mobile.png'))
        # A failed media request must show an actionable error, not spin forever.
        page.route('**/_browser/files/tone.wav*', lambda route: route.fulfill(status=404, body='missing'))
        page.evaluate("window.__audios.at(-1).src = 'http://127.0.0.1:8001/_browser/files/tone.wav?failure=1'; window.__audios.at(-1).load()")
        expect(page.get_by_role('status').filter(has_text='Không tải được âm thanh')).to_be_visible()

    def test_07_admin_profile_preferences_users_and_moderation(self):
        page = self.page
        page.goto(ADMIN + '/admin/profile')
        form = page.locator('form.admin-profile-form')
        form.locator('[name="name"]').fill('Browser Admin Updated')
        form.locator('[name="avatar_file"]').set_input_files(self.directory / 'files/cover.png')
        form.get_by_role('button', name='Lưu hồ sơ', exact=True).click()
        page.reload()
        expect(page.locator('[name="name"]')).to_have_value('Browser Admin Updated')
        page.get_by_role('button', name='Xóa ảnh đại diện', exact=True).click()
        expect(page.get_by_role('button', name='Xóa ảnh đại diện', exact=True)).to_have_count(0)
        page.goto(ADMIN + '/admin/account-settings')
        appearance = page.locator('form[data-appearance-form]')
        appearance.locator('[name="density"]').select_option('compact')
        appearance.get_by_role('button', name='Lưu giao diện').click()
        page.reload()
        expect(page.locator('[name="density"]')).to_have_value('compact')
        notifications = page.locator('form[data-settings-form]')
        notifications.locator('input[type="checkbox"][name="weekly_summary"]').check()
        notifications.get_by_role('button', name='Lưu thông báo').click()
        page.reload()
        expect(page.locator('input[type="checkbox"][name="weekly_summary"]')).to_be_checked()
        page.goto(f'{ADMIN}/admin/users/{self.fixtures["user_id"]}/edit')
        form = page.locator('form.admin-resource-form')
        form.locator('[name="name"]').fill('Browser User Updated')
        form.locator('[name="slug"]').fill('browser-user-updated')
        form.locator('button[type="submit"]').click()
        expect(page.locator('tr').filter(has_text='Browser User Updated')).to_be_visible()
        page.goto(ADMIN + '/admin/comments')
        row = page.locator('tr').filter(has_text='Browser fixture comment')
        row.get_by_role('button', name='Ẩn', exact=True).click()
        expect(row.get_by_role('button', name='Hiện', exact=True)).to_be_visible()
        row.get_by_role('button', name='Hiện', exact=True).click()
        expect(row.get_by_role('button', name='Ẩn', exact=True)).to_be_visible()
        row.get_by_role('button', name='Xóa', exact=True).click()
        page.get_by_role('dialog').get_by_role('button', name='Xóa vĩnh viễn').click()
        expect(row).to_have_count(0)
        page.goto(ADMIN + '/admin/reports')
        row = page.locator('tr').filter(has_text='Browser fixture report')
        row.get_by_role('combobox').select_option('resolved')
        row.get_by_role('button', name='Lưu', exact=True).click()
        page.reload()
        expect(row.get_by_role('combobox')).to_have_value('resolved')
        self.assertEqual([], self.errors)

    def test_09_trending_uses_real_profile_visits_and_has_a_song_at_every_size(self):
        context = self.browser.new_context()
        self.addCleanup(self.close_context, context)
        self.observe_context(context)
        errors = []
        context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))

        def proxy(route):
            response = route.fetch(url=route.request.url.replace("http://localhost:8000", ADMIN).replace("http://127.0.0.1:8000", ADMIN))
            route.fulfill(response=response)

        context.route("**/api/**", proxy)
        # This is a genuine play event in the test-only database, not a UI fixture.
        response = context.request.post(ADMIN + '/api/v1/songs/browser-fixture-song/view', data={'visitor_id': 'trending-browser'})
        self.assertTrue(response.ok)
        page = context.new_page()
        with page.expect_response(lambda response: '/artists/' in response.url and response.url.endswith('/view')) as recorded:
            page.goto(FRONTEND + '/artist/browser-artist')
        self.assertTrue(recorded.value.json()['recorded'])
        expect(page.get_by_role('heading', name='Browser Artist', exact=True)).to_be_visible()

        page.goto(FRONTEND + '/home')
        section = page.locator('section[aria-labelledby="trending-artists-heading"]')
        expect(section.get_by_text('Browser Artist', exact=True).first).to_be_visible()
        expect(section.get_by_text('Browser Fixture Song', exact=True)).to_be_visible()
        self.assertNotIn('Chưa có bài hát nổi bật', section.inner_text())
        section.get_by_role('link', name='Thêm', exact=True).click()
        expect(page).to_have_url(FRONTEND + '/trending-artist')
        expect(page.get_by_role('heading', name='Browser Artist', exact=True)).to_be_visible()
        expect(page.get_by_role('heading', name='Browser Fixture Song', exact=True)).to_be_visible()
        for width in [390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 900})
            page.wait_for_load_state('networkidle')
            self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Overflow at {width}')
            self.assertNotIn('Chưa có bài hát nổi bật', page.locator('main').inner_text())
            follow_button = page.get_by_role('button', name='Theo dõi', exact=True)
            if width == 390:
                expect(follow_button).to_have_css('opacity', '1')
                expect(page.get_by_role('heading', name='Browser Artist', exact=True)).to_have_css('white-space', 'normal')
            elif width == 1440:
                expect(follow_button).to_have_css('opacity', '0')
                page.get_by_role('heading', name='Browser Artist', exact=True).hover()
                expect(follow_button).to_have_css('opacity', '1')
            page.screenshot(path=str(self.directory / f'trending-{width}.png'), full_page=True)
        self.assertEqual([], errors)

    def test_10_home_empty_error_and_return_navigation_do_not_replay_sample_or_old_data(self):
        context = self.browser.new_context()
        self.addCleanup(self.close_context, context)
        pending = []
        errors = []
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))

        def proxy(route):
            if route.request.url.endswith('/v1/home/bootstrap'):
                pending.append(route)
                return
            response = route.fetch(url=route.request.url.replace("http://localhost:8000", ADMIN).replace("http://127.0.0.1:8000", ADMIN))
            route.fulfill(response=response)

        context.route('**/api/**', proxy)

        def next_bootstrap():
            for _ in range(100):
                if pending:
                    return pending.pop()
                page.wait_for_timeout(50)
            self.fail('Home did not request current API data')

        page.goto(FRONTEND + '/home', wait_until='domcontentloaded')
        expect(page.get_by_role('status', name='Đang tải nội dung khám phá')).to_be_visible()
        expect(page.locator('section[aria-labelledby="home-topics-heading"] a[href^="/playlist?"]')).to_have_count(0)
        held = next_bootstrap()
        response = held.fetch(url=ADMIN + '/api/v1/home/bootstrap')
        payload = response.json()
        # Controlled API snapshots exist only in this regression test.
        payload['data']['topics'] = []
        payload['data']['genres'] = []
        payload['data']['discovery']['single_new_releases'][0]['title'] = 'API snapshot first'
        held.fulfill(response=response, json=payload)
        expect(page.get_by_text('API snapshot first', exact=True)).to_be_visible()
        expect(page.get_by_text('Chưa có chủ đề.', exact=True)).to_be_visible()

        def return_home():
            page.locator('section[aria-labelledby="home-topics-heading"]').get_by_role('link', name='Thêm', exact=True).click()
            expect(page).to_have_url(FRONTEND + '/topic')
            with page.expect_request('**/api/v1/home/bootstrap'):
                page.get_by_role('link', name='Khám phá', exact=True).click()
            expect(page.get_by_role('status', name='Đang tải nội dung khám phá')).to_be_visible()

        return_home()
        expect(page.get_by_text('API snapshot first', exact=True)).to_have_count(0)
        payload['data']['discovery']['single_new_releases'][0]['title'] = 'API snapshot second'
        next_bootstrap().fulfill(response=response, json=payload)
        expect(page.get_by_text('API snapshot second', exact=True)).to_be_visible()

        return_home()
        empty = {'data': {'banners': [], 'charts': [], 'topics': [], 'genres': [], 'albums': [], 'playlists': [],
            'discovery': {'single_new_releases': [], 'popular_songs': []}, 'trending_artists': []}, 'meta': payload['meta']}
        next_bootstrap().fulfill(response=response, json=empty)
        expect(page.get_by_text('Chưa có chủ đề.', exact=True)).to_be_visible()
        expect(page.get_by_text('API snapshot second', exact=True)).to_have_count(0)
        expect(page.get_by_text('Chưa có nghệ sĩ có bài hát đã phát hành để hiển thị.', exact=True)).to_be_visible()
        page.screenshot(path=str(self.directory / 'home-empty.png'), full_page=True)

        return_home()
        next_bootstrap().fulfill(response=response, status=503, json={'message': 'Controlled test outage'})
        expect(page.get_by_text('Không thể tải chủ đề lúc này.', exact=True)).to_be_visible()
        expect(page.get_by_text('Không thể tải nội dung khám phá lúc này.', exact=True)).to_be_visible()
        expect(page.locator('section[aria-labelledby="home-topics-heading"] a[href^="/playlist?"]')).to_have_count(0)
        page.screenshot(path=str(self.directory / 'home-error.png'), full_page=True)
        self.assertEqual([], errors)

    def test_08_admin_password_and_logout(self):
        page = self.page
        page.goto(ADMIN + '/admin/account-settings')
        form = page.locator('form#security')
        form.locator('[name="current_password"]').fill('wrong-password')
        form.locator('[name="password"]').fill('NewAdminPassword!2026')
        form.locator('[name="password_confirmation"]').fill('NewAdminPassword!2026')
        form.get_by_role('button', name='Cập nhật mật khẩu').click()
        expect(page.get_by_role('alert').filter(has_text='Mật khẩu hiện tại không chính xác.')).to_be_visible()
        form.locator('[name="current_password"]').fill(PASSWORD)
        form.locator('[name="password"]').fill('NewAdminPassword!2026')
        form.locator('[name="password_confirmation"]').fill('NewAdminPassword!2026')
        form.get_by_role('button', name='Cập nhật mật khẩu').click()
        page.get_by_role('button', name='Tài khoản cá nhân', exact=True).click()
        page.get_by_role('button', name='Đăng xuất', exact=True).click()
        expect(page).to_have_url(ADMIN + '/admin/login')
        page.locator('[name="email"]').fill('browser-admin@example.test')
        page.locator('[name="password"]').fill('NewAdminPassword!2026')
        page.locator('button[type="submit"]').click()
        expect(page).to_have_url(ADMIN + '/admin/dashboard')


if __name__ == "__main__":
    unittest.main()
