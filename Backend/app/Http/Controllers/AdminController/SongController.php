<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Album;
use App\Models\Artist;
use App\Models\Genre;
use App\Models\Lyric;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Models\SongGenre;
use App\Models\SongArtist;
use App\Models\Topic;
use App\Models\TopicSong;
use App\Services\Music\NhacCuaTuiClient;
use App\Services\Music\LyricsClient;
use App\Services\Music\SongImportService;
use App\Http\Requests\Admin\AdminResourceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Support\Str;
use RuntimeException;

class SongController extends CrudResourceController
{
    protected string $model = Song::class;

    protected string $resource = 'songs';

    protected string $title = 'bài hát';

    protected string $viewDirectory = 'Admin.songs';

    protected array $columns = ['title' => 'Tên bài hát', 'release_date' => 'Ngày phát hành', 'duration_seconds' => 'Thời lượng', 'status' => 'Trạng thái'];

    protected array $fields = [
        'title' => ['label' => 'Tên bài hát', 'required' => true],
        'slug' => ['label' => 'Slug', 'required' => true, 'help' => 'Ví dụ: lac-troi-son-tung-mtp'],
        'album_id' => ['label' => 'Album', 'type' => 'select', 'placeholder' => 'Không thuộc album', 'option_model' => Album::class, 'option_label' => 'title'],
        'release_date' => ['label' => 'Ngày phát hành', 'type' => 'date'],
        'duration_seconds' => ['label' => 'Thời lượng (giây)', 'type' => 'number'],
        'explicit' => ['label' => 'Nội dung nhạy cảm', 'type' => 'checkbox'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['draft' => 'Bản nháp', 'published' => 'Đã phát hành', 'blocked' => 'Đã chặn']],
    ];

    public function index(?Request $request = null): View
    {
        $request ??= request();
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ], [
            'q.max' => 'Từ khóa tìm kiếm không được dài hơn 100 ký tự.',
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $query = Song::query();

        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('artist_name', 'like', "%{$search}%");
            });
        }

        $items = $query->latest()->paginate(10)->withQueryString();
        $rows = $items->getCollection()
            ->map(fn (Song $song): array => [
                'song' => $song,
                ...$this->indexRelations($song),
            ])
            ->values();

        return view('Admin.songs.index', $this->viewData(compact('items', 'rows', 'search')));
    }

    public function create(): View
    {
        return view("{$this->viewDirectory}.create", $this->viewData([
            'item' => null,
            'fields' => $this->resolvedFields(),
            'topics' => $this->availableTopics(),
            'artists' => $this->availableArtists(),
            'genres' => $this->availableGenres(),
            'playlists' => $this->availablePlaylists(),
            'selectedTopicId' => null,
            'selectedArtistId' => null,
            'selectedGenreId' => null,
            'selectedPlaylistId' => null,
            'lyric' => null,
        ]));
    }

    public function edit(string $id): View
    {
        $item = ($this->model)::query()->findOrFail($id);

        return view("{$this->viewDirectory}.edit", $this->viewData([
            'item' => $item,
            'fields' => $this->resolvedFields(),
            'topics' => $this->availableTopics(),
            'artists' => $this->availableArtists(),
            'genres' => $this->availableGenres(),
            'playlists' => $this->availablePlaylists(),
            'selectedTopicId' => TopicSong::query()
                ->where('song_id', (string) $item->getKey())
                ->value('topic_id'),
            'selectedArtistId' => SongArtist::query()
                ->where('song_id', (string) $item->getKey())
                ->orderBy('artist_role')
                ->value('artist_id'),
            'selectedGenreId' => SongGenre::query()
                ->where('song_id', (string) $item->getKey())
                ->value('genre_id'),
            'selectedPlaylistId' => PlaylistSong::query()
                ->where('song_id', (string) $item->getKey())
                ->orderBy('position')
                ->value('playlist_id'),
            'lyric' => Lyric::query()->where('song_id', (string) $item->getKey())->first(),
        ]));
    }

    public function store(AdminResourceRequest $request): RedirectResponse
    {
        $data = $this->normalize($request->validated());
        $externalId = trim((string) ($data['external_id'] ?? ''));

        if ($externalId !== '') {
            try {
                $song = app(SongImportService::class)->importFromNhacCuaTui($externalId, auth('admin')->user());
                $song->update($data);
            } catch (RuntimeException $exception) {
                report($exception);

                return back()->withErrors([
                    'external_id' => 'Không thể lấy dữ liệu bài hát từ NhacCuaTui. Vui lòng chọn lại bài hoặc thử lại.',
                ])->withInput();
            }
        } else {
            $song = ($this->model)::query()->create($data);
        }

        $this->syncArtist($song, $request->input('artist_name'));
        $this->syncTopics($song, $request->input('topic_id'));
        $this->syncGenre($song, $request->input('genre_id'));
        $this->addToPlaylist($song, $request->input('playlist_id'));
        if ($externalId === '' || filled($request->input('plain_lyrics')) || filled($request->input('synced_lyrics'))) {
            $this->syncLyrics($song, $request->input('plain_lyrics'), $request->input('synced_lyrics'));
        }

        return redirect()->route("admin.{$this->resource}.index")
            ->with('success', "Đã tạo {$this->title} thành công.");
    }

    public function update(AdminResourceRequest $request, string $id): RedirectResponse
    {
        $item = ($this->model)::query()->findOrFail($id);
        $item->update($this->normalize($request->validated(), $item->getKey()));
        $this->syncArtist($item, $request->input('artist_name'));
        $this->syncTopics($item, $request->input('topic_id'));
        $this->syncGenre($item, $request->input('genre_id'));
        $this->addToPlaylist($item, $request->input('playlist_id'));
        $this->syncLyrics($item, $request->input('plain_lyrics'), $request->input('synced_lyrics'));

        return redirect()->route("admin.{$this->resource}.index")
            ->with('success', "Đã cập nhật {$this->title}.");
    }

    public function searchExternal(Request $request, NhacCuaTuiClient $nhaccuatui): JsonResponse
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:10'],
        ], [
            'q.required' => 'Hãy nhập tên bài hát hoặc nghệ sĩ cần tìm.',
            'q.max' => 'Từ khóa tìm kiếm không được dài hơn 100 ký tự.',
        ]);

        try {
            $tracks = $nhaccuatui->searchSongs(trim($data['q']), (int) ($data['per_page'] ?? 8));

            return response()->json([
                'data' => collect($tracks['results'] ?? [])->map(fn (array $track): array => [
                    'id' => (string) ($track['trackId'] ?? ''),
                    'title' => $track['trackName'] ?? 'Bài hát',
                    'artist' => $track['artistName'] ?? 'Nghệ sĩ chưa xác định',
                    'album' => $track['collectionName'] ?? null,
                    'genre' => $track['primaryGenreName'] ?? null,
                    'artwork_url' => $track['artworkUrl100'] ?? null,
                    'audio_url' => $track['streamUrl'] ?? null,
                ])->values()->all(),
            ]);
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json(['message' => 'Không thể tìm bài hát từ NhacCuaTui lúc này.'], 503);
        }
    }

    public function previewExternal(Request $request, NhacCuaTuiClient $nhaccuatui, LyricsClient $lyricsClient): JsonResponse
    {
        $data = $request->validate([
            'song_id' => ['required', 'string', 'regex:/^[A-Za-z0-9]{4,80}$/'],
        ], [
            'song_id.required' => 'Bài hát cần nhập chưa được chọn.',
            'song_id.regex' => 'Mã bài hát NhacCuaTui không hợp lệ.',
        ]);

        try {
            $track = $nhaccuatui->getSong($data['song_id']);
            $lyrics = null;

            try {
                $lyrics = $nhaccuatui->getLyrics($data['song_id'], $track);
            } catch (RuntimeException) {
                $lyrics = null;
            }

            if (! $lyrics) {
                try {
                    $lyrics = $lyricsClient->find(
                        (string) ($track['trackName'] ?? ''),
                        (string) ($track['artistName'] ?? ''),
                        $track['collectionName'] ?? null,
                        isset($track['trackTimeMillis']) ? (int) round(((int) $track['trackTimeMillis']) / 1000) : null,
                    );
                } catch (RuntimeException) {
                    $lyrics = null;
                }
            }

            return response()->json([
                'data' => [
                    'external_id' => (string) ($track['trackId'] ?? $data['song_id']),
                    'external_source' => 'nhaccuatui',
                    'title' => $track['trackName'] ?? 'Bài hát',
                    'slug' => Str::slug(($track['trackName'] ?? 'Bài hát').' '.($track['artistName'] ?? '')),
                    'artist_name' => $track['artistName'] ?? null,
                    'cover_url' => $track['artworkUrl100'] ?? null,
                    'release_date' => $track['releaseDate'] ?? null,
                    'duration_seconds' => isset($track['trackTimeMillis']) ? (int) round(((int) $track['trackTimeMillis']) / 1000) : null,
                    'plain_lyrics' => $lyrics['plainLyrics'] ?? null,
                    'synced_lyrics' => $lyrics['syncedLyrics'] ?? null,
                ],
            ]);
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json(['message' => 'Không thể lấy dữ liệu bài hát NhacCuaTui này. Vui lòng thử lại.'], 503);
        }
    }

    protected function normalize(array $data, mixed $ignoreId = null): array
    {
        $data = parent::normalize($data, $ignoreId);
        unset($data['topic_ids'], $data['topic_id'], $data['artist_id'], $data['genre_id'], $data['playlist_id'], $data['plain_lyrics'], $data['synced_lyrics']);

        if (request()->routeIs('admin.songs.store')) {
            $data['created_by_admin_id'] = (string) auth('admin')->id();
        }

        return $data;
    }

    private function availableTopics()
    {
        return Topic::query()->where('status', 'active')->orderBy('name')->get();
    }

    private function availableArtists()
    {
        return Artist::query()->whereIn('status', ['active', 'published'])->orderBy('name')->get();
    }

    private function availableGenres()
    {
        return Genre::query()->where('status', 'active')->orderBy('name')->get();
    }

    private function availablePlaylists()
    {
        return Playlist::query()->where('status', 'active')->orderBy('name')->get();
    }

    private function indexRelations(Song $song): array
    {
        $songId = (string) $song->getKey();
        $artistLink = SongArtist::query()
            ->where('song_id', $songId)
            ->orderBy('artist_role')
            ->first();
        $genreIds = SongGenre::query()->where('song_id', $songId)->pluck('genre_id');
        $topicIds = TopicSong::query()->where('song_id', $songId)->orderBy('position')->pluck('topic_id');
        $playlistIds = PlaylistSong::query()->where('song_id', $songId)->orderBy('position')->pluck('playlist_id');

        return [
            'artist' => $song->artist_name ?: ($artistLink ? Artist::query()->find($artistLink->artist_id)?->name : null),
            'album' => filled($song->album_id) ? Album::query()->find($song->album_id)?->title : null,
            'genre' => $genreIds->map(fn ($id) => Genre::query()->find($id)?->name)->filter()->implode(', '),
            'topic' => $topicIds->map(fn ($id) => Topic::query()->find($id)?->name)->filter()->implode(', '),
            'playlist' => $playlistIds->map(fn ($id) => Playlist::query()->find($id)?->name)->filter()->implode(', '),
        ];
    }

    private function syncTopics(Song $song, mixed $topicId): void
    {
        TopicSong::query()->where('song_id', (string) $song->getKey())->delete();

        $topicId = trim((string) $topicId);
        if ($topicId !== '' && Topic::query()->find($topicId)) {
            TopicSong::query()->create([
                'topic_id' => $topicId,
                'song_id' => (string) $song->getKey(),
                'position' => 0,
                'added_by_admin_id' => (string) auth('admin')->id(),
            ]);
        }
    }

    private function syncArtist(Song $song, mixed $artistName): void
    {
        $artistName = trim((string) $artistName);

        if ($artistName !== '') {
            $song->artist_name = $artistName;
        }

        $song->save();
    }

    private function syncGenre(Song $song, mixed $genreId): void
    {
        SongGenre::query()->where('song_id', (string) $song->getKey())->delete();
        $genreId = trim((string) $genreId);

        if ($genreId !== '' && Genre::query()->find($genreId)) {
            SongGenre::query()->create([
                'song_id' => (string) $song->getKey(),
                'genre_id' => $genreId,
            ]);
        }
    }

    private function addToPlaylist(Song $song, mixed $playlistId): void
    {
        $playlistId = trim((string) $playlistId);

        if ($playlistId === '' || ! Playlist::query()->find($playlistId)) {
            return;
        }

        $exists = PlaylistSong::query()
            ->where('playlist_id', $playlistId)
            ->where('song_id', (string) $song->getKey())
            ->exists();

        if ($exists) {
            return;
        }

        $position = (int) PlaylistSong::query()->where('playlist_id', $playlistId)->max('position') + 1;
        PlaylistSong::query()->create([
            'playlist_id' => $playlistId,
            'song_id' => (string) $song->getKey(),
            'position' => $position,
            'added_by_admin_id' => (string) auth('admin')->id(),
        ]);
    }

    private function syncLyrics(Song $song, mixed $plainLyrics, mixed $syncedLyrics): void
    {
        $plainLyrics = trim((string) $plainLyrics);
        $syncedLyrics = trim((string) $syncedLyrics);

        if ($plainLyrics === '' && $syncedLyrics === '') {
            Lyric::query()->where('song_id', (string) $song->getKey())->delete();

            return;
        }

        $lyric = Lyric::query()->firstOrNew([
            'song_id' => (string) $song->getKey(),
            'language' => 'unknown',
        ]);
        $lyric->content = $plainLyrics !== '' ? $plainLyrics : $syncedLyrics;
        $lyric->plain_lyrics = $plainLyrics !== '' ? $plainLyrics : null;
        $lyric->synced_lyrics = $syncedLyrics !== '' ? $syncedLyrics : null;
        $lyric->is_synced = $syncedLyrics !== '';
        $lyric->source = 'Admin';
        $lyric->save();
    }
}
