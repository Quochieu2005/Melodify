@extends('layouts.admin')

@section('content')
<section class="admin-page admin-lyrics-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <a href="{{ route('admin.analytics.song-views') }}" class="admin-back-link">← Quay lại phân tích bài hát</a>
            <h1 class="admin-page-title">Lời bài hát</h1>
            <p class="admin-page-description">Xem lời thường, lời đồng bộ theo thời gian và nghe bài hát.</p>
        </div>
    </div>

    <div class="admin-lyrics-grid">
        <article class="ant-card admin-lyrics-card admin-lyrics-preview-card">
            <div class="admin-lyrics-hero">
                <div class="admin-lyrics-cover">
                    @if(filled($song->cover_url))
                        <img src="{{ $song->cover_url }}" alt="Ảnh bìa {{ $song->title }}">
                    @else
                        <span>{{ mb_strtoupper(mb_substr($song->title, 0, 1)) }}</span>
                    @endif
                </div>
                <div class="admin-lyrics-track-meta">
                    <span class="admin-lyrics-kicker">BẢN XEM THỬ KARAOKE</span>
                    <h2>{{ $song->title }}</h2>
                    <p>{{ $song->artist_name ?: 'Chưa có nghệ sĩ' }}</p>
                    <div class="admin-lyrics-track-tags">
                        <span class="admin-lyrics-source-dot"></span>
                        <span>{{ $audioLabel }}</span>
                        <span class="admin-lyrics-separator">•</span>
                        <span data-audio-state>Đang chờ phát</span>
                    </div>
                </div>
            </div>

            @if(filled($audioUrl))
                <div class="admin-lyrics-player">
                    <audio id="song-lyrics-audio" class="admin-lyrics-native-audio" preload="metadata" src="{{ $audioUrl }}" aria-label="Audio {{ $song->title }}"></audio>
                    <div class="admin-lyrics-player-controls">
                        <button type="button" class="admin-lyrics-play" data-audio-toggle aria-label="Phát bài hát">
                            <span data-play-icon>▶</span>
                            <span data-play-label>Phát</span>
                        </button>
                        <span class="admin-lyrics-time" data-audio-current>00:00</span>
                        <input class="admin-lyrics-seek" data-audio-seek type="range" min="0" max="0" step="0.01" value="0" aria-label="Vị trí phát">
                        <span class="admin-lyrics-time" data-audio-duration>00:00</span>
                        <button type="button" class="admin-lyrics-volume" data-audio-mute aria-label="Tắt tiếng">⌁</button>
                    </div>
                    <div class="admin-lyrics-player-note">
                        <span>{{ $audioLabel === 'Bản đầy đủ' ? 'Bạn đang nghe toàn bộ bài hát.' : 'Đây là bản nghe thử.' }}</span>
                        <span data-lyrics-position>00:00</span>
                    </div>
                </div>
            @else
                <div class="admin-lyrics-empty admin-lyrics-no-audio">Bài hát chưa có file âm thanh để xem thử lời.</div>
            @endif

            <div class="admin-lyrics-stage" data-lyrics-stage>
                <div class="admin-lyrics-stage-heading">
                    <div>
                        <span class="admin-lyrics-kicker">ĐỒNG BỘ THEO THỜI GIAN</span>
                        <strong>Hát cùng lời bài hát</strong>
                    </div>
                    <div class="admin-lyrics-stage-tools">
                        <span class="admin-lyrics-stage-hint">Nhấp vào câu để tua</span>
                        <span class="admin-lyrics-stage-badge">LIVE PREVIEW</span>
                    </div>
                </div>
                <div class="admin-lyrics-lines" data-lyrics-lines aria-live="polite">
                    <span class="admin-lyrics-empty">{{ filled($lyric?->synced_lyrics) ? 'Đang tải lời đồng bộ...' : 'Chưa có lời đồng bộ có mốc thời gian.' }}</span>
                </div>
            </div>
        </article>

        <form method="POST" action="{{ route('admin.songs.lyrics.update', $song->getKey()) }}" class="ant-card admin-lyrics-card admin-lyrics-editor" enctype="multipart/form-data">
            @csrf
            @method('PUT')
            <div class="admin-resource-form-heading">
                <div><strong>Chỉnh sửa lời</strong><span>Lưu lời thường hoặc lời có mốc thời gian LRC.</span></div>
                <span class="ant-tag ant-tag-green">Có thể sửa</span>
            </div>
            <div class="admin-form-group">
                <label class="admin-form-label" for="song-lyrics">Lời bài hát</label>
                <textarea id="song-lyrics" name="plain_lyrics" rows="12" maxlength="50000" class="ant-input admin-form-input @error('plain_lyrics') is-invalid @enderror" placeholder="Nhập lời bài hát...">{{ old('plain_lyrics', $lyric?->plain_lyrics ?? ($lyric?->synced_lyrics ? null : $lyric?->content)) }}</textarea>
                @error('plain_lyrics')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group">
                <label class="admin-form-label" for="song-synced-lyrics">Lời đồng bộ theo thời gian</label>
                <textarea id="song-synced-lyrics" name="synced_lyrics" rows="12" maxlength="80000" class="ant-input admin-form-input @error('synced_lyrics') is-invalid @enderror" placeholder="[00:12.50]Dòng lời đầu tiên...">{{ old('synced_lyrics', $lyric?->synced_lyrics) }}</textarea>
                <p class="admin-field-help">Dùng định dạng LRC, ví dụ: [00:12.50]Dòng lời. Nếu có mốc từng từ dạng &lt;00:12.50&gt;từ, hệ thống sẽ chạy từng từ.</p>
                @error('synced_lyrics')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group admin-lyrics-audio-editor">
                <label class="admin-form-label" for="song-audio-file">Audio đầy đủ</label>
                @if($audioFile?->file_url)
                    <p class="admin-field-help">Đang có {{ $audioFile->source === 'cloudinary' ? 'file đã upload lên Cloudinary' : ($audioFile->source === 'nhaccuatui' ? 'audio đầy đủ từ NhacCuaTui, hệ thống sẽ tự làm mới URL khi phát' : 'URL audio đầy đủ') }}.</p>
                @else
                    <p class="admin-field-help">Nếu nguồn bên ngoài chưa có bản đầy đủ, upload file audio để nghe toàn bộ bài và chạy lời hết bài.</p>
                @endif
                <input id="song-audio-file" name="audio_file" type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/webm,.mp3,.wav,.ogg,.m4a,.aac,.webm" class="ant-input admin-form-input @error('audio_file') is-invalid @enderror">
                <input name="audio_url" type="url" value="{{ old('audio_url') }}" maxlength="500" class="ant-input admin-form-input @error('audio_url') is-invalid @enderror" placeholder="Hoặc dán URL audio đầy đủ https://...">
                @error('audio_file')<p class="admin-field-error">{{ $message }}</p>@enderror
                @error('audio_url')<p class="admin-field-error">{{ $message }}</p>@enderror
                @if($audioFile?->file_url)
                    <label class="admin-remove-audio"><input type="checkbox" name="remove_audio" value="1"> Xóa audio đầy đủ, quay về preview nếu có</label>
                @endif
            </div>
            <div class="admin-form-actions admin-resource-form-actions">
                <a href="{{ route('admin.analytics.song-views') }}" class="ant-btn">Hủy</a>
                <button class="ant-btn ant-btn-primary" type="submit">Lưu lời</button>
            </div>
        </form>
    </div>
</section>
@endsection

@push('scripts')
<script>
(() => {
    const audio = document.querySelector('#song-lyrics-audio');
    const editor = document.querySelector('#song-synced-lyrics');
    const linesHost = document.querySelector('[data-lyrics-lines]');
    const toggle = document.querySelector('[data-audio-toggle]');
    const playIcon = document.querySelector('[data-play-icon]');
    const playLabel = document.querySelector('[data-play-label]');
    const seek = document.querySelector('[data-audio-seek]');
    const currentTime = document.querySelector('[data-audio-current]');
    const duration = document.querySelector('[data-audio-duration]');
    const position = document.querySelector('[data-lyrics-position]');
    const state = document.querySelector('[data-audio-state]');
    const mute = document.querySelector('[data-audio-mute]');
    if (!editor || !linesHost) return;

    const toSeconds = (minutes, seconds) => (Number(minutes) * 60) + Number(seconds);
    const formatTime = (value) => {
        if (!Number.isFinite(value)) return '00:00';
        const total = Math.max(0, Math.floor(value));
        const minutes = Math.floor(total / 60);
        const seconds = String(total % 60).padStart(2, '0');
        return `${String(minutes).padStart(2, '0')}:${seconds}`;
    };

    const scrollToLine = (row, behavior = 'smooth') => {
        if (!row) return;

        const hostRect = linesHost.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const rowTop = linesHost.scrollTop + rowRect.top - hostRect.top;
        const centeredTop = rowTop - ((linesHost.clientHeight - rowRect.height) / 2);
        const maxTop = Math.max(0, linesHost.scrollHeight - linesHost.clientHeight);
        const targetTop = Math.min(maxTop, Math.max(0, centeredTop));

        if (Math.abs(linesHost.scrollTop - targetTop) < 2) return;

        linesHost.scrollTo({
            top: targetTop,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : behavior,
        });
    };

    const parseLyrics = (source) => source.split(/\r?\n/).flatMap((rawLine) => {
        const lineMatches = [...rawLine.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
        if (!lineMatches.length) return [];

        const text = rawLine.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
        if (!text) return [];

        const wordMatches = [...text.matchAll(/<(\d+):(\d+(?:\.\d+)?)>/g)];
        const words = wordMatches.map((match, index) => ({
            at: toSeconds(match[1], match[2]),
            text: text.slice(match.index + match[0].length, wordMatches[index + 1]?.index ?? text.length).trim(),
        })).filter((word) => word.text);

        return lineMatches.map((match) => ({
            at: toSeconds(match[1], match[2]),
            text: text.replace(/<\d+:\d+(?:\.\d+)?>(?=\S)/g, '').trim(),
            words,
        }));
    }).sort((left, right) => left.at - right.at);

    const render = () => {
        const parsed = parseLyrics(editor.value.trim());
        linesHost.replaceChildren();
        if (!parsed.length) {
            const empty = document.createElement('span');
            empty.className = 'admin-lyrics-empty';
            empty.textContent = 'Chưa có lời đồng bộ có mốc thời gian.';
            linesHost.append(empty);
            return;
        }

        parsed.forEach((line) => {
            const row = document.createElement('div');
            row.className = 'admin-lyrics-line';
            row.dataset.time = String(line.at);
            row.tabIndex = 0;
            row.title = `Tua đến ${formatTime(line.at)}`;
            row.setAttribute('aria-label', `Tua đến ${formatTime(line.at)}: ${line.text}`);
            row.addEventListener('click', () => {
                if (!audio) return;
                audio.currentTime = line.at;
                activeIndex = -1;
                scrollToLine(row);
                updatePlayer();
                audio.dispatchEvent(new Event('timeupdate'));
            });
            row.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                row.click();
            });
            if (line.words.length) {
                line.words.forEach((word) => {
                    const span = document.createElement('span');
                    span.className = 'admin-lyrics-word';
                    span.dataset.time = String(word.at);
                    span.textContent = `${word.text} `;
                    row.append(span);
                });
            } else {
                row.textContent = line.text;
            }
            linesHost.append(row);
        });
    };

    render();
    editor.addEventListener('input', render);
    if (!audio) return;

    const updatePlayer = () => {
        const now = formatTime(audio.currentTime);
        const total = formatTime(audio.duration);
        if (currentTime) currentTime.textContent = now;
        if (duration) duration.textContent = total;
        if (position) position.textContent = now;
        if (seek && Number.isFinite(audio.duration)) {
            seek.max = String(audio.duration);
            seek.value = String(audio.currentTime);
        }
    };

    const updatePlaybackState = () => {
        const playing = !audio.paused;
        if (playIcon) playIcon.textContent = playing ? '❚❚' : '▶';
        if (playLabel) playLabel.textContent = playing ? 'Tạm dừng' : 'Phát';
        if (state) state.textContent = playing ? 'Đang phát lời theo nhạc' : 'Đang chờ phát';
    };

    toggle?.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().catch(() => {
                if (state) state.textContent = 'Không thể phát audio này';
            });
        } else {
            audio.pause();
        }
    });
    seek?.addEventListener('input', () => {
        audio.currentTime = Number(seek.value);
        updatePlayer();
    });
    mute?.addEventListener('click', () => {
        audio.muted = !audio.muted;
        mute.textContent = audio.muted ? '×' : '⌁';
        mute.setAttribute('aria-label', audio.muted ? 'Bật tiếng' : 'Tắt tiếng');
    });
    audio.addEventListener('loadedmetadata', updatePlayer);
    audio.addEventListener('timeupdate', updatePlayer);
    audio.addEventListener('play', updatePlaybackState);
    audio.addEventListener('pause', updatePlaybackState);
    audio.addEventListener('ended', () => {
        updatePlaybackState();
        updatePlayer();
    });
    audio.addEventListener('error', () => {
        if (state) state.textContent = 'Không thể tải audio';
    });

    let activeIndex = -1;
    audio.addEventListener('timeupdate', () => {
        const rows = [...linesHost.querySelectorAll('.admin-lyrics-line')];
        if (!rows.length) return;

        let nextIndex = rows.reduce((current, row, index) => (
            Number(row.dataset.time) <= audio.currentTime ? index : current
        ), -1);

        rows.forEach((row, index) => {
            row.classList.toggle('is-active', index === nextIndex);
            row.classList.toggle('is-past', index < nextIndex);
            row.querySelectorAll('.admin-lyrics-word').forEach((word) => {
                word.classList.toggle('is-spoken', Number(word.dataset.time) <= audio.currentTime);
            });
        });

        if (nextIndex !== activeIndex && nextIndex >= 0) {
            scrollToLine(rows[nextIndex]);
            activeIndex = nextIndex;
        }
    });

    updatePlayer();
    updatePlaybackState();
})();
</script>
@endpush
