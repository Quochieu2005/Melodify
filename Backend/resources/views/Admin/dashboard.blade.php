@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Tổng quan</h2>
            <p class="admin-page-desc">Chào mừng trở lại! Đây là tổng quan hệ thống Melodify.</p>
        </div>
    </div>

    <div class="admin-stats-row">
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Bài hát</div>
                <div class="admin-stat-value">{{ number_format($stats['songs']) }}</div>
            </div>
        </div>
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Nghệ sĩ</div>
                <div class="admin-stat-value">{{ number_format($stats['artists']) }}</div>
            </div>
        </div>
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Người dùng</div>
                <div class="admin-stat-value">{{ number_format($stats['users']) }}</div>
            </div>
        </div>
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Lượt nghe hôm nay</div>
                <div class="admin-stat-value">{{ number_format($stats['playsToday']) }}</div>
            </div>
        </div>
    </div>

    <div class="admin-table-card ant-card">
        <div class="ant-card-head">
            <div class="ant-card-head-title">Bài hát mới nhất</div>
        </div>
        <div class="ant-card-body" style="padding: 0;">
            <div class="admin-table-wrapper">
                <table class="ant-table admin-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>Tên bài hát</th>
                            <th>Nghệ sĩ</th>
                            <th>Thể loại</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        @forelse($latestSongs as $song)
                            <tr><td>{{ $song->title }}</td><td>{{ $song->createdByArtist?->name ?? '—' }}</td><td>{{ $song->album?->title ?? 'Đĩa đơn' }}</td><td><span class="ant-tag {{ $song->status === 'published' ? 'ant-tag-green' : 'ant-tag-orange' }}">{{ $song->status ?? 'draft' }}</span></td></tr>
                        @empty
                            <tr><td colspan="4" class="admin-empty-state"><span class="admin-empty-icon">♪</span><strong>Chưa có bài hát</strong><span>Bài hát mới nhất sẽ xuất hiện tại đây.</span></td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection
