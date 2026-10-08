@extends('layouts.admin')

@section('content')
<section class="admin-page admin-lyrics-library-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <span class="admin-page-eyebrow">NỘI DUNG / LỜI BÀI HÁT</span>
            <h1 class="admin-page-title">Lời bài hát</h1>
            <p class="admin-page-description">Chọn một bài hát để xem thử lời chạy theo nhạc và chỉnh sửa lời đồng bộ.</p>
        </div>
    </div>

    <div class="admin-lyrics-library-intro">
        <div>
            <span class="admin-lyrics-kicker">KHO LỜI NHẠC</span>
            <strong>Chọn bài hát để mở màn hình karaoke</strong>
            <p>Trong màn hình tiếp theo, bấm Phát để kiểm tra từng câu lời có chạy đúng thời gian hay không.</p>
        </div>
        <span class="admin-lyrics-library-count">{{ $items->count() }} bài hát</span>
    </div>

    <div class="ant-card admin-table-card">
        <div class="admin-table-toolbar">
            <div><strong>Danh sách lời bài hát</strong><span>{{ $items->count() }} bài hát</span></div>
            <form method="GET" action="{{ route('admin.lyrics.index') }}" class="admin-topic-filters">
                <label class="admin-topic-search">
                    <x-anticon name="search" aria-hidden="true" />
                    <input type="search" name="q" value="{{ $search }}" maxlength="100" placeholder="Tìm bài hát, nghệ sĩ..." aria-label="Tìm kiếm lời bài hát">
                </label>
                <button type="submit" class="ant-btn">Tìm kiếm</button>
            </form>
        </div>
        <div class="admin-table-scroll">
            <table class="ant-table admin-data-table admin-lyrics-library-table">
                <thead class="ant-table-thead">
                    <tr>
                        <th>Ảnh</th>
                        <th>Bài hát</th>
                        <th>Nghệ sĩ</th>
                        <th>Lời thường</th>
                        <th>Lời đồng bộ</th>
                        <th>Audio</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody class="ant-table-tbody">
                    @forelse($items as $item)
                        @php($song = $item['song'])
                        <tr>
                            <td>
                                <div class="admin-table-avatar admin-song-cover">
                                    @if(filled($song->cover_url))
                                        <img src="{{ $song->cover_url }}" alt="Ảnh bìa {{ $song->title }}" loading="lazy">
                                    @else
                                        <span>♪</span>
                                    @endif
                                </div>
                            </td>
                            <td>
                                <a href="{{ route('admin.songs.lyrics', $song->getKey()) }}" class="admin-lyrics-library-song">
                                    <strong>{{ $song->title }}</strong>
                                    @if(filled($song->slug))<small>{{ $song->slug }}</small>@endif
                                </a>
                            </td>
                            <td>{{ $song->artist_name ?: 'Chưa có nghệ sĩ' }}</td>
                            <td><span class="admin-lyrics-status {{ $item['has_plain_lyrics'] ? 'is-ready' : '' }}">{{ $item['has_plain_lyrics'] ? 'Đã lưu' : 'Chưa có' }}</span></td>
                            <td><span class="admin-lyrics-status {{ $item['has_synced_lyrics'] ? 'is-ready' : '' }}">{{ $item['has_synced_lyrics'] ? 'Có mốc thời gian' : 'Chưa có' }}</span></td>
                            <td><span class="admin-lyrics-status {{ $item['has_audio'] ? 'is-ready' : '' }}">{{ $item['has_full_audio'] ? 'Đầy đủ' : ($item['has_audio'] ? 'Nghe thử' : 'Chưa có') }}</span></td>
                            <td>
                                <a href="{{ route('admin.songs.lyrics', $song->getKey()) }}" class="ant-btn ant-btn-primary admin-lyrics-open-button">Mở lyric</a>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="admin-empty-state"><strong>Chưa có bài hát</strong><span>Hãy thêm bài hát vào kho nhạc trước.</span></td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</section>
@endsection
