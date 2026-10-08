@extends('layouts.admin')

@section('content')
<div class="admin-page">
    @php($currentAdmin = auth('admin')->user())
    @php($canUpdate = $currentAdmin?->hasAdminResourcePermission('comments', 'update'))
    @php($canDelete = $currentAdmin?->hasAdminResourcePermission('comments', 'delete'))
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Quản lý bình luận</h2>
            <p class="admin-page-desc">Tất cả bình luận từ người dùng.</p>
        </div>
    </div>
    <div class="admin-table-card ant-card">
        <div class="admin-table-toolbar"><div><strong>Bình luận</strong><span>{{ $comments->total() }} mục</span></div></div>
            <div class="admin-table-scroll">
                <table class="ant-table admin-data-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Người dùng</th>
                            <th>Bài hát</th>
                            <th>Nội dung</th>
                            <th>Ngày</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        @forelse($comments as $comment)
                            <tr><td>{{ $comments->firstItem() + $loop->index }}</td><td>{{ $comment->user?->name ?? $comment->user?->email ?? '—' }}</td><td>{{ $comment->song?->title ?? '—' }}</td><td title="{{ $comment->content }}">{{ $comment->content ?? '—' }}</td><td>{{ $comment->created_at?->format('d/m/Y H:i') ?? '—' }}</td><td><span class="ant-tag {{ $comment->status === 'hidden' ? 'ant-tag-red' : 'ant-tag-green' }}">{{ $comment->status === 'hidden' ? 'Đã ẩn' : 'Hiển thị' }}</span></td><td class="admin-table-actions">@if($canUpdate)<form method="POST" action="{{ route('admin.comments.update', $comment) }}" class="admin-inline-form">@csrf @method('PATCH')<button class="admin-action-link admin-action-button" type="submit">{{ $comment->status === 'hidden' ? 'Hiện' : 'Ẩn' }}</button></form>@endif @if($canDelete)<form method="POST" action="{{ route('admin.comments.destroy', $comment) }}" class="admin-inline-form" data-confirm-delete>@csrf @method('DELETE')<button class="admin-action-link admin-action-danger" type="submit">Xóa</button></form>@endif @if(! $canUpdate && ! $canDelete)<span class="admin-text-muted">—</span>@endif</td></tr>
                        @empty
                            <tr><td colspan="7" class="admin-empty-state"><span class="admin-empty-icon">…</span><strong>Chưa có bình luận</strong><span>Bình luận của người dùng sẽ xuất hiện tại đây.</span></td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        @if($comments->hasPages())<div class="admin-pagination">{{ $comments->links() }}</div>@endif
    </div>
</div>
@endsection
