@extends('layouts.admin')

@section('content')
<section class="admin-page admin-video-show-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <a href="{{ route('admin.videos.index') }}" class="admin-back-link">← Quay lại danh sách video</a>
            <h1 class="admin-page-title">{{ $item->title }}</h1>
            <p class="admin-page-description">Xem và nghe video ngay trong trang quản trị.</p>
        </div>
        <div class="admin-page-header-actions">
            <a href="{{ route('admin.videos.edit', $item->slug ?: $item->getKey()) }}" class="ant-btn ant-btn-primary">Sửa video</a>
        </div>
    </div>

    <div class="admin-video-show-grid">
        <article class="ant-card admin-video-show-player-card">
            <div class="admin-resource-form-heading">
                <div><strong>Trình phát video</strong><span>{{ $item->source === 'youtube' ? 'YouTube' : 'Video đã lưu' }}</span></div>
            </div>
            <div class="admin-video-show-player" data-video-show-player>
                <span class="admin-table-subtext">Đang tải video...</span>
            </div>
            <p class="admin-field-help">Video được phát trong admin, không cần mở sang trang khác.</p>
        </article>

        <article class="ant-card admin-video-show-details-card">
            <div class="admin-resource-form-heading"><div><strong>Thông tin video</strong><span>Metadata đã lưu trong kho video</span></div></div>
            <dl class="admin-video-show-details">
                <div><dt>Tên video</dt><dd>{{ $item->title }}</dd></div>
                <div><dt>Slug</dt><dd><code>{{ $item->slug ?: 'Chưa có slug' }}</code></dd></div>
                <div><dt>Nghệ sĩ</dt><dd>{{ collect($item->artists ?? [])->pluck('name')->filter()->join(', ') ?: '—' }}</dd></div>
                <div><dt>Nguồn</dt><dd>{{ $item->source === 'youtube' ? 'YouTube' : ($item->source === 'cloudinary' ? 'Cloudinary' : 'URL/video file') }}</dd></div>
                <div><dt>Thời lượng</dt><dd>{{ (int) ($item->duration_seconds ?? 0) > 0 ? gmdate('i:s', (int) $item->duration_seconds) : '—' }}</dd></div>
                <div><dt>Trạng thái</dt><dd>{{ $item->status === 'active' ? 'Đang hiển thị' : 'Tạm ẩn' }}</dd></div>
            </dl>
        </article>
    </div>
</section>
@endsection

@push('scripts')
<script>
(() => {
    const player = document.querySelector('[data-video-show-player]');
    if (!player) return;

    const sourceUrl = @json(route('admin.videos.source', $item->slug ?: $item->getKey()));
    const kind = @json($item->source === 'youtube' ? 'youtube' : 'file');
    const externalId = @json((string) ($item->external_id ?? ''));

    const youtubeEmbedUrl = (url) => {
        let id = externalId;
        try {
            const parsed = new URL(url);
            id = id || parsed.searchParams.get('v') || (parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : '');
        } catch (_) {}
        return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0` : '';
    };

    const showError = (message) => {
        player.replaceChildren(Object.assign(document.createElement('span'), {
            className: 'admin-field-error',
            textContent: message,
        }));
    };

    fetch(sourceUrl, {headers: {'Accept': 'application/json'}})
        .then(async (response) => {
            const payload = await response.json();
            if (!response.ok || !payload.url) throw new Error(payload.message || 'Không lấy được đường dẫn phát.');
            return payload;
        })
        .then((payload) => {
            const embedUrl = kind === 'youtube' ? youtubeEmbedUrl(payload.url) : '';
            if (embedUrl) {
                const iframe = document.createElement('iframe');
                iframe.src = embedUrl;
                iframe.title = @json($item->title);
                iframe.allow = 'autoplay; encrypted-media; picture-in-picture; web-share';
                iframe.allowFullscreen = true;
                player.replaceChildren(iframe);
                return;
            }

            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true;
            video.preload = 'metadata';
            video.poster = @json($item->thumbnail_url ?: '');
            video.src = payload.url;
            player.replaceChildren(video);
        })
        .catch((error) => showError(error.message || 'Không thể phát video.'));
})();
</script>
@endpush
