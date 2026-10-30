@php($selectedSongIds = collect(old('song_ids', $selectedSongIds ?? []))->map(fn ($id) => (string) $id)->all())
<div class="admin-form-group admin-form-span">
    <label class="admin-form-label">Bài hát thuộc {{ $songSelectorLabel ?? 'mục này' }}</label>
    <div class="admin-selection-panel @error('song_ids') is-invalid @enderror" data-selection-panel>
        <input type="search" class="ant-input admin-selection-search" placeholder="Tìm bài hát trong kho..." data-selection-search aria-label="Tìm bài hát liên quan">
        <div class="admin-selection-list">
            @forelse($songs ?? [] as $song)
                <label class="admin-selection-option" data-selection-option>
                    <input type="checkbox" name="song_ids[]" value="{{ $song->getKey() }}" @checked(in_array((string) $song->getKey(), $selectedSongIds, true))>
                    <span><strong>{{ $song->title }}</strong><small>{{ $song->artist_name ?: 'Chưa có nghệ sĩ' }}</small></span>
                </label>
            @empty
                <div class="admin-selection-empty">Chưa có bài hát trong kho. Hãy nhập bài hát trước.</div>
            @endforelse
        </div>
    </div>
    <p class="admin-field-help">Chọn bài hát rồi lưu; liên kết sẽ hiển thị ở trang bài hát và khi sửa {{ mb_strtolower($songSelectorLabel ?? 'mục này') }}.</p>
    @error('song_ids')<p class="admin-field-error">{{ $message }}</p>@enderror
</div>
