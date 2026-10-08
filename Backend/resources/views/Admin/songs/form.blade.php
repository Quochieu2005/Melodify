@php($isEditing = $isEditing ?? filled($item))
<section class="admin-page admin-form-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.songs.index') }}" class="admin-back-link">← Quay lại danh sách bài hát</a>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa bài hát' : 'Thêm bài hát' }}</h1>
            <p class="admin-page-description">Nhập thông tin bài hát với thời lượng tối đa 24 giờ.</p>
        </div>
    </div>

    @if(! $isEditing)
        <div class="ant-card admin-resource-form" style="margin-bottom: 16px;">
            <div class="admin-resource-form-heading">
                <div><strong>Nhập bài hát từ NhacCuaTui</strong><span>Tìm theo tên bài hát hoặc nghệ sĩ rồi điền dữ liệu vào biểu mẫu bên dưới.</span></div>
                <span class="ant-tag ant-tag-blue">Chưa lưu</span>
            </div>
            <div class="admin-form-grid">
                <div class="admin-form-group admin-form-span">
                    <label class="admin-form-label" for="nct-search">Tên bài hát hoặc nghệ sĩ</label>
                    <div class="admin-slug-input-row">
                        <input id="nct-search" class="ant-input admin-form-input" maxlength="100" placeholder="Ví dụ: Adele, Sơn Tùng M-TP...">
                        <button type="button" class="ant-btn ant-btn-primary" data-nct-search>Tìm bài hát</button>
                    </div>
                    <p class="admin-field-help">Chọn một bài chỉ điền dữ liệu vào biểu mẫu. Bài hát, nghệ sĩ, audio và lời chỉ được lưu khi bạn bấm <strong>Tạo bài hát</strong>.</p>
                    <p class="admin-field-help">Album, Thể loại, Chủ đề và Playlist chỉ dùng dữ liệu đã có trong Admin; API không tự tạo hoặc tự gắn các mục này.</p>
                </div>
            </div>
            <div data-nct-results aria-live="polite"></div>
        </div>
    @endif

    <form method="POST" action="{{ $isEditing ? route('admin.songs.update', $item->getKey()) : route('admin.songs.store') }}" class="ant-card admin-resource-form" autocomplete="off">
        @csrf
        @if($isEditing) @method('PUT') @endif
        @unless($isEditing)
            <input id="song-external-id" type="hidden" name="external_id" value="{{ old('external_id') }}">
            @error('external_id')<p class="admin-field-error">{{ $message }}</p>@enderror
        @endunless
        <div class="admin-resource-form-heading"><div><strong>Thông tin bài hát</strong><span>Các trường có dấu * là bắt buộc.</span></div><span class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span></div>
        <div class="admin-form-grid">
            <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="song-title">Tên bài hát <span>*</span></label><input id="song-title" name="title" data-slug-source="song-slug" value="{{ old('title', $item?->title) }}" maxlength="160" class="ant-input admin-form-input @error('title') is-invalid @enderror" required>@error('title')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-slug">Slug <span>*</span></label><div class="admin-slug-input-row"><input id="song-slug" name="slug" value="{{ old('slug', $item?->slug) }}" maxlength="180" pattern="[A-Za-z0-9_-]+" class="ant-input admin-form-input @error('slug') is-invalid @enderror" required><button type="button" class="ant-btn admin-slug-reset" data-slug-reset="song-slug">Theo tên</button></div><p class="admin-field-help">Tự tạo theo tên, hoặc tự sửa; slug không được trùng.</p>@error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-cover-url">Ảnh bài hát</label><input id="song-cover-url" name="cover_url" type="url" value="{{ old('cover_url', $item?->cover_url) }}" maxlength="500" class="ant-input admin-form-input @error('cover_url') is-invalid @enderror" placeholder="https://..."><p class="admin-field-help">Ảnh lấy từ NhacCuaTui sẽ được điền vào form; có thể thay bằng URL ảnh khác trước khi lưu.</p>@error('cover_url')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-artist">Nghệ sĩ</label><input id="song-artist" name="artist_name" value="{{ old('artist_name', $item?->artist_name) }}" maxlength="160" class="ant-input admin-form-input @error('artist_name') is-invalid @enderror" placeholder="Tự động lấy từ nguồn API"><p class="admin-field-help">Nghệ sĩ được lấy theo bài hát từ API; không lấy từ danh sách Admin.</p>@error('artist_name')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-album">Album</label><select id="song-album" name="album_id" class="ant-input admin-form-input @error('album_id') is-invalid @enderror"><option value="">Không thuộc album</option>@foreach($fields['album_id']['options'] ?? [] as $id => $label)<option value="{{ $id }}" @selected((string) old('album_id', $item?->album_id) === (string) $id)>{{ $label }}</option>@endforeach</select>@error('album_id')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-topic">Chủ đề</label><select id="song-topic" name="topic_id" class="ant-input admin-form-input @error('topic_id') is-invalid @enderror"><option value="">Chưa chọn chủ đề</option>@foreach($topics ?? [] as $topic)<option value="{{ $topic->getKey() }}" @selected((string) old('topic_id', $selectedTopicId ?? '') === (string) $topic->getKey())>{{ $topic->name }}{{ $topic->type ? ' · '.($topic->type_custom ?: config('topics.types.'.$topic->type, $topic->type)) : '' }}</option>@endforeach</select>@error('topic_id')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-genre">Thể loại</label><select id="song-genre" name="genre_id" class="ant-input admin-form-input @error('genre_id') is-invalid @enderror"><option value="">Chưa chọn thể loại</option>@foreach($genres ?? [] as $genre)<option value="{{ $genre->getKey() }}" @selected((string) old('genre_id', $selectedGenreId ?? '') === (string) $genre->getKey())>{{ $genre->name }}</option>@endforeach</select>@error('genre_id')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-playlist">Thêm vào playlist</label><select id="song-playlist" name="playlist_id" class="ant-input admin-form-input @error('playlist_id') is-invalid @enderror"><option value="">Không thêm vào playlist</option>@foreach($playlists ?? [] as $playlist)<option value="{{ $playlist->getKey() }}" @selected((string) old('playlist_id', $selectedPlaylistId ?? '') === (string) $playlist->getKey())>{{ $playlist->name }}</option>@endforeach</select><p class="admin-field-help">Muốn thêm vào nhiều playlist, chỉnh sửa từng playlist ở trang Playlist.</p>@error('playlist_id')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-release-date">Ngày phát hành</label><input id="song-release-date" name="release_date" type="date" value="{{ old('release_date', $item?->release_date?->format('Y-m-d')) }}" max="{{ now()->toDateString() }}" class="ant-input admin-form-input @error('release_date') is-invalid @enderror">@error('release_date')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-duration">Thời lượng (giây)</label><input id="song-duration" name="duration_seconds" type="number" min="0" max="86400" step="1" inputmode="numeric" value="{{ old('duration_seconds', $item?->duration_seconds) }}" class="ant-input admin-form-input @error('duration_seconds') is-invalid @enderror"><p class="admin-field-help">Giới hạn từ 0 đến 86.400 giây.</p>@error('duration_seconds')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-status">Trạng thái <span>*</span></label><select id="song-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required>@foreach(['draft' => 'Bản nháp', 'published' => 'Đã phát hành', 'blocked' => 'Đã chặn'] as $value => $label)<option value="{{ $value }}" @selected(old('status', $item?->status ?? 'draft') === $value)>{{ $label }}</option>@endforeach</select>@error('status')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="song-lyrics">Lời bài hát</label><textarea id="song-lyrics" name="plain_lyrics" rows="8" maxlength="50000" class="ant-input admin-form-input @error('plain_lyrics') is-invalid @enderror" placeholder="Lời bài hát sẽ được điền tự động nếu LRCLIB tìm thấy...">{{ old('plain_lyrics', $lyric?->plain_lyrics ?? $lyric?->content) }}</textarea><p class="admin-field-help">Có thể chỉnh sửa lời bài hát. Nếu không tìm thấy, bạn có thể nhập thủ công.</p>@error('plain_lyrics')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="song-synced-lyrics">Lời đồng bộ theo thời gian</label><textarea id="song-synced-lyrics" name="synced_lyrics" rows="5" maxlength="80000" class="ant-input admin-form-input @error('synced_lyrics') is-invalid @enderror" placeholder="LRCLIB sẽ điền lời có mốc thời gian nếu có...">{{ old('synced_lyrics', $lyric?->synced_lyrics) }}</textarea><p class="admin-field-help">Có thể để trống nếu không có lời đồng bộ.</p>@error('synced_lyrics')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group admin-form-span"><label class="admin-checkbox-card"><input type="hidden" name="explicit" value="0"><input type="checkbox" name="explicit" value="1" @checked(old('explicit', $item?->explicit))><span><strong>Nội dung nhạy cảm</strong><small>Đánh dấu nếu bài hát có nội dung cần cảnh báo.</small></span></label></div>
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.songs.index') }}" class="ant-btn">Hủy</a><button class="ant-btn ant-btn-primary" type="submit">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo bài hát' }}</button></div>
    </form>
</section>

@if(! $isEditing)
<script>
(() => {
    const searchButton = document.querySelector('[data-nct-search]');
    const searchInput = document.querySelector('#nct-search');
    const results = document.querySelector('[data-nct-results]');
    if (!searchButton || !searchInput || !results) return;

    const searchUrl = @json(route('admin.songs.external-search'));
    const previewUrl = @json(route('admin.songs.external-preview'));

    const showMessage = (message, className = 'admin-field-help') => {
        results.replaceChildren();
        const text = document.createElement('p');
        text.className = className;
        text.textContent = message;
        results.append(text);
    };

    const setValue = (selector, value) => {
        const field = document.querySelector(selector);
        if (!field) return;
        field.value = value ?? '';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const selectTrack = async (item, button) => {
        button.disabled = true;
        button.textContent = 'Đang lấy dữ liệu...';
        try {
            const response = await fetch(`${previewUrl}?song_id=${encodeURIComponent(item.id)}`, {
                headers: { Accept: 'application/json' },
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || 'Không thể lấy dữ liệu bài hát.');

            const track = payload.data || {};
            setValue('#song-external-id', track.external_id);
            setValue('#song-title', track.title);
            setValue('#song-slug', track.slug);
            setValue('#song-cover-url', track.cover_url);
            setValue('#song-artist', track.artist_name);
            setValue('#song-release-date', track.release_date);
            setValue('#song-duration', track.duration_seconds);
            setValue('#song-lyrics', track.plain_lyrics);
            setValue('#song-synced-lyrics', track.synced_lyrics);

            showMessage('Đã điền dữ liệu vào biểu mẫu. Chưa có dữ liệu nào được lưu; hãy kiểm tra rồi bấm Tạo bài hát.', 'admin-field-help');
            document.querySelector('#song-title')?.focus({ preventScroll: true });
        } catch (error) {
            showMessage(error.message || 'Không thể lấy dữ liệu bài hát lúc này.', 'admin-field-error');
        } finally {
            button.disabled = false;
            button.textContent = 'Chọn vào form';
        }
    };

    const renderResults = (items) => {
        results.replaceChildren();
        if (!items.length) {
            showMessage('Không tìm thấy bài hát phù hợp.');
            return;
        }

        items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'admin-checkbox-card';
            row.style.marginTop = '10px';

            const info = document.createElement('span');
            const title = document.createElement('strong');
            title.textContent = item.title;
            const detail = document.createElement('small');
            detail.textContent = [item.artist, item.album, item.genre].filter(Boolean).join(' · ');
            info.append(title, detail);

            const button = document.createElement('button');
            button.type = 'button'; button.className = 'ant-btn'; button.textContent = 'Chọn vào form';
            button.addEventListener('click', () => selectTrack(item, button));
            row.append(info, button);
            results.append(row);
        });
    };

    const search = async () => {
        const query = searchInput.value.trim();
        if (!query) { searchInput.focus(); showMessage('Hãy nhập tên bài hát hoặc nghệ sĩ.'); return; }
        searchButton.disabled = true;
        showMessage('Đang tìm bài hát...');
        try {
            const response = await fetch(`${searchUrl}?q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || 'Không thể tìm bài hát.');
            renderResults(payload.data || []);
        } catch (error) {
            showMessage(error.message || 'Không thể tìm bài hát lúc này.', 'admin-field-error');
        } finally {
            searchButton.disabled = false;
        }
    };

    searchButton.addEventListener('click', search);
    searchInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } });
})();
</script>
@endif
