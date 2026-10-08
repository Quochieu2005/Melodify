@extends('layouts.admin')

@section('content')
<section class="admin-page">
    @php($currentAdmin = auth('admin')->user())
    @php($canCreate = $currentAdmin?->hasAdminResourcePermission('songs', 'create'))
    @php($canUpdate = $currentAdmin?->hasAdminResourcePermission('songs', 'update'))
    @php($canDelete = $currentAdmin?->hasAdminResourcePermission('songs', 'delete'))

    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h1 class="admin-page-title">Quản lý bài hát</h1>
            <p class="admin-page-description">Theo dõi bài hát cùng album, nghệ sĩ, thể loại, chủ đề và playlist liên quan.</p>
        </div>
        <div class="admin-page-header-actions">
            @if($canDelete)
                <form action="{{ route('admin.songs.bulk-destroy') }}" method="POST" id="song-bulk-delete-form" class="admin-bulk-delete-form" data-confirm-delete-bulk data-confirm-resource="bài hát" data-confirm-count-selector="[data-song-select]:checked">
                    @csrf @method('DELETE')
                    <button type="submit" class="ant-btn admin-bulk-delete-btn" data-song-bulk-delete disabled>
                        Xóa đã chọn <span data-song-selected-count>(0)</span>
                    </button>
                </form>
                <form action="{{ route('admin.songs.destroy-all') }}" method="POST" id="song-delete-all-form" class="admin-bulk-delete-form" data-confirm-delete-all data-confirm-delete-count="{{ $items->total() }}" data-confirm-resource="bài hát">
                    @csrf @method('DELETE')
                    <button type="submit" class="ant-btn admin-delete-all-btn" @disabled($items->total() === 0)>Xóa toàn bộ</button>
                </form>
            @endif
            @if($canCreate)
                <a href="{{ route('admin.songs.create') }}" class="ant-btn ant-btn-primary admin-create-btn">
                    <span aria-hidden="true">+</span> Thêm bài hát
                </a>
            @endif
        </div>
    </div>

    <div class="ant-card admin-table-card">
        <div class="admin-table-toolbar">
            <div><strong>Danh sách bài hát</strong><span>{{ $items->total() }} mục</span></div>
            <span class="admin-table-hint">Cuộn ngang để xem đầy đủ thông tin</span>
            <form method="GET" action="{{ route('admin.songs.index') }}" class="admin-topic-filters">
                <label class="admin-topic-search">
                    <x-anticon name="search" aria-hidden="true" />
                    <input type="search" name="q" value="{{ $search }}" maxlength="100" placeholder="Tìm bài hát, slug, nghệ sĩ..." aria-label="Tìm kiếm bài hát">
                </label>
                <button type="submit" class="ant-btn">Tìm kiếm</button>
            </form>
        </div>
        <div class="admin-table-scroll">
            <table class="ant-table admin-data-table">
                <thead class="ant-table-thead">
                    <tr>
                        @if($canDelete)<th class="admin-select-column"><input type="checkbox" data-song-select-all aria-label="Chọn tất cả bài hát"></th>@endif
                        <th>Ảnh</th>
                        <th>Tên bài hát</th>
                        <th>Nghệ sĩ</th>
                        <th>Album</th>
                        <th>Thể loại</th>
                        <th>Chủ đề</th>
                        <th>Playlist</th>
                        <th>Ngày phát hành</th>
                        <th>Thời lượng</th>
                        <th>Trạng thái</th>
                        <th class="admin-table-actions">Hành động</th>
                    </tr>
                </thead>
                <tbody class="ant-table-tbody">
                    @forelse($rows as $row)
                        @php($song = $row['song'])
                        @php($seconds = (int) ($song->duration_seconds ?? 0))
                        <tr>
                            @if($canDelete)<td class="admin-select-column"><input type="checkbox" name="ids[]" value="{{ $song->getKey() }}" form="song-bulk-delete-form" data-song-select aria-label="Chọn bài hát {{ $song->title }}"></td>@endif
                            <td>
                                <div class="admin-table-avatar admin-song-cover">
                                    @if(filled($song->cover_url))
                                        <img src="{{ $song->cover_url }}" alt="Ảnh bìa {{ $song->title }}" loading="lazy">
                                    @else
                                        <span aria-label="Chưa có ảnh">♪</span>
                                    @endif
                                </div>
                            </td>
                            <td>
                                <strong>{{ $song->title }}</strong>
                                @if(filled($song->slug))<small class="admin-table-subtext">{{ $song->slug }}</small>@endif
                            </td>
                            <td>{{ $row['artist'] ?: '—' }}</td>
                            <td>{{ $row['album'] ?: '—' }}</td>
                            <td>{{ $row['genre'] ?: '—' }}</td>
                            <td>{{ $row['topic'] ?: '—' }}</td>
                            <td>{{ $row['playlist'] ?: '—' }}</td>
                            <td>{{ $song->release_date?->format('d/m/Y') ?: '—' }}</td>
                            <td>{{ $seconds > 0 ? floor($seconds / 60).':'.str_pad((string) ($seconds % 60), 2, '0', STR_PAD_LEFT) : '—' }}</td>
                            <td>
                                @php($statusLabel = ['published' => 'Đã phát hành', 'draft' => 'Bản nháp', 'blocked' => 'Đã chặn'][$song->status] ?? $song->status)
                                <span class="admin-status-indicator {{ $song->status === 'published' ? 'is-active' : '' }}">
                                    <span class="admin-status-toggle-dot" aria-hidden="true"></span>{{ $statusLabel }}
                                </span>
                            </td>
                            <td class="admin-table-actions">
                                @if($canUpdate)<a href="{{ route('admin.songs.edit', $song->getKey()) }}" class="admin-action-link">Sửa</a>@endif
                                @if($canDelete)
                                    <form action="{{ route('admin.songs.destroy', $song->getKey()) }}" method="POST" class="admin-inline-form" data-confirm-delete>
                                        @csrf @method('DELETE')
                                        <button type="submit" class="admin-action-link admin-action-danger">Xóa</button>
                                    </form>
                                @endif
                                @if(! $canUpdate && ! $canDelete)<span class="admin-text-muted">—</span>@endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ 11 + ($canDelete ? 1 : 0) }}" class="admin-empty-state">
                                <strong>Chưa có bài hát</strong>
                                <span>{{ $search !== '' ? 'Không tìm thấy bài hát phù hợp.' : 'Tạo hoặc nhập bài hát đầu tiên để bắt đầu quản lý.' }}</span>
                                @if($canCreate)<a href="{{ route('admin.songs.create') }}" class="ant-btn">Thêm bài hát</a>@endif
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($items->hasPages())<div class="admin-pagination">{{ $items->links() }}</div>@endif
    </div>
</section>
@endsection
