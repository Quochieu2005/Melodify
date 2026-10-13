@extends('layouts.admin')

@section('content')
<section class="admin-page">
    @php($currentAdmin = auth('admin')->user())
    @php($canCreate = $currentAdmin?->hasAdminResourcePermission('songs', 'create'))
    @php($canUpdate = $currentAdmin?->hasAdminResourcePermission('songs', 'update'))
    @php($canDelete = $currentAdmin?->hasAdminResourcePermission('songs', 'delete'))
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h1 class="admin-page-title">Video nhạc</h1>
            <p class="admin-page-description">Quản lý kho video nhạc độc lập. Dữ liệu nằm riêng trong collection song_videos.</p>
        </div>
        <div class="admin-page-header-actions">
            @if($canDelete)
                <form action="{{ route('admin.videos.bulk-destroy') }}" method="POST" id="video-bulk-delete-form" class="admin-bulk-delete-form" data-confirm-delete-bulk data-confirm-resource="video nhạc" data-confirm-count-selector="[data-video-select]:checked">
                    @csrf @method('DELETE')
                    <button type="submit" class="ant-btn admin-bulk-delete-btn" data-video-bulk-delete disabled>Xóa đã chọn <span data-video-selected-count>(0)</span></button>
                </form>
                <form action="{{ route('admin.videos.destroy-all') }}" method="POST" class="admin-bulk-delete-form" data-confirm-delete-all data-confirm-delete-count="{{ $items->total() }}" data-confirm-resource="video nhạc">
                    @csrf @method('DELETE')
                    <button type="submit" class="ant-btn admin-delete-all-btn" @disabled($items->total() === 0)>Xóa toàn bộ</button>
                </form>
            @endif
            @if($canCreate)<a href="{{ route('admin.videos.create') }}" class="ant-btn ant-btn-primary admin-create-btn"><span aria-hidden="true">+</span> Upload video</a>@endif
        </div>
    </div>

    <div class="ant-card admin-table-card">
        <div class="admin-table-toolbar">
            <div><strong>Danh sách video</strong><span>{{ $items->total() }} mục</span></div>
            <form method="GET" action="{{ route('admin.videos.index') }}" class="admin-topic-filters">
                <label class="admin-topic-search"><x-anticon name="search" aria-hidden="true" /><input type="search" name="q" value="{{ $search }}" maxlength="100" placeholder="Tìm tên video..." aria-label="Tìm kiếm video"></label>
                <button type="submit" class="ant-btn">Tìm kiếm</button>
            </form>
        </div>
        <div class="admin-table-scroll">
            <table class="ant-table admin-data-table">
                <thead class="ant-table-thead"><tr>@if($canDelete)<th class="admin-select-column"><input type="checkbox" data-video-select-all aria-label="Chọn tất cả video"></th>@endif<th>Video</th><th>Slug</th><th>Nghệ sĩ</th><th>Nguồn</th><th>Thời lượng</th><th>Trạng thái</th><th class="admin-table-actions">Hành động</th></tr></thead>
                <tbody class="ant-table-tbody">
                    @forelse($items as $item)
                        @php($seconds = (int) ($item->duration_seconds ?? 0))
                        <tr>
                            @php($videoRouteKey = $item->slug ?: $item->getKey())
                            @if($canDelete)<td class="admin-select-column"><input type="checkbox" name="ids[]" value="{{ $item->getKey() }}" form="video-bulk-delete-form" data-video-select aria-label="Chọn video {{ $item->title }}"></td>@endif
                            <td>
                                @if($item->source === 'youtube' && filled($item->external_id))
                                    <iframe class="admin-video-table-preview" src="https://www.youtube.com/embed/{{ $item->external_id }}" title="{{ $item->title }}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                                    <strong>{{ $item->title }}</strong>
                                    <small class="admin-table-subtext">YouTube · URL đã mã hóa</small>
                                @elseif(filled($item->video_url))
                                    <video class="admin-video-table-preview" controls preload="metadata" poster="{{ $item->thumbnail_url ?: '' }}"><source src="{{ $item->video_url }}"></video>
                                    <strong>{{ $item->title }}</strong>
                                    <small class="admin-table-subtext">{{ $item->video_url }}</small>
                                @else
                                    <strong>{{ $item->title }}</strong>
                                    <small class="admin-table-subtext">Chưa có đường dẫn phát</small>
                                @endif
                            </td>
                            <td><code>{{ $item->slug ?: 'Chưa có slug' }}</code></td>
                            <td>{{ collect($item->artists ?? [])->map(fn ($artist): string => trim((string) ($artist['name'] ?? '')).(filled($artist['country'] ?? null) ? ' · '.$artist['country'] : ''))->filter()->join(', ') ?: '—' }}</td>
                            <td>{{ $item->source === 'cloudinary' ? 'Cloudinary' : ($item->source === 'youtube' ? 'YouTube' : ($item->source === 'nhaccuatui' ? 'NhacCuaTui' : 'URL bên ngoài')) }}</td>
                            <td>{{ $seconds > 0 ? floor($seconds / 60).':'.str_pad((string) ($seconds % 60), 2, '0', STR_PAD_LEFT) : '—' }}</td>
                            <td><span class="admin-status-indicator {{ $item->status === 'active' ? 'is-active' : '' }}"><span class="admin-status-toggle-dot" aria-hidden="true"></span>{{ $item->status === 'active' ? 'Đang hiển thị' : 'Tạm ẩn' }}</span></td>
                            <td class="admin-table-actions">
                                @if($item->source === 'youtube' || filled($item->video_url_encrypted) || filled($item->video_url))
                                    <a class="admin-action-link" href="{{ route('admin.videos.show', $videoRouteKey) }}">Xem/nghe</a>
                                    <button type="button" class="admin-action-link" data-video-source data-source-url="{{ route('admin.videos.source', $videoRouteKey) }}">Xem link</button><span class="admin-table-subtext admin-video-source-output" data-video-source-output></span>
                                @endif
                                @if($canUpdate)<a href="{{ route('admin.videos.edit', $videoRouteKey) }}" class="admin-action-link">Sửa</a>@endif
                                @if($canDelete)<form action="{{ route('admin.videos.destroy', $videoRouteKey) }}" method="POST" class="admin-inline-form" data-confirm-delete>@csrf @method('DELETE')<button type="submit" class="admin-action-link admin-action-danger">Xóa</button></form>@endif
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="{{ 7 + ($canDelete ? 1 : 0) }}" class="admin-empty-state"><strong>Chưa có video nhạc</strong><span>Upload video đầu tiên hoặc lấy video từ YouTube.</span>@if($canCreate)<a href="{{ route('admin.videos.create') }}" class="ant-btn">Upload video</a>@endif</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($items->hasPages())<div class="admin-pagination">{{ $items->links() }}</div>@endif
    </div>
</section>
@endsection

@push('scripts')
<script>
(() => {
    const selectAll = document.querySelector('[data-video-select-all]');
    const selects = [...document.querySelectorAll('[data-video-select]')];
    const bulkButton = document.querySelector('[data-video-bulk-delete]');
    const count = document.querySelector('[data-video-selected-count]');

    document.querySelectorAll('[data-video-source]').forEach((button) => {
        button.addEventListener('click', async () => {
            const output = button.parentElement?.querySelector('[data-video-source-output]');
            button.disabled = true;
            if (output) output.textContent = 'Đang giải mã...';
            try {
                const response = await fetch(button.dataset.sourceUrl, {headers: {'Accept': 'application/json'}});
                const payload = await response.json();
                if (!response.ok || !payload.url) throw new Error(payload.message || 'Không lấy được đường dẫn.');
                if (output) {
                    output.textContent = '';
                    const link = document.createElement('a');
                    link.href = payload.url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = 'Mở link';
                    output.appendChild(link);
                }
            } catch (error) {
                if (output) output.textContent = error.message || 'Không giải mã được link.';
            } finally {
                button.disabled = false;
            }
        });
    });

    if (!selects.length || !bulkButton) return;

    const update = () => {
        const selected = selects.filter((input) => input.checked).length;
        bulkButton.disabled = selected === 0;
        if (count) count.textContent = `(${selected})`;
        if (selectAll) {
            selectAll.checked = selected > 0 && selected === selects.length;
            selectAll.indeterminate = selected > 0 && selected < selects.length;
        }
    };

    selectAll?.addEventListener('change', () => {
        selects.forEach((input) => { input.checked = selectAll.checked; });
        update();
    });
    selects.forEach((input) => input.addEventListener('change', update));
    update();
})();
</script>
@endpush
