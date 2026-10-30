@extends('layouts.admin')

@section('content')
<section class="admin-page admin-album-detail-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.banners.index') }}" class="admin-back-link">← Quay lại danh sách banner</a>
            <h1 class="admin-page-title">{{ $item->title }}</h1>
            <p class="admin-page-description">Xem trước banner, đường dẫn đích và các nội dung đã liên kết.</p>
        </div>
        <div class="admin-page-header-actions"><a href="{{ route('admin.banners.edit', $item->slug) }}" class="ant-btn ant-btn-primary">Sửa banner</a></div>
    </div>

    <div class="admin-album-detail-grid">
        <article class="ant-card admin-album-summary-card">
            <div class="admin-album-cover">
                @if(filled($item->image_url))<img src="{{ $item->image_url }}" alt="Banner {{ $item->title }}">@else<span>Chưa có ảnh banner</span>@endif
            </div>
            <div class="admin-album-summary-copy">
                <span class="ant-tag {{ $item->status === 'active' ? 'ant-tag-green' : 'ant-tag-default' }}">{{ $item->status === 'active' ? 'Đang hiển thị' : 'Tạm ẩn' }}</span>
                <h2>{{ $item->title }}</h2>
                <p>Thứ tự hiển thị: {{ $item->sort_order }}</p>
                @if(filled($item->link_url))<a href="{{ $item->link_url }}" target="_blank" rel="noopener noreferrer" class="admin-action-link">Mở liên kết đích</a>@endif
            </div>
        </article>

        <article class="ant-card admin-album-songs-card">
            <div class="admin-resource-form-heading"><div><strong>Nội dung liên quan</strong><span>Các mục được chọn khi tạo hoặc sửa banner</span></div></div>
            <div class="admin-banner-related-groups">
                <div><strong>Nghệ sĩ</strong><p>@forelse($artists as $name)<span class="ant-tag ant-tag-blue">{{ $name }}</span>@empty<span class="admin-text-muted">Chưa liên kết.</span>@endforelse</p></div>
                <div><strong>Thể loại</strong><p>@forelse($genres as $name)<span class="ant-tag">{{ $name }}</span>@empty<span class="admin-text-muted">Chưa liên kết.</span>@endforelse</p></div>
                <div><strong>Chủ đề</strong><p>@forelse($topics as $name)<span class="ant-tag">{{ $name }}</span>@empty<span class="admin-text-muted">Chưa liên kết.</span>@endforelse</p></div>
                <div><strong>Playlist</strong><p>@forelse($playlists as $name)<span class="ant-tag">{{ $name }}</span>@empty<span class="admin-text-muted">Chưa liên kết.</span>@endforelse</p></div>
            </div>
        </article>
    </div>
</section>
@endsection
