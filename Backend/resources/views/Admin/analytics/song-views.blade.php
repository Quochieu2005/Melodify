@extends('layouts.admin')

@section('content')
<section class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h1 class="admin-page-title">Phân tích bài hát</h1>
            <p class="admin-page-description">Theo dõi lượt nghe, yêu thích, chia sẻ và tình trạng lời bài hát.</p>
        </div>
    </div>

    <div class="admin-stats-row">
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Tổng lượt xem</div>
                <strong class="admin-stat-value">{{ number_format($totalViews) }}</strong>
            </div>
        </div>
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Tổng lượt yêu thích</div>
                <strong class="admin-stat-value">{{ number_format($totalFavorites) }}</strong>
            </div>
        </div>
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Tổng lượt chia sẻ</div>
                <strong class="admin-stat-value">{{ number_format($totalShares) }}</strong>
            </div>
        </div>
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Bài đã có lời</div>
                <strong class="admin-stat-value">{{ number_format($songsWithLyrics) }}</strong>
            </div>
        </div>
    </div>

    <div class="ant-card admin-table-card">
        <div class="admin-table-toolbar">
            <div><strong>Bảng xếp hạng {{ $sortLabel }}</strong><span>{{ $items->total() }} bài hát</span></div>
            <form method="GET" action="{{ route('admin.analytics.song-views') }}" class="admin-topic-filters">
                <label class="admin-topic-search">
                    <x-anticon name="search" aria-hidden="true" />
                    <input type="search" name="q" value="{{ $search }}" maxlength="100" placeholder="Tìm bài hát, nghệ sĩ..." aria-label="Tìm kiếm bài hát">
                </label>
                <select name="period" class="ant-input" aria-label="Khoảng thời gian">
                    <option value="all" @selected($period === 'all')>Tất cả thời gian</option>
                    <option value="30" @selected($period === '30')>30 ngày qua</option>
                    <option value="7" @selected($period === '7')>7 ngày qua</option>
                </select>
                <select name="sort" class="ant-input" aria-label="Tiêu chí xếp hạng">
                    <option value="views" @selected($sort === 'views')>Xếp theo lượt xem</option>
                    <option value="favorites" @selected($sort === 'favorites')>Xếp theo yêu thích</option>
                    <option value="shares" @selected($sort === 'shares')>Xếp theo chia sẻ</option>
                </select>
                <button type="submit" class="ant-btn">Lọc</button>
            </form>
        </div>
        <div class="admin-table-scroll">
            <table class="ant-table admin-data-table">
                <thead class="ant-table-thead">
                    <tr>
                        <th>Hạng</th>
                        <th>Ảnh</th>
                        <th>Bài hát</th>
                        <th>Nghệ sĩ</th>
                        <th>Thời lượng</th>
                        <th>Lượt xem</th>
                        <th>Yêu thích</th>
                        <th>Chia sẻ</th>
                        <th>Trạng thái</th>
                    </tr>
                </thead>
                <tbody class="ant-table-tbody">
                    @forelse($items as $index => $item)
                        @php($song = $item['song'])
                        @php($seconds = (int) ($song->duration_seconds ?? 0))
                        <tr>
                            <td><strong>{{ ($items->firstItem() ?? 1) + $index }}</strong></td>
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
                                <a href="{{ route('admin.songs.edit', $song->getKey()) }}" class="admin-action-link"><strong>{{ $song->title }}</strong></a>
                                @if(filled($song->slug))<small class="admin-table-subtext">{{ $song->slug }}</small>@endif
                            </td>
                            <td>{{ $item['artist'] ?: 'Chưa có nghệ sĩ' }}</td>
                            <td>{{ $seconds > 0 ? floor($seconds / 60).':'.str_pad((string) ($seconds % 60), 2, '0', STR_PAD_LEFT) : '—' }}</td>
                            <td><span class="ant-tag ant-tag-blue">{{ number_format($item['views']) }}</span></td>
                            <td><span class="ant-tag ant-tag-green">{{ number_format($item['favorites']) }}</span></td>
                            <td><span class="ant-tag">{{ number_format($item['shares']) }}</span></td>
                            <td><span class="admin-status-toggle {{ $song->status === 'published' ? 'is-active' : 'is-inactive' }}"><span class="admin-status-toggle-dot" aria-hidden="true"></span>{{ $song->status === 'published' ? 'Đã phát hành' : 'Bản nháp' }}</span></td>
                        </tr>
                    @empty
                        <tr><td colspan="9" class="admin-empty-state"><strong>Chưa có bài hát</strong><span>Hãy nhập bài hát vào kho nhạc trước.</span></td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($items->hasPages())<div class="admin-pagination">{{ $items->links() }}</div>@endif
    </div>
</section>
@endsection
