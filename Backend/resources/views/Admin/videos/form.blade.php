@php($isEditing = $isEditing ?? filled($item))
@php($videoMaxBytes = max(1, (int) config('cloudinary.video_max_bytes', 104857600)))
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
        <input type="hidden" name="cloudinary_video_expected_public_id" value="">
        <input type="hidden" name="cloudinary_video_public_id" value="">
        <input type="hidden" name="cloudinary_video_version" value="">
        <input type="hidden" name="cloudinary_video_signature" value="">
        <input type="hidden" name="cloudinary_video_format" value="">
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
                <input id="video-file" name="video_file" type="file" data-max-bytes="{{ $videoMaxBytes }}" accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,.mp4,.mov,.m4v,.webm,.avi,.mkv" class="ant-input admin-form-input @error('video_file') is-invalid @enderror">
                <p class="admin-field-help">MP4, MOV, M4V, WEBM, AVI hoặc MKV · tối đa {{ number_format($videoMaxBytes / 1048576, $videoMaxBytes % 1048576 === 0 ? 0 : 1) }} MiB theo giới hạn Cloudinary hiện tại.</p>
                <p class="admin-field-help" data-video-file-message>Tên file và thời lượng sẽ được đọc tự động. File trong giới hạn Cloudinary được gửi thẳng lên; file lớn hơn 100 MB được chia phần để hiển thị tiến độ.</p>
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
                <div class="admin-video-artist-search">
                    <input id="video-artist-names" name="artist_names" value="{{ old('artist_names', collect($item?->artists ?? [])->pluck('name')->filter()->join(', ')) }}" maxlength="500" class="ant-input admin-form-input @error('artist_names') is-invalid @enderror" placeholder="Tìm và chọn nghệ sĩ trong database" autocomplete="off">
                    <div class="admin-video-artist-results" data-video-artist-results role="listbox" hidden></div>
                </div>
                <p class="admin-field-help">YouTube lấy nghệ sĩ từ API. Với file upload, hệ thống dò tên nghệ sĩ trong tên file và database; bạn cũng có thể gõ để chọn nghệ sĩ đã lưu.</p>
                <p class="admin-field-help" data-video-artist-message></p>
                @error('artist_names')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group">
                <label class="admin-form-label" for="video-duration">Thời lượng (giây)</label>
                <input id="video-duration" name="duration_seconds" type="number" min="0" max="86400" value="{{ old('duration_seconds', $item?->duration_seconds) }}" class="ant-input admin-form-input @error('duration_seconds') is-invalid @enderror" placeholder="Tự lấy khi upload/API">
                @error('duration_seconds')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group">
                <label class="admin-form-label" for="video-sort-order">Thứ tự</label>
                <input id="video-sort-order" name="sort_order" type="number" min="0" max="9999" value="{{ old('sort_order', $item?->sort_order ?? $nextSortOrder ?? 1) }}" class="ant-input admin-form-input @error('sort_order') is-invalid @enderror">
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
    const artistSearchUrl = @json(route('admin.videos.artist-search'));
    const uploadSignatureUrl = @json(route('admin.videos.upload-signature'));
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
    const maxVideoBytes = Number(file?.dataset.maxBytes || 104857600);
    const directUploadSingleRequestMaxBytes = 100000000;
    const fileMessage = document.querySelector('[data-video-file-message]');
    const artistNames = document.querySelector('#video-artist-names');
    const artistResults = document.querySelector('[data-video-artist-results]');
    const artistMessage = document.querySelector('[data-video-artist-message]');
    const artistBox = document.querySelector('[data-youtube-video-artists]');
    const form = file?.form;
    const cloudinaryUploadFields = {
        expectedPublicId: form?.querySelector('[name="cloudinary_video_expected_public_id"]'),
        publicId: form?.querySelector('[name="cloudinary_video_public_id"]'),
        version: form?.querySelector('[name="cloudinary_video_version"]'),
        signature: form?.querySelector('[name="cloudinary_video_signature"]'),
        format: form?.querySelector('[name="cloudinary_video_format"]'),
    };
    let directUploadInProgress = false;
    let slugTouched = Boolean(slug?.value.trim());
    let durationObjectUrl = null;
    let artistSearchTimer = null;
    let artistSearchController = null;

    const makeSlug = (value) => value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 200);

    const getTitleFromFileName = (fileName) => fileName
        .replace(/\.[^.]+$/, '')
        .replace(/[_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160);

    const normalizeArtistName = (name) => name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const clearDirectUploadResult = () => {
        Object.values(cloudinaryUploadFields).forEach((field) => {
            if (field) field.value = '';
        });
    };

    const uploadVideoDirectly = async (selectedFile, submitButton) => {
        const csrfToken = form?.querySelector('input[name="_token"]')?.value;
        if (!csrfToken) throw new Error('Phiên quản trị đã hết hạn. Tải lại trang rồi thử lại.');

        const signatureResponse = await fetch(uploadSignatureUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
            },
            body: JSON.stringify({title: title?.value.trim() || 'video'}),
        });
        const signaturePayload = await signatureResponse.json().catch(() => ({}));
        if (!signatureResponse.ok || !signaturePayload.data) {
            throw new Error(signaturePayload.message || 'Không thể khởi tạo upload Cloudinary.');
        }

        const authorization = signaturePayload.data;
        const uploadChunk = (start, end, uploadId, overallProgress) => new Promise((resolve, reject) => {
            const chunk = selectedFile.slice(start, end);
            const uploadData = new FormData();
            uploadData.append('file', chunk, selectedFile.name);
            uploadData.append('api_key', authorization.api_key);
            uploadData.append('timestamp', String(authorization.timestamp));
            uploadData.append('folder', authorization.folder);
            uploadData.append('public_id', authorization.public_id);
            uploadData.append('signature', authorization.signature);
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `https://api.cloudinary.com/v1_1/${authorization.cloud_name}/video/upload`);
            xhr.timeout = 600000;
            if (uploadId) {
                xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${selectedFile.size}`);
                xhr.setRequestHeader('X-Unique-Upload-Id', uploadId);
            }
            xhr.upload.addEventListener('progress', (event) => {
                if (!event.lengthComputable || !fileMessage) return;
                const sentInChunk = Math.min(end - start, event.loaded);
                const percent = Math.min(100, Math.round(((start + sentInChunk) / selectedFile.size) * 100));
                fileMessage.textContent = overallProgress
                    ? `Đang upload trực tiếp lên Cloudinary: ${percent}% (${Math.floor((start + sentInChunk) / 1048576)} / ${Math.ceil(selectedFile.size / 1048576)} MiB)`
                    : `Đang upload trực tiếp lên Cloudinary: ${percent}%`;
            });
            xhr.addEventListener('load', () => {
                const payload = (() => {
                    try { return JSON.parse(xhr.responseText); } catch { return {}; }
                })();
                if (xhr.status < 200 || xhr.status >= 300) {
                    reject(new Error(payload.error?.message || `Cloudinary từ chối upload (HTTP ${xhr.status}).`));
                    return;
                }
                resolve(payload);
            });
            xhr.addEventListener('error', () => reject(new Error('Mất kết nối khi gửi video lên Cloudinary. Kiểm tra mạng rồi thử lại.')));
            xhr.addEventListener('timeout', () => reject(new Error('Upload quá thời gian chờ. Hãy thử file nhỏ hơn hoặc mạng ổn định hơn.')));
            xhr.send(uploadData);
        });

        let uploaded;
        if (selectedFile.size <= directUploadSingleRequestMaxBytes) {
            uploaded = await uploadChunk(0, selectedFile.size, '', false);
        } else {
            const chunkSize = 20 * 1024 * 1024;
            const uploadId = typeof globalThis.crypto?.randomUUID === 'function'
                ? globalThis.crypto.randomUUID()
                : `melodify-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            for (let start = 0; start < selectedFile.size; start += chunkSize) {
                const end = Math.min(start + chunkSize, selectedFile.size);
                uploaded = await uploadChunk(start, end, uploadId, true);
            }
        }

        if (!uploaded.public_id || !uploaded.version || !uploaded.signature || !uploaded.format) {
            throw new Error('Cloudinary không trả về đủ thông tin xác nhận video.');
        }

        if (cloudinaryUploadFields.expectedPublicId) cloudinaryUploadFields.expectedPublicId.value = authorization.public_id;
        if (cloudinaryUploadFields.publicId) cloudinaryUploadFields.publicId.value = uploaded.public_id;
        if (cloudinaryUploadFields.version) cloudinaryUploadFields.version.value = String(uploaded.version);
        if (cloudinaryUploadFields.signature) cloudinaryUploadFields.signature.value = uploaded.signature;
        if (cloudinaryUploadFields.format) cloudinaryUploadFields.format.value = uploaded.format;
        file.value = '';
        directUploadInProgress = false;
        if (fileMessage) fileMessage.textContent = 'Upload video thành công. Đang lưu thông tin video…';
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = @json($isEditing ? 'Lưu thay đổi' : 'Upload video');
        }
        form?.requestSubmit();
    };

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

    const renderArtists = (artists = [], labelText = 'Nghệ sĩ lấy từ YouTube API') => {
        if (!artistBox) return;
        artistBox.innerHTML = '';
        if (!artists.length) {
            return;
        }
        const label = document.createElement('strong');
        label.textContent = labelText;
        artistBox.appendChild(label);
        artists.forEach((artist) => {
            const item = document.createElement('div');
            item.className = 'admin-video-artist-card';
            item.style.alignItems = 'center';
            item.style.display = 'flex';
            item.style.flexDirection = 'column';
            item.style.flex = '0 0 112px';
            item.style.width = '112px';
            item.style.overflow = 'hidden';
            const image = document.createElement('img');
            image.src = artist.avatar_url || artist.image_url || '';
            image.alt = '';
            image.width = 88;
            image.height = 88;
            image.style.display = 'block';
            image.style.width = '88px';
            image.style.height = '88px';
            image.style.maxWidth = '88px';
            image.style.objectFit = 'cover';
            const text = document.createElement('span');
            text.textContent = `${artist.name || 'Nghệ sĩ chưa xác định'}${artist.country ? ` · ${artist.country}` : ''}`;
            text.style.maxWidth = '100%';
            text.style.overflow = 'hidden';
            text.style.textAlign = 'center';
            text.style.textOverflow = 'ellipsis';
            text.style.whiteSpace = 'nowrap';
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
        renderArtists(video.artists || [], 'Nghệ sĩ lấy từ YouTube API');
        setMessage(video.video_url ? `Đã chọn video YouTube: ${video.title}` : 'API không trả về đường dẫn YouTube.', !video.video_url);
    };

    const renderArtistSuggestions = (artists = []) => {
        if (!artistResults) return;
        artistResults.innerHTML = '';
        if (!artists.length) {
            artistResults.hidden = true;
            return;
        }

        artists.forEach((artist) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'admin-video-artist-result';
            const image = document.createElement('img');
            image.src = artist.avatar_url || '';
            image.alt = '';
            const name = document.createElement('strong');
            name.textContent = artist.name || 'Nghệ sĩ';
            button.append(image, name);
            button.addEventListener('click', () => {
                const parts = (artistNames?.value || '').split(',');
                parts.pop();
                const selectedNames = parts.map((item) => item.trim()).filter(Boolean);
                const selectedKey = normalizeArtistName(artist.name || '');
                if (!selectedNames.some((item) => normalizeArtistName(item) === selectedKey)) {
                    selectedNames.push(artist.name);
                }
                if (artistNames) artistNames.value = `${selectedNames.join(', ')}, `;
                artistResults.hidden = true;
                artistResults.innerHTML = '';
                if (artistMessage) artistMessage.textContent = `Đã chọn nghệ sĩ trong database: ${artist.name}`;
            });
            artistResults.appendChild(button);
        });
        artistResults.hidden = false;
    };

    const findArtistsInDatabase = async (selectedFile) => {
        try {
            const response = await fetch(`${artistSearchUrl}?filename=${encodeURIComponent(selectedFile.name)}`, {headers: {'Accept': 'application/json'}});
            const payload = await response.json();
            if (!response.ok || file?.files?.[0] !== selectedFile) return;

            const artists = payload.data || [];
            if (artists.length) {
                if (artistNames) artistNames.value = artists.map((artist) => artist.name).join(', ');
                renderArtists(artists, 'Nghệ sĩ tìm thấy trong database theo tên file');
                if (artistMessage) artistMessage.textContent = `Đã nhận diện nghệ sĩ từ tên file: ${artists.map((artist) => artist.name).join(', ')}`;
            } else if (artistMessage) {
                artistMessage.textContent = 'Tên file không khớp nghệ sĩ nào trong database. Gõ tên để tìm và chọn nghệ sĩ có sẵn.';
            }
        } catch (_) {
            if (file?.files?.[0] === selectedFile && artistMessage) {
                artistMessage.textContent = 'Chưa thể dò nghệ sĩ từ tên file. Gõ tên để tìm nghệ sĩ trong database.';
            }
        }
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
    artistNames?.addEventListener('input', () => {
        const query = artistNames.value.split(',').pop()?.trim() || '';
        window.clearTimeout(artistSearchTimer);
        artistSearchController?.abort();
        // A previous YouTube artist preview must not cover the database suggestions.
        if (artistBox) artistBox.replaceChildren();
        if (query.length < 1) {
            if (artistResults) {
                artistResults.innerHTML = '';
                artistResults.hidden = true;
            }
            if (artistMessage) artistMessage.textContent = '';
            return;
        }

        artistSearchTimer = window.setTimeout(async () => {
            artistSearchController = new AbortController();
            try {
                const response = await fetch(`${artistSearchUrl}?q=${encodeURIComponent(query)}`, {
                    headers: {'Accept': 'application/json'},
                    signal: artistSearchController.signal,
                });
                const payload = await response.json();
                if (response.ok) {
                    const matches = payload.data || [];
                    renderArtistSuggestions(matches);
                    if (artistMessage) {
                        artistMessage.textContent = matches.length
                            ? `Tìm thấy ${matches.length} nghệ sĩ. Chọn tên trong danh sách để thêm.`
                            : 'Không tìm thấy nghệ sĩ phù hợp trong database.';
                    }
                } else if (artistMessage) {
                    artistMessage.textContent = payload.message || 'Không thể tìm nghệ sĩ. Thử lại.';
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    renderArtistSuggestions([]);
                    if (artistMessage) artistMessage.textContent = 'Không kết nối được danh sách nghệ sĩ. Thử lại.';
                }
            }
        }, 160);
    });
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
        clearDirectUploadResult();
        if (durationObjectUrl) {
            URL.revokeObjectURL(durationObjectUrl);
            durationObjectUrl = null;
        }

        const selectedFile = file.files?.[0];
        if (!selectedFile) {
            file.setCustomValidity('');
            file.classList.remove('is-invalid');
            if (fileMessage) {
                fileMessage.textContent = 'Tên file và thời lượng sẽ được đọc tự động. File trong giới hạn Cloudinary được gửi thẳng lên; file lớn hơn 100 MB được chia phần để hiển thị tiến độ.';
                fileMessage.classList.remove('admin-field-error');
            }
            return;
        }

        const fileTitle = getTitleFromFileName(selectedFile.name);
        if (fileTitle && title) {
            title.value = fileTitle;
            if (slug && !slugTouched) slug.value = makeSlug(fileTitle);
        }

        const sizeLimitMiB = (maxVideoBytes / 1048576).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
        if (selectedFile.size > maxVideoBytes) {
            const sizeError = `File này ${(selectedFile.size / 1048576).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MiB, vượt giới hạn Cloudinary ${sizeLimitMiB} MiB. Hãy nén video hoặc tăng giới hạn gói Cloudinary trước khi upload.`;
            file.setCustomValidity(sizeError);
            file.classList.add('is-invalid');
            if (fileMessage) {
                fileMessage.textContent = sizeError;
                fileMessage.classList.add('admin-field-error');
            }
            return;
        }

        file.setCustomValidity('');
        file.classList.remove('is-invalid');
        if (fileMessage) fileMessage.classList.remove('admin-field-error');

        if (videoUrl) videoUrl.value = '';
        if (externalSource) externalSource.value = '';
        if (externalId) externalId.value = '';
        if (sourceUrl) sourceUrl.value = '';
        if (artistNames) artistNames.value = '';
        if (artistResults) {
            artistResults.innerHTML = '';
            artistResults.hidden = true;
        }
        if (artistBox) artistBox.innerHTML = '';
        if (artistMessage) artistMessage.textContent = 'Đang dò nghệ sĩ trong database theo tên file…';
        void findArtistsInDatabase(selectedFile);

        if (fileMessage) fileMessage.textContent = `Đã đọc tên file: ${selectedFile.name}${fileTitle ? ` · Tên video: ${fileTitle}` : ''}`;

        if (duration) {
            const currentObjectUrl = URL.createObjectURL(selectedFile);
            durationObjectUrl = currentObjectUrl;
            const metadataReader = document.createElement('video');
            metadataReader.preload = 'metadata';
            metadataReader.onloadedmetadata = () => {
                if (file.files?.[0] !== selectedFile) {
                    URL.revokeObjectURL(currentObjectUrl);
                    return;
                }
                if (Number.isFinite(metadataReader.duration) && metadataReader.duration > 0) {
                    duration.value = String(Math.floor(metadataReader.duration));
                    if (fileMessage) fileMessage.textContent = `Đã đọc tên file và thời lượng ${duration.value} giây từ video.`;
                } else if (fileMessage) {
                    fileMessage.textContent = `Đã đọc tên file: ${selectedFile.name}. Không đọc được thời lượng tự động; bạn có thể nhập thủ công.`;
                }
                if (durationObjectUrl === currentObjectUrl) {
                    URL.revokeObjectURL(currentObjectUrl);
                    durationObjectUrl = null;
                }
            };
            metadataReader.onerror = () => {
                if (file.files?.[0] === selectedFile && fileMessage) {
                    fileMessage.textContent = `Đã đọc tên file: ${selectedFile.name}. Không đọc được thời lượng tự động; bạn có thể nhập thủ công.`;
                }
                if (durationObjectUrl === currentObjectUrl) {
                    URL.revokeObjectURL(currentObjectUrl);
                    durationObjectUrl = null;
                }
            };
            metadataReader.src = currentObjectUrl;
        }
    });
    form?.addEventListener('submit', (event) => {
        const selectedFile = file?.files?.[0];
        if (!selectedFile) return;

        const submitButton = form.querySelector('button[type="submit"]');
        if (selectedFile.size <= maxVideoBytes) {
            event.preventDefault();
            if (directUploadInProgress) return;
            directUploadInProgress = true;
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Đang upload video…';
            }
            if (fileMessage) fileMessage.textContent = `Đang kết nối Cloudinary để upload ${selectedFile.name}…`;
            void uploadVideoDirectly(selectedFile, submitButton).catch((error) => {
                directUploadInProgress = false;
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = @json($isEditing ? 'Lưu thay đổi' : 'Upload video');
                }
                if (fileMessage) {
                    fileMessage.textContent = error.message || 'Không thể upload video. Hãy thử lại.';
                    fileMessage.classList.add('admin-field-error');
                }
            });
            return;
        }

        event.preventDefault();
        const sizeLimitMiB = (maxVideoBytes / 1048576).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
        const sizeError = `File vượt giới hạn Cloudinary ${sizeLimitMiB} MiB. Hãy nén video hoặc tăng giới hạn gói Cloudinary.`;
        if (fileMessage) {
            fileMessage.textContent = sizeError;
            fileMessage.classList.add('admin-field-error');
        }
        file?.setCustomValidity(sizeError);
        file?.reportValidity();
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = @json($isEditing ? 'Lưu thay đổi' : 'Upload video');
        }
    });
    renderArtists(@json($item?->artists ?? []));
})();
</script>
@endpush
