@extends('layouts.admin')

@section('content')
<section class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h1 class="admin-page-title">Duyệt bài hát tải lên</h1>
            <p class="admin-page-description">Nghe thử nội dung người dùng gửi trước khi phát hành hoặc từ chối.</p>
        </div>
        <span class="ant-tag ant-tag-orange">{{ $pendingCount }} bài đang chờ</span>
    </div>

    @if($errors->any())
        <div class="ant-card" role="alert" style="margin-bottom:16px;padding:14px 18px;color:#a61d24;border-color:#ffccc7;background:#fff2f0;">
            {{ $errors->first() }}
        </div>
    @endif

    <div class="admin-table-card ant-card">
        <div class="admin-table-toolbar">
            <div><strong>Hàng chờ kiểm duyệt</strong><span>{{ $items->total() }} mục</span></div>
            <form method="GET" action="{{ route('admin.uploads.review.index') }}" class="admin-table-filter-form">
                <label class="admin-table-search">
                    <x-anticon name="search" aria-hidden="true" />
                    <input type="search" name="q" value="{{ $search }}" maxlength="100" placeholder="Tìm tên bài, nghệ sĩ, người tải..." aria-label="Tìm bài hát cần duyệt">
                </label>
                <button type="submit" class="ant-btn">Tìm kiếm</button>
                @if($search !== '')<a href="{{ route('admin.uploads.review.index') }}" class="admin-action-link">Xóa lọc</a>@endif
            </form>
        </div>

        <div class="admin-table-scroll">
            <table class="ant-table admin-data-table">
                <thead class="ant-table-thead">
                    <tr>
                        <th>#</th>
                        <th>Bài hát</th>
                        <th>Người tải lên</th>
                        <th>Thời gian gửi</th>
                        <th>Nghe thử</th>
                        <th>Trạng thái</th>
                        <th>Quyết định</th>
                    </tr>
                </thead>
                <tbody class="ant-table-tbody">
                    @forelse($rows as $row)
                        @php($song = $row['song'])
                        <tr>
                            <td>{{ $items->firstItem() + $loop->index }}</td>
                            <td>
                                <div style="display:flex;align-items:center;gap:12px;min-width:220px;">
                                    <div class="admin-table-avatar admin-song-cover" style="flex:0 0 48px;width:48px;height:48px;">
                                        @if(filled($song->cover_url))
                                            <img src="{{ $song->cover_url }}" alt="Ảnh bìa {{ $song->title }}" loading="lazy">
                                        @else
                                            <span aria-label="Chưa có ảnh">♪</span>
                                        @endif
                                    </div>
                                    <div>
                                        <strong>{{ $song->title }}</strong>
                                        <small class="admin-table-subtext">{{ $song->artist_name ?: 'Chưa có nghệ sĩ' }}</small>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <strong>{{ $row['uploader_label'] }}</strong>
                                @if($row['uploader']?->email && $row['uploader']?->name)
                                    <small class="admin-table-subtext">{{ $row['uploader']->email }}</small>
                                @endif
                            </td>
                            <td>{{ $song->created_at?->timezone(config('app.timezone', 'Asia/Ho_Chi_Minh'))->format('d/m/Y H:i') ?: '—' }}</td>
                            <td>
                                @if($row['audio']?->file_url)
                                    <audio controls preload="none" src="{{ $row['audio']->file_url }}" aria-label="Nghe thử {{ $song->title }}" style="width:220px;max-width:100%;height:36px;">Trình duyệt không hỗ trợ phát audio.</audio>
                                @else
                                    <span class="ant-tag ant-tag-red">Thiếu file audio</span>
                                @endif
                            </td>
                            <td><span class="ant-tag ant-tag-orange">Đang chờ duyệt</span></td>
                            <td>
                                <div style="display:grid;gap:8px;min-width:190px;">
                                    <form method="POST" action="{{ route('admin.uploads.review.approve', $song->getKey()) }}" onsubmit="return confirm('Duyệt và phát hành bài hát này?')">
                                        @csrf
                                        <button type="submit" class="ant-btn ant-btn-primary" style="width:100%;">Duyệt &amp; phát hành</button>
                                    </form>
                                    <form method="POST" action="{{ route('admin.uploads.review.reject', $song->getKey()) }}" style="display:grid;gap:6px;">
                                        @csrf
                                        <label class="sr-only" for="review-note-{{ $song->getKey() }}">Lý do từ chối bài {{ $song->title }}</label>
                                        <input id="review-note-{{ $song->getKey() }}" type="text" name="note" maxlength="500" minlength="3" required class="ant-input" placeholder="Lý do từ chối...">
                                        <button type="submit" class="ant-btn" style="width:100%;color:#a61d24;">Từ chối</button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="admin-empty-state"><span class="admin-empty-icon">✓</span><strong>{{ $search !== '' ? 'Không tìm thấy bài hát phù hợp' : 'Không có bài hát đang chờ duyệt' }}</strong><span>{{ $search !== '' ? 'Thử từ khóa khác hoặc xóa bộ lọc.' : 'Bài người dùng tải lên sẽ xuất hiện tại đây.' }}</span></td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($items->hasPages())<div class="admin-pagination">{{ $items->links() }}</div>@endif
    </div>
</section>
@endsection
