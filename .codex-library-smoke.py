import json
import sys
import time
from urllib.request import urlopen
from urllib.parse import quote, urlparse
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding='utf-8')
BASE = 'http://localhost:3000'
API = 'http://localhost:8000/api/v1'

def get(path):
    with urlopen(API + path, timeout=40) as response:
        return json.load(response)

catalog = {name: get('/' + name + '?per_page=1')['data'][0] for name in ['songs', 'albums', 'playlists', 'artists', 'topics']}
catalog['songs'] = get('/search?q=thai%20hoc&type=song&limit=1')['data']['song'][0]
paths = ['/', '/home', '/me', '/following', '/followers', '/favorite', '/recent', '/upload', '/album', '/playlist', '/topic', '/charts', '/trending-artist', '/mua-vip', '/mua-vip/lich-su-giao-dich', '/mua-vip/thanh-toan', '/search?key=thai&t=all']
for kind, plural in [('song', 'songs'), ('album', 'albums'), ('playlist', 'playlists'), ('artist', 'artists'), ('topic', 'topics')]:
    item = catalog[plural]
    paths.append('/' + kind + '/' + quote(item.get('slug') or item['id']))
chart = get('/charts')['data'][0]
paths.append('/charts/' + quote(chart['slug']))
people = get('/search?q=thai&type=user')['data']['user']
if people:
    paths.append('/user/' + people[0]['id'])

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    errors = []
    failed_api = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failed_api.append({'url': response.url, 'status': response.status}) if '/api/' in response.url and response.status >= 400 else None)
    results = []
    for path in paths:
        start = time.perf_counter()
        try:
            response = page.goto(BASE + path, wait_until='domcontentloaded', timeout=60000)
            page.wait_for_load_state('networkidle', timeout=12000)
            results.append({'path': path, 'status': response.status, 'ms': round((time.perf_counter() - start) * 1000), 'alerts': page.get_by_role('alert').all_text_contents()})
        except Exception as error:
            results.append({'path': path, 'error': str(error).splitlines()[0]})
        print(json.dumps(results[-1], ensure_ascii=False), flush=True)
    page.goto(BASE + '/home')
    page.wait_for_load_state('networkidle')
    page.get_by_role('combobox', name='Tìm kiếm').fill('thai')
    expect(page.get_by_role('listbox', name='Gợi ý tìm kiếm').get_by_role('option').first).to_be_visible(timeout=20000)
    page.get_by_role('combobox', name='Tìm kiếm').press('Enter')
    expect(page).to_have_url(BASE + '/search?key=thai&t=all')
    expect(page.get_by_role('heading', name='Kết quả tìm kiếm', exact=True)).to_be_visible()
    page.wait_for_load_state('networkidle')
    page.screenshot(path='D:/laragon/www/Melodify/.codex-search-check.png', full_page=True)
    page.get_by_role('navigation', name='Loại kết quả tìm kiếm').get_by_role('link', name='Nghệ sĩ', exact=True).click()
    expect(page).to_have_url(BASE + '/search?key=thai&t=artist')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button', name='Theo dõi', exact=True).first).to_be_visible()
    page.get_by_role('button', name='Theo dõi', exact=True).first.click()
    expect(page.get_by_role('dialog')).to_be_visible()
    print(json.dumps({'real_search': 'passed', 'page_errors': errors, 'failed_api': failed_api}, ensure_ascii=False), flush=True)
    context.close()

    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    user = {'id': 'mock-account', 'name': 'Library Test User', 'username': 'library-test', 'avatar_url': None, 'is_premium': 0, 'status': 'active'}
    context.add_init_script("localStorage.setItem('melodify_access_token','mock-token'); localStorage.setItem('melodify_auth_user'," + json.dumps(json.dumps(user)) + ");")
    playlist = get('/playlists/' + quote(catalog['playlists'].get('slug') or catalog['playlists']['id']))['data']
    album = get('/albums/' + quote(catalog['albums'].get('slug') or catalog['albums']['id']))['data']
    artist = get('/artists/' + quote(catalog['artists'].get('slug') or catalog['artists']['id']))['data']
    library = {'favorite_song_count': 2, 'created_playlists': [], 'favorite_playlists': [], 'favorite_albums': [], 'following_artists': [], 'following_users': [], 'followers': [], 'following_count': 0, 'followers_count': 0}
    writes = []
    def route_handler(route):
        path = urlparse(route.request.url).path.replace('/api/v1', '')
        method = route.request.method
        if method == 'POST':
            writes.append(path)
            body = route.request.post_data_json or {}
            if path.endswith('/follow'):
                following = body['following']
                if path.startswith('/artists/'):
                    library['following_artists'] = [artist] if following else []
                else:
                    library['following_users'] = [{'id': 'other-user', 'name': 'Other User', 'username': 'other', 'avatar_url': None}] if following else []
                library['following_count'] = len(library['following_artists']) + len(library['following_users'])
                result = {'following': following, 'followers_count': int(following)}
            elif path.endswith('/favorite'):
                key = 'favorite_playlists' if path.startswith('/playlists/') else 'favorite_albums'
                entity = playlist if path.startswith('/playlists/') else album
                library[key] = [] if library[key] else [entity]
                result = {'favorited': bool(library[key]), 'favorites': len(library[key])}
            else:
                result = {'imported': True}
        elif path == '/me/library': result = {'data': library}
        elif path.startswith('/playlists/'): result = {'data': {**playlist, 'is_favorite': bool(library['favorite_playlists'])}}
        elif path.startswith('/albums/'): result = {'data': {**album, 'is_favorite': bool(library['favorite_albums'])}}
        elif path.startswith('/artists/'): result = {'data': artist}
        elif path.startswith('/users/'): result = {'data': {'id': 'other-user', 'name': 'Other User', 'username': 'other', 'avatar_url': None, 'following_count': 0, 'followers_count': 0, 'is_following': False}}
        else:
            route.continue_(); return
        route.fulfill(status=200, content_type='application/json', body=json.dumps(result), headers={'Access-Control-Allow-Origin': '*'})
    context.route('**/api/v1/**', route_handler)
    page = context.new_page()
    page.goto(BASE + '/me')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button', name='Đăng xuất', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Yêu thích 2 bài hát')).to_be_visible()
    page.goto(BASE + '/playlist/' + quote(playlist.get('slug') or playlist['id']))
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Thêm playlist vào yêu thích').click()
    sidebar = page.locator('.sidebar-collections')
    expect(sidebar.get_by_role('link', name=playlist['name'], exact=True)).to_be_visible(timeout=10000)
    expect(page.get_by_role('button', name='Đăng xuất', exact=True)).to_have_count(0)
    page.goto(BASE + '/album/' + quote(album.get('slug') or album['id']))
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Thêm album vào yêu thích').click()
    expect(page.locator('.sidebar-collections').get_by_role('link', name=album['title'], exact=True)).to_be_visible(timeout=10000)
    page.locator('.sidebar-collections').get_by_role('link', name=playlist['name'], exact=True).hover()
    page.locator('.sidebar-collections').get_by_role('link', name=playlist['name'], exact=True).click()
    expect(page).to_have_url(BASE + '/playlist/' + quote(playlist.get('slug') or playlist['id']))
    page.goto(BASE + '/artist/' + quote(artist.get('slug') or artist['id']))
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Theo dõi', exact=True).first.click()
    expect(page.get_by_role('button', name='Đang theo dõi', exact=True).first).to_be_visible()
    page.goto(BASE + '/me')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button', name='Đang theo dõi · 1', exact=True)).to_be_visible()
    page.goto(BASE + '/following')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', name=artist['name'], exact=True)).to_be_visible()
    page.goto(BASE + '/user/other-user')
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Theo dõi', exact=True).click()
    expect(page.get_by_role('button', name='Đang theo dõi', exact=True)).to_be_visible()
    page.goto(BASE + '/me')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button', name='Đang theo dõi · 2', exact=True)).to_be_visible()
    page.screenshot(path='D:/laragon/www/Melodify/.codex-library-check.png', full_page=True)
    print(json.dumps({'mocked_ui_flows': 'passed', 'writes': writes}), flush=True)
    context.close()
    browser.close()
