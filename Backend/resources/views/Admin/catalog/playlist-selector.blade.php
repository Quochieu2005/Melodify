@php($selectedPlaylistIds = collect(old('playlist_ids', $selectedPlaylistIds ?? []))->map(fn ($id) => (string) $id)->all())
<div class="admin-form-group admin-form-span">
    <label class="admin-form-label">Playlist thuộc {{ $playlistSelectorLabel ?? 'mục này' }}</label>
    <div class="admin-selection-panel @error('playlist_ids') is-invalid @enderror" data-selection-panel>
        <input type="search" class="ant-input admin-selection-search" placeholder="Tìm playlist trong kho..." data-selection-search aria-label="Tìm playlist liên quan">
        <div class="admin-selection-list">
            @forelse($playlists ?? [] as $playlist)
                <label class="admin-selection-option" data-selection-option>
                    <input type="checkbox" name="playlist_ids[]" value="{{ $playlist->getKey() }}" @checked(in_array((string) $playlist->getKey(), $selectedPlaylistIds, true))>
                    <span>
                        <strong>{{ $playlist->name }}</strong>
                        <small>{{ $playlist->type_custom ?: config('playlists.types.'.$playlist->type, 'Playlist') }} · {{ $playlist->status === 'active' ? 'Hoạt động' : 'Tạm ẩn' }}</small>
                    </span>
                </label>
            @empty
                <div class="admin-selection-empty">Chưa có playlist trong kho. Hãy tạo playlist trước.</div>
            @endforelse
        </div>
    </div>
    <p class="admin-field-help">Playlist là nơi chứa bài hát. Bạn có thể chọn nhiều playlist cho {{ mb_strtolower($playlistSelectorLabel ?? 'mục này') }}.</p>
    @error('playlist_ids')<p class="admin-field-error">{{ $message }}</p>@enderror
</div>
