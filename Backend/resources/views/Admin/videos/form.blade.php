@php($isEditing = $isEditing ?? filled($item))
<section class="admin-page admin-form-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <a href="{{ route('admin.videos.index') }}" class="admin-back-link">← Quay lại kho video</a>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa video nhạc' : 'Upload video nhạc' }}</h1>
            <p class="admin-page-description">Video hoạt động độc lập, không bắt buộc gắn với bài hát. Bạn có thể lấy video từ YouTube hoặc tự upload/dán URL.</p>
        </div>
    </div>

    <form method="POST" action="{{ $isEditing ? route('admin.videos.update', $item->getKey()) : route('admin.videos.store') }}" class="ant-card admin-resource-form" enctype="multipart/form-data">
        @csrf
        @if($isEditing) @method('PUT') @endif
        <div class="admin-resource-form-heading"><div><strong>Thông tin video</strong><span>Video được lưu trong collection song_videos riêng.</span></div><span class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span></div>

        <div class="admin-form-grid">
            <div class="admin-form-group admin-form-span">
                <label class="admin-form-label" for="youtube-video-search">Lấy video từ YouTube</label>
                <div class="admin-inline-form-row">
                    <input id="youtube-video-search" type="search" class="ant-input admin-form-input" placeholder="Tìm video YouTube hoặc nghệ sĩ..." autocomplete="off">
                    <button type="button" class="ant-btn" data-youtube-video-search>Tìm video</button>
                    @if($isEditing && $item?->external_source === 'youtube' && filled($item?->external_id))
                        <button type="button" class="ant-btn" data-youtube-video-refresh data-video-id="{{ $item->external_id }}">Lấy lại dữ liệu YouTube</button>
                    @endif
                </div>
                <div class="admin-field-help" data-youtube-video-message>Chọn kết quả để tự điền tên, thumbnail, thời lượng và URL YouTube.</div>
                <div class="admin-video-api-results" data-youtube-video-results></div>
                <div class="admin-video-artists" data-youtube-video-artists></div>
            </div>

            <input type="hidden" name="external_id" value="{{ old('external_id', $item?->external_id) }}" data-video-external-id>
            <input type="hidden" name="external_source" value="{{ old('external_source', $item?->external_source) }}" data-video-external-source>
            <input type="hidden" name="source_url" value="{{ old('source_url', $item?->source_url) }}" data-video-source-url>

            <div class="admin-form-group admin-form-span">
                <label class="admin-form-label" for="video-title">Tên video <span>*</span></label>
                <input id="video-title" name="title" value="{{ old('title', $item?->title) }}" maxlength="160" class="ant-input admin-form-input @error('title') is-invalid @enderror" placeholder="Ví dụ: Official Music Video" required>
                @error('title')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group admin-form-span">
                <label class="admin-form-label" for="video-slug">Slug</label>
                <input id="video-slug" name="slug" value="{{ old('slug', $item?->slug) }}" maxlength="200" pattern="[A-Za-z0-9_-]+" class="ant-input admin-form-input @error('slug') is-invalid @enderror" placeholder="Tự tạo nếu bỏ trống">
                <p class="admin-field-help">Slug dùng để mở trang chỉnh sửa video.</p>
                @error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group admin-form-span">
                <label class="admin-form-label" for="video-file">File video</label>
                @if($item?->source === 'youtube' && filled($item?->external_id))
                    <iframe class="admin-video-preview" src="https://www.youtube.com/embed/{{ $item->external_id }}" title="{{ $item->title }}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                    <p class="admin-field-help">Video hiện tại: YouTube. Đường dẫn xem được mã hóa trong database.</p>
                @elseif($item?->video_url)
                    <video class="admin-video-preview" controls preload="metadata" poster="{{ $item->thumbnail_url ?: '' }}"><source src="{{ $item->video_url }}"></video>
                    <p class="admin-field-help">Video hiện tại: {{ $item->source === 'cloudinary' ? 'Cloudinary' : ($item->source === 'nhaccuatui' ? 'NhacCuaTui' : 'URL bên ngoài') }}.</p>
                @endif
                <input id="video-file" name="video_file" type="file" accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,.mp4,.mov,.m4v,.webm,.avi,.mkv" class="ant-input admin-form-input @error('video_file') is-invalid @enderror">
                <p class="admin-field-help">MP4, MOV, M4V, WEBM, AVI hoặc MKV · tối đa 500MB.</p>
                @error('video_file')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group admin-form-span">
                <label class="admin-form-label" for="video-url">URL video</label>
                <input id="video-url" name="video_url" type="url" value="{{ old('video_url', $item?->source === 'youtube' ? null : $item?->video_url) }}" maxlength="1000" class="ant-input admin-form-input @error('video_url') is-invalid @enderror" placeholder="Hoặc dán URL video https://...">
                <p class="admin-field-help">URL YouTube được dùng để xác nhận video rồi mã hóa khi lưu; file upload vẫn được ưu tiên.</p>
                @error('video_url')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group">
                <label class="admin-form-label" for="video-thumbnail">Ảnh thumbnail</label>
                <input id="video-thumbnail" name="thumbnail_url" type="url" value="{{ old('thumbnail_url', $item?->thumbnail_url) }}" maxlength="500" class="ant-input admin-form-input @error('thumbnail_url') is-invalid @enderror" placeholder="https://...">
                @error('thumbnail_url')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group admin-form-span">
                <label class="admin-form-label" for="video-artist-names">Nghệ sĩ</label>
                <input id="video-artist-names" name="artist_names" value="{{ old('artist_names', collect($item?->artists ?? [])->pluck('name')->filter()->join(', ')) }}" maxlength="500" class="ant-input admin-form-input @error('artist_names') is-invalid @enderror" placeholder="Nghệ sĩ chính, Nghệ sĩ kết hợp">
                <p class="admin-field-help">YouTube tự lấy kênh chính. Nếu có nhiều nghệ sĩ, nhập cách nhau bằng dấu phẩy để hệ thống kiểm tra, lấy ảnh và quốc gia từng người.</p>
                @error('artist_names')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group">
                <label class="admin-form-label" for="video-duration">Thời lượng (giây)</label>
                <input id="video-duration" name="duration_seconds" type="number" min="0" max="86400" value="{{ old('duration_seconds', $item?->duration_seconds) }}" class="ant-input admin-form-input @error('duration_seconds') is-invalid @enderror" placeholder="Tự lấy khi upload/API">
                @error('duration_seconds')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group">
                <label class="admin-form-label" for="video-sort-order">Thứ tự</label>
                <input id="video-sort-order" name="sort_order" type="number" min="0" max="9999" value="{{ old('sort_order', $item?->sort_order ?? 0) }}" class="ant-input admin-form-input @error('sort_order') is-invalid @enderror">
                @error('sort_order')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group">
                <label class="admin-form-label" for="video-status">Trạng thái <span>*</span></label>
                <select id="video-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required>
                    <option value="active" @selected(old('status', $item?->status ?? 'active') === 'active')>Đang hiển thị</option>
                    <option value="inactive" @selected(old('status', $item?->status) === 'inactive')>Tạm ẩn</option>
                </select>
                @error('status')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            @if($isEditing && ($item?->video_url || $item?->source === 'youtube'))
                <div class="admin-form-group admin-form-span">
                    <label class="admin-checkbox-card"><input type="checkbox" name="remove_video" value="1"><span><strong>Xóa video hiện tại</strong><small>Chỉ chọn khi muốn xóa bản ghi video này khỏi kho.</small></span></label>
                </div>
            @endif
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.videos.index') }}" class="ant-btn">Hủy</a><button class="ant-btn ant-btn-primary" type="submit">{{ $isEditing ? 'Lưu thay đổi' : 'Upload video' }}</button></div>
    </form>
</section>

@push('scripts')
<script>
(() => {
    const searchUrl = @json(route('admin.videos.external-search'));
    const previewUrl = @json(route('admin.videos.external-preview'));
    const queryInput = document.querySelector('#youtube-video-search');
    const searchButton = document.querySelector('[data-youtube-video-search]');
    const refreshButton = document.querySelector('[data-youtube-video-refresh]');
    const results = document.querySelector('[data-youtube-video-results]');
    const message = document.querySelector('[data-youtube-video-message]');
    const title = document.querySelector('#video-title');
    const videoUrl = document.querySelector('#video-url');
    const slug = document.querySelector('#video-slug');
    const thumbnail = document.querySelector('#video-thumbnail');
    const duration = document.querySelector('#video-duration');
    const externalId = document.querySelector('[data-video-external-id]');
    const externalSource = document.querySelector('[data-video-external-source]');
    const sourceUrl = document.querySelector('[data-video-source-url]');
    const file = document.querySelector('#video-file');
    const artistNames = document.querySelector('#video-artist-names');
    const artistBox = document.querySelector('[data-youtube-video-artists]');
    let slugTouched = Boolean(slug?.value.trim());

    const makeSlug = (value) => value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 200);

    const getYouTubeId = (value) => {
        try {
            const url = new URL(value);
            const host = url.hostname.replace(/^www\./, '').toLowerCase();
            if (host === 'youtu.be') {
                const shortId = url.pathname.slice(1).split('/')[0] || '';
                return /^[A-Za-z0-9_-]{11}$/.test(shortId) ? shortId : null;
            }
            if (host === 'youtube.com' || host === 'm.youtube.com') {
                const queryId = url.searchParams.get('v');
                if (queryId && /^[A-Za-z0-9_-]{11}$/.test(queryId)) return queryId;
                const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
                return match?.[1] || null;
            }
        } catch (_) {
            return null;
        }
        return null;
    };

    const renderArtists = (artists = []) => {
        if (!artistBox) return;
        artistBox.innerHTML = '';
        if (!artists.length) {
            artistBox.textContent = 'Chưa có thông tin nghệ sĩ từ API.';
            return;
        }
        const label = document.createElement('strong');
        label.textContent = 'Nghệ sĩ lấy từ API';
        artistBox.appendChild(label);
        artists.forEach((artist) => {
            const item = document.createElement('span');
            const image = document.createElement('img');
            image.src = artist.avatar_url || artist.image_url || '';
            image.alt = '';
            const text = document.createElement('span');
            text.textContent = `${artist.name || 'Nghệ sĩ chưa xác định'}${artist.country ? ` · ${artist.country}` : ''}`;
            item.append(image, text);
            artistBox.appendChild(item);
        });
    };

    const setMessage = (text, error = false) => {
        if (!message) return;
        message.textContent = text;
        message.classList.toggle('admin-field-error', error);
    };

    const fillFromApi = (video) => {
        if (title) title.value = video.title || '';
        if (slug && !slugTouched) slug.value = makeSlug(video.title || 'music-video');
        if (videoUrl) videoUrl.value = video.video_url || '';
        if (thumbnail) thumbnail.value = video.thumbnail_url || '';
        if (duration) duration.value = video.duration_seconds ?? '';
        if (externalId) externalId.value = video.external_id || '';
        if (externalSource) externalSource.value = video.external_source || 'youtube';
        if (sourceUrl) sourceUrl.value = video.source_url || '';
        if (artistNames) artistNames.value = (video.artists || []).map((artist) => artist.name).filter(Boolean).join(', ');
        renderArtists(video.artists || []);
        setMessage(video.video_url ? `Đã chọn video YouTube: ${video.title}` : 'API không trả về đường dẫn YouTube.', !video.video_url);
    };

    const loadPreview = async (id) => {
        if (!id) return;
        setMessage('Đang lấy dữ liệu video từ YouTube...');
        try {
            const response = await fetch(`${previewUrl}?video_id=${encodeURIComponent(id)}`, {headers: {'Accept': 'application/json'}});
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || 'Không lấy được video.');
            fillFromApi(payload.data || {});
        } catch (error) {
            setMessage(error.message || 'Không thể lấy video từ YouTube API.', true);
        }
    };

    const renderResults = (items) => {
        if (!results) return;
        results.innerHTML = '';
        items.forEach((video) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'admin-video-api-result';
            button.dataset.videoId = video.external_id;
            const image = document.createElement('img');
            image.src = video.thumbnail_url || '';
            image.alt = '';
            const text = document.createElement('span');
            const videoTitle = document.createElement('strong');
            videoTitle.textContent = video.title || 'Video nhạc';
            const artist = document.createElement('small');
            artist.textContent = video.artist_name || 'Nghệ sĩ chưa xác định';
            text.append(videoTitle, artist);
            button.append(image, text);
            button.addEventListener('click', () => loadPreview(video.external_id));
            results.appendChild(button);
        });
    };

    const search = async () => {
        const query = queryInput?.value.trim();
        if (!query) {
            setMessage('Hãy nhập tên video hoặc nghệ sĩ cần tìm.', true);
            return;
        }
        setMessage('Đang tìm video...');
        if (results) results.innerHTML = '';
        try {
            const response = await fetch(`${searchUrl}?q=${encodeURIComponent(query)}`, {headers: {'Accept': 'application/json'}});
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || 'Không thể tìm video.');
            renderResults(payload.data || []);
            setMessage((payload.data || []).length ? 'Chọn một video để điền vào form.' : 'Không tìm thấy video phù hợp.');
        } catch (error) {
            setMessage(error.message || 'Không thể tìm video từ YouTube API.', true);
        }
    };

    searchButton?.addEventListener('click', search);
    queryInput?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } });
    refreshButton?.addEventListener('click', () => loadPreview(refreshButton.dataset.videoId));
    title?.addEventListener('input', () => {
        if (!slugTouched && slug) slug.value = makeSlug(title.value || 'music-video');
    });
    slug?.addEventListener('input', () => { slugTouched = Boolean(slug.value.trim()); });
    videoUrl?.addEventListener('input', () => {
        const youtubeId = getYouTubeId(videoUrl.value.trim());
        if (youtubeId) {
            if (externalSource) externalSource.value = 'youtube';
            if (externalId) externalId.value = youtubeId;
            if (sourceUrl) sourceUrl.value = videoUrl.value.trim();
            setMessage('Đã nhận diện URL YouTube. Lưu lại để mã hóa hoặc bấm lấy lại dữ liệu để đồng bộ nghệ sĩ.');
            return;
        }
        if (externalSource) externalSource.value = '';
        if (externalId) externalId.value = '';
        if (sourceUrl) sourceUrl.value = '';
    });
    file?.addEventListener('change', () => {
        if (externalSource) externalSource.value = '';
        if (externalId) externalId.value = '';
        if (sourceUrl) sourceUrl.value = '';
    });
    renderArtists(@json($item?->artists ?? []));
})();
</script>
@endpush
