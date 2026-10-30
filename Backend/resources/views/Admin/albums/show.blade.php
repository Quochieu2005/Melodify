@extends('layouts.admin')

@section('content')
<section class="admin-page admin-album-detail-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.albums.index') }}" class="admin-back-link">← Quay lại danh sách album</a>
            <h1 class="admin-page-title">{{ $album->title }}</h1>
            <p class="admin-page-description">Thông tin album và các bài hát hiện thuộc album này.</p>
        </div>
        <div class="admin-page-header-actions"><a href="{{ route('admin.albums.edit', $album->getKey()) }}" class="ant-btn ant-btn-primary">Sửa album</a></div>
    </div>

    <div class="admin-album-detail-grid">
        <article class="ant-card admin-album-summary-card">
            <div class="admin-album-cover">
                @if(filled($album->cover_url))<img src="{{ $album->cover_url }}" alt="Ảnh bìa {{ $album->title }}">@else<span>Chưa có ảnh bìa</span>@endif
            </div>
            <div class="admin-album-summary-copy">
                <span class="ant-tag {{ $album->status === 'published' ? 'ant-tag-green' : 'ant-tag-default' }}">{{ $album->status === 'published' ? 'Đã phát hành' : ($album->status === 'blocked' ? 'Đã chặn' : 'Bản nháp') }}</span>
                <h2>{{ $album->title }}</h2>
                <p>{{ $album->release_date?->format('d/m/Y') ?: 'Chưa có ngày phát hành' }}</p>
                <div class="admin-album-artist-list">@forelse($artists as $artist)<span class="ant-tag ant-tag-blue">{{ $artist->name }}</span>@empty<span class="admin-text-muted">Chưa có nghệ sĩ.</span>@endforelse</div>
            </div>
        </article>

        <article class="ant-card admin-album-songs-card">
            <div class="admin-resource-form-heading"><div><strong>Bài hát trong album</strong><span>{{ $songs->total() }} bài hát</span></div></div>
            <div class="admin-album-song-list">
                @forelse($songs as $index => $song)
                    <div class="admin-album-song-row"><span class="admin-album-song-number">{{ str_pad((string) (($songs->firstItem() ?? 1) + $index), 2, '0', STR_PAD_LEFT) }}</span><div><strong>{{ $song->title }}</strong><small>{{ $song->artist_name ?: 'Chưa có nghệ sĩ' }}</small></div><span>{{ $song->duration_seconds ? gmdate('i:s', (int) $song->duration_seconds) : '—' }}</span><a href="{{ route('admin.songs.edit', $song->getKey()) }}" class="admin-action-link">Sửa bài hát</a></div>
                @empty
                    <div class="admin-selection-empty">Album chưa có bài hát. Mở Sửa album để chọn bài hát.</div>
                @endforelse
            </div>
            @if($songs->hasPages())<div class="admin-pagination">{{ $songs->links() }}</div>@endif
        </article>
    </div>
</section>
@endsection
