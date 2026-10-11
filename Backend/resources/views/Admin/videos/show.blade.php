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
                <div><strong>Trình phát Melodify</strong><span>Video nhạc</span></div>
            </div>
            <div class="admin-video-show-player" data-video-show-player data-player-kind="{{ $item->source === 'youtube' ? 'youtube' : 'file' }}">
                <div class="admin-video-show-media" data-video-show-media>
                    <span class="admin-table-subtext">Đang tải video...</span>
                </div>
                <div class="admin-video-show-controls" data-video-show-controls hidden>
                    <button type="button" class="admin-video-control-button" data-video-play aria-label="Phát video">▶</button>
                    <span class="admin-video-time" data-video-current-time>00:00</span>
                    <input class="admin-video-seek" data-video-seek type="range" min="0" max="0" step="0.1" value="0" aria-label="Tiến trình video">
                    <span class="admin-video-time" data-video-duration>00:00</span>
                    <button type="button" class="admin-video-control-button admin-video-volume-button" data-video-mute aria-label="Tắt tiếng">🔊</button>
                    <input class="admin-video-volume" data-video-volume type="range" min="0" max="100" step="1" value="100" aria-label="Âm lượng">
                    <button type="button" class="admin-video-control-button" data-video-fullscreen aria-label="Toàn màn hình">⛶</button>
                </div>
            </div>
            <p class="admin-field-help">Video được phát bằng trình điều khiển Melodify, không cần mở sang trang khác.</p>
        </article>

        <article class="ant-card admin-video-show-details-card">
            <div class="admin-resource-form-heading"><div><strong>Thông tin video</strong><span>Metadata đã lưu trong kho video</span></div></div>
            <dl class="admin-video-show-details">
                <div><dt>Tên video</dt><dd>{{ $item->title }}</dd></div>
                <div><dt>Slug</dt><dd><code>{{ $item->slug ?: 'Chưa có slug' }}</code></dd></div>
                <div><dt>Nghệ sĩ</dt><dd>{{ collect($item->artists ?? [])->pluck('name')->filter()->join(', ') ?: '—' }}</dd></div>
                <div><dt>Loại video</dt><dd>{{ $item->source === 'youtube' ? 'Video trực tuyến' : ($item->source === 'cloudinary' ? 'Video đã lưu' : 'Video file') }}</dd></div>
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
    const media = player?.querySelector('[data-video-show-media]');
    const controls = player?.querySelector('[data-video-show-controls]');
    const playButton = player?.querySelector('[data-video-play]');
    const muteButton = player?.querySelector('[data-video-mute]');
    const fullscreenButton = player?.querySelector('[data-video-fullscreen]');
    const seek = player?.querySelector('[data-video-seek]');
    const volume = player?.querySelector('[data-video-volume]');
    const currentTime = player?.querySelector('[data-video-current-time]');
    const duration = player?.querySelector('[data-video-duration]');
    if (!player || !media || !controls) return;

    const sourceUrl = @json(route('admin.videos.source', $item->slug ?: $item->getKey()));
    const kind = @json($item->source === 'youtube' ? 'youtube' : 'file');
    const externalId = @json((string) ($item->external_id ?? ''));

    let adapter = null;
    let progressTimer = null;

    const formatTime = (value) => {
        const seconds = Math.max(0, Math.floor(Number(value) || 0));
        return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    };

    const updateControls = () => {
        if (!adapter) return;
        const current = adapter.currentTime();
        const total = adapter.duration();
        const playing = adapter.isPlaying();
        if (currentTime) currentTime.textContent = formatTime(current);
        if (duration) duration.textContent = formatTime(total);
        if (seek) {
            seek.max = String(Math.max(total, 0));
            seek.value = String(Math.min(current, total || current));
            seek.style.setProperty('--video-progress', total > 0 ? `${(current / total) * 100}%` : '0%');
        }
        if (playButton) {
            playButton.textContent = playing ? 'Ⅱ' : '▶';
            playButton.setAttribute('aria-label', playing ? 'Tạm dừng video' : 'Phát video');
        }
    };

    const attachControls = (nextAdapter) => {
        adapter = nextAdapter;
        controls.hidden = false;
        updateControls();
        clearInterval(progressTimer);
        progressTimer = window.setInterval(updateControls, 250);
    };

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

    playButton?.addEventListener('click', () => {
        if (!adapter) return;
        adapter.isPlaying() ? adapter.pause() : adapter.play();
        window.setTimeout(updateControls, 100);
    });
    muteButton?.addEventListener('click', () => {
        if (!adapter) return;
        adapter.muted(!adapter.isMuted());
        muteButton.textContent = adapter.isMuted() ? '🔇' : '🔊';
    });
    seek?.addEventListener('input', () => adapter?.seek(Number(seek.value)));
    volume?.addEventListener('input', () => {
        adapter?.setVolume(Number(volume.value));
        if (adapter?.isMuted() && Number(volume.value) > 0) adapter.muted(false);
    });
    fullscreenButton?.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else player.requestFullscreen?.();
    });

    const loadYouTubeApi = () => new Promise((resolve, reject) => {
        if (window.YT?.Player) {
            resolve(window.YT);
            return;
        }
        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previousReady?.();
            resolve(window.YT);
        };
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => reject(new Error('Không thể tải trình phát video.'));
        document.head.appendChild(script);
    });

    const createYouTubePlayer = (videoId) => loadYouTubeApi().then((YT) => new Promise((resolve, reject) => {
        const target = document.createElement('div');
        media.replaceChildren(target);
        new YT.Player(target, {
            videoId,
            width: '100%',
            height: '100%',
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                enablejsapi: 1,
                modestbranding: 1,
                playsinline: 1,
                rel: 0,
            },
            events: {
                onReady: (event) => {
                    const youtube = event.target;
                    resolve({
                        play: () => youtube.playVideo(),
                        pause: () => youtube.pauseVideo(),
                        isPlaying: () => youtube.getPlayerState() === YT.PlayerState.PLAYING,
                        currentTime: () => youtube.getCurrentTime(),
                        duration: () => youtube.getDuration(),
                        seek: (value) => youtube.seekTo(value, true),
                        setVolume: (value) => youtube.setVolume(value),
                        isMuted: () => youtube.isMuted(),
                        muted: (value) => value ? youtube.mute() : youtube.unMute(),
                    });
                },
                onError: () => reject(new Error('Video không thể phát trong trình phát Melodify.')),
            },
        });
    }));

    fetch(sourceUrl, {headers: {'Accept': 'application/json'}})
        .then(async (response) => {
            const payload = await response.json();
            if (!response.ok || !payload.url) throw new Error(payload.message || 'Không lấy được đường dẫn phát.');
            return payload;
        })
        .then((payload) => {
            if (kind === 'youtube') {
                const embedUrl = youtubeEmbedUrl(payload.url);
                const videoId = embedUrl.split('/').pop()?.split('?')[0];
                if (!videoId) throw new Error('Video không có mã phát hợp lệ.');
                return createYouTubePlayer(videoId).then(attachControls);
            }

            const video = document.createElement('video');
            video.controls = false;
            video.autoplay = true;
            video.playsInline = true;
            video.preload = 'metadata';
            video.poster = @json($item->thumbnail_url ?: '');
            video.src = payload.url;
            media.replaceChildren(video);
            video.addEventListener('loadedmetadata', () => attachControls({
                play: () => video.play(),
                pause: () => video.pause(),
                isPlaying: () => !video.paused,
                currentTime: () => video.currentTime,
                duration: () => video.duration,
                seek: (value) => { video.currentTime = value; },
                setVolume: (value) => { video.volume = value / 100; },
                isMuted: () => video.muted,
                muted: (value) => { video.muted = value; },
            }));
        })
        .catch((error) => showError(error.message || 'Không thể phát video.'));
})();
</script>
@endpush
