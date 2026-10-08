@php($isEditing = $isEditing ?? filled($item))
@php($selectedSongIds = collect(old('song_ids', $selectedSongIds ?? []))->map(fn ($id) => (string) $id)->all())
<section class="admin-page admin-form-page admin-catalog-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.playlists.index') }}" class="admin-back-link">← Quay lại danh sách playlist</a>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa playlist' : 'Thêm playlist' }}</h1>
            <p class="admin-page-description">Playlist có thể là playlist hệ thống hoặc thuộc về một người dùng cụ thể.</p>
        </div>
    </div>

    <form method="POST" action="{{ $isEditing ? route('admin.playlists.update', $item->getKey()) : route('admin.playlists.store') }}" enctype="multipart/form-data" class="ant-card admin-resource-form admin-catalog-form" autocomplete="off">
        @csrf
        @if($isEditing) @method('PUT') @endif
        <div class="admin-resource-form-heading"><div><strong>Thông tin playlist</strong><span>Tên tối đa 180 ký tự, mô tả tối đa 2.500 ký tự.</span></div><span class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span></div>

        <div class="admin-catalog-form-layout">
            <div class="admin-form-grid admin-catalog-fields">
                <div class="admin-form-group"><label class="admin-form-label" for="playlist-name">Tên playlist <span>*</span></label><input id="playlist-name" name="name" data-slug-source="playlist-slug" value="{{ old('name', $item?->name) }}" maxlength="180" class="ant-input admin-form-input @error('name') is-invalid @enderror" required>@error('name')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="playlist-type">Nhóm playlist <span>*</span></label><select id="playlist-type" name="type" class="ant-input admin-form-input @error('type') is-invalid @enderror" data-playlist-type required>@foreach(config('playlists.types', []) as $value => $label)<option value="{{ $value }}" @selected(old('type', $item?->type ?? 'mood_today') === $value)>{{ $label }}</option>@endforeach</select><p class="admin-field-help">Chọn nhóm có sẵn hoặc chọn “Khác” để tự nhập.</p>@error('type')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group" data-playlist-type-custom-field hidden><label class="admin-form-label" for="playlist-type-custom">Tên nhóm playlist <span>*</span></label><input id="playlist-type-custom" name="type_custom" value="{{ old('type_custom', $item?->type_custom) }}" maxlength="80" class="ant-input admin-form-input @error('type_custom') is-invalid @enderror" data-playlist-type-custom placeholder="Ví dụ: Nhạc học bài, Nhạc cuối tuần..."><p class="admin-field-help">Tên nhóm này sẽ được lưu và hiển thị trong sidebar.</p>@error('type_custom')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="playlist-slug">Slug</label><div class="admin-slug-input-row"><input id="playlist-slug" name="slug" value="{{ old('slug', $item?->slug) }}" maxlength="220" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" class="ant-input admin-form-input @error('slug') is-invalid @enderror" placeholder="tu-dong-theo-ten"><button type="button" class="ant-btn admin-slug-reset" data-slug-reset="playlist-slug">Theo tên</button></div><p class="admin-field-help">Tự tạo theo tên, hoặc tự sửa; slug không được trùng.</p>@error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="playlist-user">Chủ sở hữu</label><select id="playlist-user" name="user_id" class="ant-input admin-form-input @error('user_id') is-invalid @enderror"><option value="">Playlist hệ thống</option>@foreach($fields['user_id']['options'] ?? [] as $id => $label)<option value="{{ $id }}" @selected((string) old('user_id', $item?->user_id) === (string) $id)>{{ $label }}</option>@endforeach</select><p class="admin-field-help">Có thể bỏ trống nếu là playlist hệ thống.</p>@error('user_id')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="playlist-visibility">Quyền hiển thị <span>*</span></label><select id="playlist-visibility" name="visibility" class="ant-input admin-form-input @error('visibility') is-invalid @enderror" required><option value="public" @selected(old('visibility', $item?->visibility ?? 'public') === 'public')>Công khai</option><option value="private" @selected(old('visibility', $item?->visibility) === 'private')>Riêng tư</option><option value="unlisted" @selected(old('visibility', $item?->visibility) === 'unlisted')>Không công khai</option></select>@error('visibility')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="playlist-description">Mô tả</label><textarea id="playlist-description" name="description" rows="5" maxlength="2500" class="ant-input admin-form-input @error('description') is-invalid @enderror">{{ old('description', $item?->description) }}</textarea><p class="admin-field-help">Không nhập HTML hoặc mã script.</p>@error('description')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="playlist-songs">Bài hát trong playlist</label><select id="playlist-songs" name="song_ids[]" multiple size="8" class="ant-input admin-form-input @error('song_ids') is-invalid @enderror">@forelse($songs ?? [] as $song)<option value="{{ $song->getKey() }}" @selected(in_array((string) $song->getKey(), $selectedSongIds, true))>{{ $song->title }}{{ $song->artist_name ? ' · '.$song->artist_name : '' }}</option>@empty<option disabled>Chưa có bài hát trong kho. Hãy nhập bài hát trước.</option>@endforelse</select><p class="admin-field-help">Chỉ chọn được bài hát đã nhập vào kho nhạc. Giữ Ctrl hoặc Cmd để chọn nhiều bài.</p>@error('song_ids')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="playlist-sort-order">Thứ tự hiển thị <span>*</span></label><input id="playlist-sort-order" name="sort_order" type="number" min="0" max="9999" step="1" inputmode="numeric" value="{{ old('sort_order', $item?->sort_order ?? 0) }}" class="ant-input admin-form-input @error('sort_order') is-invalid @enderror" required><p class="admin-field-help">Chỉ nhận số nguyên từ 0 đến 9.999.</p>@error('sort_order')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="playlist-status">Trạng thái <span>*</span></label><select id="playlist-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required><option value="active" @selected(old('status', $item?->status ?? 'active') === 'active')>Hoạt động</option><option value="inactive" @selected(old('status', $item?->status) === 'inactive')>Tạm ẩn</option></select>@error('status')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group admin-form-span"><label class="admin-checkbox-card"><input type="hidden" name="is_system" value="0"><input type="checkbox" name="is_system" value="1" @checked(old('is_system', $item?->is_system))><span><strong>Playlist hệ thống</strong><small>Khi bật, playlist sẽ không gắn với người dùng cụ thể.</small></span></label>@error('is_system')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            </div>

            @php($currentPublicId = $item?->cover_public_id)
            @php($currentImageUrl = $item?->cover_url)
            <aside class="admin-media-library">
                <div class="admin-media-library-heading"><div><strong>Ảnh bìa playlist</strong><span>Kho Cloudinary: melodify</span></div>@if(filled($currentImageUrl))<span class="ant-tag ant-tag-green">Đang dùng ảnh</span>@endif</div>
                <div class="admin-media-preview" data-playlist-image-preview>
                    @if(filled($currentImageUrl))
                        <img src="{{ $currentImageUrl }}" alt="Ảnh bìa playlist hiện tại">
                        <span>Ảnh hiện tại</span>
                    @else
                        <span>Chưa có ảnh xem trước</span>
                    @endif
                </div>
                <label class="admin-media-upload"><input type="file" name="image" accept="image/jpeg,image/png,image/webp" data-playlist-image-input><span class="admin-media-upload-icon">↑</span><span><strong>Tải ảnh mới</strong><small>JPG, PNG hoặc WEBP · tối đa 5MB</small></span></label>
                @error('image')<p class="admin-field-error">{{ $message }}</p>@enderror
                @error('image_asset_id')<p class="admin-field-error">{{ $message }}</p>@enderror
                <div class="admin-media-library-title">Chọn ảnh đã lưu</div>
                <div class="admin-media-grid">
                    @forelse($mediaAssets as $asset)
                        <label class="admin-media-card"><input type="radio" name="image_asset_id" value="{{ $asset->getKey() }}" data-playlist-image-library data-image-url="{{ $asset->secure_url }}" @checked((string) old('image_asset_id') === (string) $asset->getKey() || (!old('image_asset_id') && $currentPublicId === $asset->public_id))><img src="{{ $asset->secure_url }}" alt="{{ $asset->original_name ?: 'Ảnh Melodify' }}"><span>{{ \Illuminate\Support\Str::limit($asset->original_name ?: 'Ảnh đã lưu', 22) }}</span></label>
                    @empty
                        <div class="admin-media-empty">Chưa có ảnh trong kho. Hãy tải ảnh đầu tiên.</div>
                    @endforelse
                </div>
            </aside>
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.playlists.index') }}" class="ant-btn">Hủy</a><button type="submit" class="ant-btn ant-btn-primary">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo playlist' }}</button></div>
    </form>
</section>
