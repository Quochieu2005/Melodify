@extends('layouts.admin')

@section('content')
@php($imageUrl = $item->image_url ?? $item->cover_url)
<section class="admin-page admin-album-detail-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route("admin.$resource.index") }}" class="admin-back-link">← Quay lại danh sách {{ $resourceTitle }}</a>
            <h1 class="admin-page-title">{{ $item->name }}</h1>
            <p class="admin-page-description">Thông tin {{ $resourceTitle }} và các bài hát đã được liên kết.</p>
        </div>
        <div class="admin-page-header-actions"><a href="{{ route("admin.$resource.edit", $item->getKey()) }}" class="ant-btn ant-btn-primary">Sửa {{ $resourceTitle }}</a></div>
    </div>

    <div class="admin-album-detail-grid">
        <article class="ant-card admin-album-summary-card">
            <div class="admin-album-cover">@if(filled($imageUrl))<img src="{{ $imageUrl }}" alt="Ảnh {{ $item->name }}">@else<span>Chưa có ảnh đại diện</span>@endif</div>
            <div class="admin-album-summary-copy">
                <span class="ant-tag {{ $item->status === 'active' ? 'ant-tag-green' : 'ant-tag-default' }}">{{ $item->status === 'active' ? 'Hoạt động' : 'Tạm ẩn' }}</span>
                <h2>{{ $item->name }}</h2>
                @if(filled($item->description))<p>{{ $item->description }}</p>@endif
            </div>
        </article>
        <article class="ant-card admin-album-songs-card">
            <div class="admin-resource-form-heading"><div><strong>Bài hát thuộc {{ $resourceTitle }}</strong><span>{{ $songs->total() }} bài hát</span></div></div>
            <div class="admin-album-song-list">@forelse($songs as $index => $song)<div class="admin-album-song-row"><span class="admin-album-song-number">{{ str_pad((string) (($songs->firstItem() ?? 1) + $index), 2, '0', STR_PAD_LEFT) }}</span><div><strong>{{ $song->title }}</strong><small>{{ $song->artist_name ?: 'Chưa có nghệ sĩ' }}</small></div><span>{{ $song->duration_seconds ? gmdate('i:s', (int) $song->duration_seconds) : '—' }}</span><a href="{{ route('admin.songs.edit', $song->getKey()) }}" class="admin-action-link">Sửa bài hát</a></div>@empty<div class="admin-selection-empty">Chưa có bài hát nào. Mở phần Sửa để chọn bài hát.</div>@endforelse</div>
            @if($songs->hasPages())<div class="admin-pagination">{{ $songs->links() }}</div>@endif
        </article>
    </div>
</section>
@endsection
