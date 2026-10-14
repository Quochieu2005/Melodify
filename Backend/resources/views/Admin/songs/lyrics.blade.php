@extends('layouts.admin')

@section('content')
<section class="admin-page admin-lyrics-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <a href="{{ route('admin.analytics.song-views') }}" class="admin-back-link">← Quay lại phân tích bài hát</a>
            <h1 class="admin-page-title">Lời bài hát</h1>
            <p class="admin-page-description">Xem lời thường, lời đồng bộ theo thời gian và nghe bài hát.</p>
        </div>
        <div class="admin-page-header-actions">
            <form method="POST" action="{{ route('admin.songs.lyrics.sync', $song->getKey()) }}">
                @csrf
                <button type="submit" class="ant-btn admin-lyrics-source-button">Tải LRC đồng bộ từ nguồn</button>
            </form>
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
                        @if((int) ($song->is_hot ?? 0) === 1)
                            <span class="admin-lyrics-separator">•</span>
                            <span class="ant-tag ant-tag-red">HOT · nghe thử 30s</span>
                        @endif
                    </div>
                </div>
            </div>

            @if(filled($audioUrl))
                <div class="admin-lyrics-player">
                    <audio id="song-lyrics-audio" class="admin-lyrics-native-audio" preload="metadata" src="{{ $audioUrl }}" data-audio-duration-seconds="{{ (int) ($audioFile?->duration_seconds ?? 0) }}" aria-label="Audio {{ $song->title }}"></audio>
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
                @if((int) ($song->is_hot ?? 0) === 1)
                    <div class="admin-lyrics-preview-player">
                        <div class="admin-lyrics-preview-heading">
                            <div>
                                <strong>Audio nghe thử 30 giây</strong>
                                <span>Kiểm tra đúng giới hạn dành cho người dùng của bài hot.</span>
                            </div>
                            <span class="ant-tag ant-tag-red">HOT · 30s</span>
                        </div>
                        <audio id="song-lyrics-preview-audio" class="admin-lyrics-preview-audio" preload="metadata" src="{{ $audioUrl }}" aria-label="Audio nghe thử 30 giây {{ $song->title }}"></audio>
                        <div class="admin-lyrics-preview-controls" data-preview-controls>
                            <button type="button" class="admin-lyrics-preview-toggle" data-preview-toggle aria-label="Phát audio nghe thử">▶</button>
                            <span class="admin-lyrics-time" data-preview-current>00:00</span>
                            <input class="admin-lyrics-preview-seek" data-preview-seek type="range" min="0" max="30" step="0.01" value="0" aria-label="Vị trí audio nghe thử">
                            <span class="admin-lyrics-time">00:30</span>
                            <button type="button" class="admin-lyrics-preview-mute" data-preview-mute aria-label="Tắt tiếng audio nghe thử">⌁</button>
                        </div>
                    </div>
                @endif
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
                    <span class="admin-lyrics-empty">{{ ($hasTimedLyrics ?? false) ? 'Đang tải lời đồng bộ...' : 'Chưa có lời đồng bộ có mốc thời gian.' }}</span>
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
                <div class="admin-lyrics-editor-label">
                    <label class="admin-form-label" for="song-lyrics">Lời thường (không có mốc thời gian)</label>
                    <button type="button" class="ant-btn admin-lyrics-generate-button" data-generate-synced-lyrics>Ước tính mốc từ lời thường</button>
                </div>
                <textarea id="song-lyrics" name="plain_lyrics" rows="12" maxlength="50000" class="ant-input admin-form-input @error('plain_lyrics') is-invalid @enderror" placeholder="Nhập lời thường từ API hoặc nhập thủ công...">{{ old('plain_lyrics', $lyric?->plain_lyrics ?? ($lyric?->synced_lyrics ? null : $lyric?->content)) }}</textarea>
                <p class="admin-field-help" data-sync-generator-status>Lời thường từ API chỉ là phần chữ, không có thời gian. Nút trên chỉ tạo mốc tạm để chỉnh thủ công.</p>
                @error('plain_lyrics')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group">
                <label class="admin-form-label" for="song-synced-lyrics">Lời đồng bộ (LRC có mốc thời gian)</label>
                <textarea id="song-synced-lyrics" name="synced_lyrics" rows="12" maxlength="80000" class="ant-input admin-form-input @error('synced_lyrics') is-invalid @enderror" placeholder="API sẽ điền LRC nếu nguồn có; ví dụ [00:12.50]Dòng lời...">{{ old('synced_lyrics', $lyric?->synced_lyrics) }}</textarea>
                <p class="admin-field-help">Đây là dữ liệu riêng với lời thường. Chỉ nội dung có mốc dạng [00:12.50] mới được chạy theo audio; mốc từng từ dạng &lt;00:12.50&gt;từ sẽ chạy chi tiết hơn.</p>
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
    const plainEditor = document.querySelector('#song-lyrics');
    const editor = document.querySelector('#song-synced-lyrics');
    const linesHost = document.querySelector('[data-lyrics-lines]');
    const generateSyncedLyrics = document.querySelector('[data-generate-synced-lyrics]');
    const syncGeneratorStatus = document.querySelector('[data-sync-generator-status]');
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

    const formatLrcTime = (value) => {
        const safeValue = Math.max(0, Number(value) || 0);
        const minutes = Math.floor(safeValue / 60);
        const seconds = (safeValue % 60).toFixed(2).padStart(5, '0');
        return `[${String(minutes).padStart(2, '0')}:${seconds}]`;
    };

    const getAudioDuration = () => {
        const loadedDuration = Number(audio?.duration);
        if (Number.isFinite(loadedDuration) && loadedDuration > 0) return loadedDuration;

        const savedDuration = Number(audio?.dataset.audioDurationSeconds);
        return Number.isFinite(savedDuration) && savedDuration > 0 ? savedDuration : 0;
    };

    generateSyncedLyrics?.addEventListener('click', () => {
        const sourceLines = (plainEditor?.value || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (!sourceLines.length) {
            if (syncGeneratorStatus) syncGeneratorStatus.textContent = 'Hãy nhập lời bài hát trước khi tạo đồng bộ.';
            plainEditor?.focus();
            return;
        }

        if (editor?.value.trim() && !window.confirm('Lời đồng bộ hiện tại sẽ bị thay thế. Bạn có muốn tiếp tục không?')) return;

        const duration = getAudioDuration();
        if (!duration) {
            if (syncGeneratorStatus) syncGeneratorStatus.textContent = 'Chưa đọc được thời lượng audio. Hãy chờ audio tải xong rồi thử lại.';
            audio?.load();
            return;
        }

        const firstLineAt = Math.min(1, Math.max(0, duration - 1));
        const lastLineAt = Math.max(firstLineAt, duration - 1);
        const step = sourceLines.length > 1 ? (lastLineAt - firstLineAt) / (sourceLines.length - 1) : 0;
        const generated = sourceLines
            .map((line, index) => `${formatLrcTime(firstLineAt + (step * index))}${line}`)
            .join('\n');

        if (editor) {
            editor.value = generated;
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (syncGeneratorStatus) syncGeneratorStatus.textContent = `Đã tạo ${sourceLines.length} mốc thời gian ước tính. Hãy nghe và chỉnh lại nếu cần.`;
    });

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

    const previewAudio = document.querySelector('#song-lyrics-preview-audio');
    const previewToggle = document.querySelector('[data-preview-toggle]');
    const previewSeek = document.querySelector('[data-preview-seek]');
    const previewCurrent = document.querySelector('[data-preview-current]');
    const previewMute = document.querySelector('[data-preview-mute]');
    const previewLimitSeconds = 30;
    if (previewAudio) {
        const updatePreviewPlayer = () => {
            const previewTime = Math.min(previewLimitSeconds, Math.max(0, previewAudio.currentTime || 0));
            if (previewCurrent) previewCurrent.textContent = formatTime(previewTime);
            if (previewSeek) previewSeek.value = String(previewTime);
            if (previewTime >= previewLimitSeconds) {
                previewAudio.currentTime = previewLimitSeconds;
                previewAudio.pause();
            }
            if (previewToggle) previewToggle.textContent = previewAudio.paused ? '▶' : '❚❚';
        };

        previewToggle?.addEventListener('click', () => {
            if (previewAudio.paused) {
                if (previewAudio.currentTime >= previewLimitSeconds) previewAudio.currentTime = 0;
                previewAudio.play().catch(() => {});
            } else {
                previewAudio.pause();
            }
        });
        previewSeek?.addEventListener('input', () => {
            previewAudio.currentTime = Math.min(previewLimitSeconds, Number(previewSeek.value));
            updatePreviewPlayer();
        });
        previewMute?.addEventListener('click', () => {
            previewAudio.muted = !previewAudio.muted;
            previewMute.textContent = previewAudio.muted ? '×' : '⌁';
            previewMute.setAttribute('aria-label', previewAudio.muted ? 'Bật tiếng audio nghe thử' : 'Tắt tiếng audio nghe thử');
        });
        previewAudio.addEventListener('loadedmetadata', updatePreviewPlayer);
        previewAudio.addEventListener('timeupdate', updatePreviewPlayer);
        previewAudio.addEventListener('seeking', updatePreviewPlayer);
        previewAudio.addEventListener('play', updatePreviewPlayer);
        previewAudio.addEventListener('pause', updatePreviewPlayer);
        previewAudio.addEventListener('ended', updatePreviewPlayer);
        updatePreviewPlayer();
    }

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
