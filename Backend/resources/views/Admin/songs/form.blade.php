@php($isEditing = $isEditing ?? filled($item))
<section class="admin-page admin-form-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.songs.index') }}" class="admin-back-link">← Quay lại danh sách bài hát</a>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa bài hát' : 'Thêm bài hát' }}</h1>
            <p class="admin-page-description">Nhập thông tin bài hát với thời lượng tối đa 24 giờ.</p>
        </div>
    </div>
    <form method="POST" action="{{ $isEditing ? route('admin.songs.update', $item->getKey()) : route('admin.songs.store') }}" class="ant-card admin-resource-form" autocomplete="off">
        @csrf
        @if($isEditing) @method('PUT') @endif
        <div class="admin-resource-form-heading"><div><strong>Thông tin bài hát</strong><span>Các trường có dấu * là bắt buộc.</span></div><span class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span></div>
        <div class="admin-form-grid">
            <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="song-title">Tên bài hát <span>*</span></label><input id="song-title" name="title" value="{{ old('title', $item?->title) }}" maxlength="160" class="ant-input admin-form-input @error('title') is-invalid @enderror" required>@error('title')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-slug">Slug <span>*</span></label><input id="song-slug" name="slug" value="{{ old('slug', $item?->slug) }}" maxlength="180" pattern="[A-Za-z0-9_-]+" class="ant-input admin-form-input @error('slug') is-invalid @enderror" required>@error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-album">Album</label><select id="song-album" name="album_id" class="ant-input admin-form-input @error('album_id') is-invalid @enderror"><option value="">Không thuộc album</option>@foreach($fields['album_id']['options'] ?? [] as $id => $label)<option value="{{ $id }}" @selected((string) old('album_id', $item?->album_id) === (string) $id)>{{ $label }}</option>@endforeach</select>@error('album_id')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-release-date">Ngày phát hành</label><input id="song-release-date" name="release_date" type="date" value="{{ old('release_date', $item?->release_date?->format('Y-m-d')) }}" max="{{ now()->toDateString() }}" class="ant-input admin-form-input @error('release_date') is-invalid @enderror">@error('release_date')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-duration">Thời lượng (giây)</label><input id="song-duration" name="duration_seconds" type="number" min="0" max="86400" step="1" inputmode="numeric" value="{{ old('duration_seconds', $item?->duration_seconds) }}" class="ant-input admin-form-input @error('duration_seconds') is-invalid @enderror"><p class="admin-field-help">Giới hạn từ 0 đến 86.400 giây.</p>@error('duration_seconds')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="song-status">Trạng thái <span>*</span></label><select id="song-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required>@foreach(['draft' => 'Bản nháp', 'published' => 'Đã phát hành', 'blocked' => 'Đã chặn'] as $value => $label)<option value="{{ $value }}" @selected(old('status', $item?->status ?? 'draft') === $value)>{{ $label }}</option>@endforeach</select>@error('status')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group admin-form-span"><label class="admin-checkbox-card"><input type="hidden" name="explicit" value="0"><input type="checkbox" name="explicit" value="1" @checked(old('explicit', $item?->explicit))><span><strong>Nội dung nhạy cảm</strong><small>Đánh dấu nếu bài hát có nội dung cần cảnh báo.</small></span></label></div>
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.songs.index') }}" class="ant-btn">Hủy</a><button class="ant-btn ant-btn-primary" type="submit">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo bài hát' }}</button></div>
    </form>
</section>
