<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Requests\Admin\AdminResourceRequest;
use App\Models\Album;
use App\Models\Artist;
use App\Models\Genre;
use App\Models\Lyric;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongAudioFile;
use App\Models\SongGenre;
use App\Models\Topic;
use App\Models\TopicSong;
use App\Services\CloudinaryService;
use App\Services\Music\LyricsClient;
use App\Services\Music\NhacCuaTuiClient;
use App\Services\Music\SongImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\View\View;
use RuntimeException;
use Throwable;

class SongController extends CrudResourceController
{
    protected string $model = Song::class;

    protected string $resource = 'songs';

    protected string $title = 'bài hát';

    protected string $viewDirectory = 'Admin.songs';

    protected array $columns = ['title' => 'Tên bài hát', 'country_code' => 'Quốc gia', 'release_date' => 'Ngày phát hành', 'duration_seconds' => 'Thời lượng', 'is_featured' => 'Nổi bật', 'is_hot' => 'Hot', 'status' => 'Trạng thái'];

    protected array $fields = [
        'title' => ['label' => 'Tên bài hát', 'required' => true],
        'slug' => ['label' => 'Slug', 'required' => true, 'help' => 'Ví dụ: lac-troi-son-tung-mtp'],
        'album_id' => ['label' => 'Album', 'type' => 'select', 'placeholder' => 'Không thuộc album', 'option_model' => Album::class, 'option_label' => 'title'],
        'release_date' => ['label' => 'Ngày phát hành', 'type' => 'date'],
        'duration_seconds' => ['label' => 'Thời lượng (giây)', 'type' => 'number'],
        'explicit' => ['label' => 'Nội dung nhạy cảm', 'type' => 'checkbox'],
        'is_featured' => ['label' => 'Bài hát nổi bật', 'type' => 'checkbox'],
        'is_hot' => ['label' => 'Bài hát hot', 'type' => 'checkbox'],
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
        $rows = $this->indexRelationsFor($items->getCollection());

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
            'audioFile' => null,
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
                ->get()
                ->sortBy(fn (SongArtist $link): int => mb_strtolower(trim((string) ($link->artist_role ?? ''))) === 'primary' ? 0 : 1)
                ->first()?->artist_id,
            'selectedGenreId' => SongGenre::query()
                ->where('song_id', (string) $item->getKey())
                ->value('genre_id'),
            'selectedPlaylistId' => PlaylistSong::query()
                ->where('song_id', (string) $item->getKey())
                ->orderBy('position')
                ->value('playlist_id'),
            'lyric' => Lyric::query()->where('song_id', (string) $item->getKey())->first(),
            'audioFile' => SongAudioFile::query()
                ->where('song_id', (string) $item->getKey())
                ->where('file_type', 'full')
                ->where('status', 'active')
                ->first(),
        ]));
    }

    public function store(AdminResourceRequest $request, ?CloudinaryService $cloudinary = null): RedirectResponse
    {
        $cloudinary ??= app(CloudinaryService::class);
        $data = $this->normalize($request->validated());
        $externalId = trim((string) ($data['external_id'] ?? ''));
        $uploadedCover = null;
        $uploadedAudio = null;

        try {
            $uploadedCover = $this->uploadCoverImage($request, $cloudinary, (string) ($data['slug'] ?? $data['title']));
            if ($uploadedCover) {
                $data['cover_url'] = $uploadedCover['url'];
                $data['cover_public_id'] = $uploadedCover['public_id'];
            } else {
                $data['cover_public_id'] = null;
            }
        } catch (Throwable $exception) {
            report($exception);

            return back()->withErrors([
                'cover_image_file' => 'Không thể tải ảnh bìa lên. Hãy kiểm tra định dạng ảnh và cấu hình lưu trữ rồi thử lại.',
            ])->withInput();
        }

        try {
            $uploadedAudio = $this->uploadFullAudio($request, $cloudinary, (string) ($data['slug'] ?? $data['title']));
        } catch (Throwable $exception) {
            report($exception);
            $this->discardUploadedCover($cloudinary, $uploadedCover);

            return back()->withErrors([
                'audio_file' => 'Không thể tải file âm thanh lên. Hãy kiểm tra file hoặc cấu hình lưu trữ rồi thử lại.',
            ])->withInput();
        }

        if ($externalId !== '') {
            try {
                $song = app(SongImportService::class)->importFromNhacCuaTui($externalId, auth('admin')->user());
                $song->update($data);
            } catch (RuntimeException $exception) {
                report($exception);
                $this->discardUploadedAudio($cloudinary, $uploadedAudio);
                $this->discardUploadedCover($cloudinary, $uploadedCover);

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
        if ($uploadedAudio) {
            try {
                $this->saveUploadedAudio($song, $uploadedAudio, $cloudinary);
            } catch (Throwable $exception) {
                report($exception);
                $this->forgetHomeCache();

                return back()->withErrors([
                    'audio_file' => 'Bài hát đã được tạo nhưng chưa lưu được file âm thanh. Hãy tải file lại trong phần chỉnh sửa.',
                ])->withInput();
            }
        }
        $this->forgetHomeCache();

        return redirect()->route("admin.{$this->resource}.index")
            ->with('success', "Đã tạo {$this->title} thành công.");
    }

    public function update(AdminResourceRequest $request, string $id, ?CloudinaryService $cloudinary = null): RedirectResponse
    {
        $cloudinary ??= app(CloudinaryService::class);
        $item = ($this->model)::query()->findOrFail($id);
        $data = $this->normalize($request->validated(), $item->getKey());
        $oldCoverPublicId = (string) ($item->cover_public_id ?? '');
        $submittedCoverUrl = trim((string) $request->input('cover_url', ''));
        $uploadedCover = null;
        $uploadedAudio = null;

        try {
            $uploadedCover = $this->uploadCoverImage($request, $cloudinary, (string) ($data['slug'] ?? $data['title']));
            if ($uploadedCover) {
                $data['cover_url'] = $uploadedCover['url'];
                $data['cover_public_id'] = $uploadedCover['public_id'];
            } elseif ($submittedCoverUrl !== (string) ($item->cover_url ?? '')) {
                $data['cover_public_id'] = null;
            }
        } catch (Throwable $exception) {
            report($exception);

            return back()->withErrors([
                'cover_image_file' => 'Không thể tải ảnh bìa lên. Ảnh hiện tại được giữ nguyên; hãy kiểm tra định dạng rồi thử lại.',
            ])->withInput();
        }

        try {
            $uploadedAudio = $this->uploadFullAudio($request, $cloudinary, (string) ($data['slug'] ?? $data['title']));
        } catch (Throwable $exception) {
            report($exception);
            $this->discardUploadedCover($cloudinary, $uploadedCover);

            return back()->withErrors([
                'audio_file' => 'Không thể tải file âm thanh lên. File hiện tại vẫn được giữ nguyên; hãy thử lại.',
            ])->withInput();
        }

        if ($request->boolean('sync_external')
            && $item->external_source === 'nhaccuatui'
            && filled($item->external_id)) {
            try {
                $item = app(SongImportService::class)->importFromNhacCuaTui(
                    (string) $item->external_id,
                    auth('admin')->user(),
                );
            } catch (RuntimeException $exception) {
                report($exception);
                $this->discardUploadedAudio($cloudinary, $uploadedAudio);
                $this->discardUploadedCover($cloudinary, $uploadedCover);

                return back()->withErrors([
                    'external_id' => 'Không thể lấy lại dữ liệu bài hát từ NhacCuaTui. Vui lòng thử lại.',
                ])->withInput();
            }
        }

        $item->update($data);
        if ($oldCoverPublicId !== '' && $oldCoverPublicId !== (string) ($item->cover_public_id ?? '')) {
            try {
                $cloudinary->deleteImage($oldCoverPublicId);
            } catch (Throwable $exception) {
                report($exception);
            }
        }
        $this->syncArtist($item, $request->input('artist_name'));
        $this->syncTopics($item, $request->input('topic_id'));
        $this->syncGenre($item, $request->input('genre_id'));
        $this->addToPlaylist($item, $request->input('playlist_id'));
        $this->syncLyrics($item, $request->input('plain_lyrics'), $request->input('synced_lyrics'));
        if ($uploadedAudio) {
            try {
                $this->saveUploadedAudio($item, $uploadedAudio, $cloudinary);
            } catch (Throwable $exception) {
                report($exception);
                $this->forgetHomeCache();

                return back()->withErrors([
                    'audio_file' => 'Không thể thay thế file âm thanh. File cũ vẫn được giữ nguyên; hãy thử lại.',
                ])->withInput();
            }
        }
        $this->forgetHomeCache();

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
                    'country_code' => $track['countryCode'] ?? null,
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

            if (blank($lyrics['plainLyrics'] ?? null) || blank($lyrics['syncedLyrics'] ?? null)) {
                $fallbackLyrics = null;
                try {
                    $fallbackLyrics = $lyricsClient->find(
                        (string) ($track['trackName'] ?? ''),
                        (string) ($track['artistName'] ?? ''),
                        $track['collectionName'] ?? null,
                        isset($track['trackTimeMillis']) ? (int) round(((int) $track['trackTimeMillis']) / 1000) : null,
                    );
                } catch (RuntimeException) {
                    $fallbackLyrics = null;
                }

                if ($fallbackLyrics) {
                    $lyrics = [
                        'plainLyrics' => filled($lyrics['plainLyrics'] ?? null)
                            ? $lyrics['plainLyrics']
                            : ($fallbackLyrics['plainLyrics'] ?? null),
                        'syncedLyrics' => filled($lyrics['syncedLyrics'] ?? null)
                            ? $lyrics['syncedLyrics']
                            : ($fallbackLyrics['syncedLyrics'] ?? null),
                        'source' => $lyrics['source'] ?? ($fallbackLyrics['source'] ?? 'LRCLIB'),
                    ];
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
                    'country_code' => $track['countryCode'] ?? null,
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

        // The unique sparse compound index only excludes documents when both
        // provider fields are absent. A blank hidden form input becomes null
        // and otherwise makes every manually-created song collide at (null, null).
        if (blank($data['external_id'] ?? null)) {
            unset($data['external_id'], $data['external_source']);
        }

        unset($data['topic_ids'], $data['topic_id'], $data['artist_id'], $data['genre_id'], $data['playlist_id'], $data['plain_lyrics'], $data['synced_lyrics'], $data['sync_external'], $data['audio_file'], $data['cover_image_file']);
        $data['is_featured'] = (int) ($data['is_featured'] ?? 0);
        $data['is_hot'] = (int) ($data['is_hot'] ?? 0);

        if (request()->routeIs('admin.songs.store')) {
            $data['created_by_admin_id'] = (string) auth('admin')->id();
        }

        return $data;
    }

    private function uploadFullAudio(Request $request, CloudinaryService $cloudinary, string $slug): ?array
    {
        if (! $request->hasFile('audio_file')) {
            return null;
        }

        $publicId = $cloudinary->datedPublicId($slug.'-full-audio').'-'.Str::lower(Str::random(8));
        $uploaded = $cloudinary->uploadAudio(
            $request->file('audio_file'),
            config('cloudinary.audio_folder', 'melodify/audio'),
            $publicId,
        );
        $fileUrl = $uploaded['secure_url'] ?? $uploaded['url'] ?? null;

        if (blank($fileUrl)) {
            throw new RuntimeException('Cloudinary không trả về URL cho file âm thanh.');
        }

        return [
            'file_url' => $fileUrl,
            'public_id' => $uploaded['public_id'] ?? $publicId,
            'duration_seconds' => isset($uploaded['duration']) ? (int) round((float) $uploaded['duration']) : null,
        ];
    }

    private function uploadCoverImage(Request $request, CloudinaryService $cloudinary, string $slug): ?array
    {
        if (! $request->hasFile('cover_image_file')) {
            return null;
        }

        $publicId = $cloudinary->datedPublicId($slug.'-cover').'-'.Str::lower(Str::random(8));
        $uploaded = $cloudinary->uploadImage(
            $request->file('cover_image_file'),
            config('cloudinary.image_folder', 'melodify/covers'),
            $publicId,
        );
        $url = $uploaded['secure_url'] ?? $uploaded['url'] ?? null;

        if (blank($url)) {
            throw new RuntimeException('Cloudinary không trả về URL cho ảnh bìa.');
        }

        return [
            'url' => $url,
            'public_id' => $uploaded['public_id'] ?? $publicId,
        ];
    }

    private function saveUploadedAudio(Song $song, array $uploaded, CloudinaryService $cloudinary): void
    {
        $audio = SongAudioFile::query()
            ->where('song_id', (string) $song->getKey())
            ->where('file_type', 'full')
            ->first() ?: new SongAudioFile;
        $oldSource = (string) ($audio->source ?? '');
        $oldPublicId = (string) ($audio->public_id ?? '');

        $audio->song_id = (string) $song->getKey();
        $audio->file_type = 'full';
        $audio->file_url = $uploaded['file_url'];
        $audio->public_id = $uploaded['public_id'] ?? null;
        $audio->external_id = null;
        $audio->duration_seconds = $uploaded['duration_seconds'] ?: $song->duration_seconds;
        $audio->premium_only = false;
        $audio->status = 'active';
        $audio->source = 'cloudinary';

        try {
            $audio->save();
            if (($uploaded['duration_seconds'] ?? 0) > 0) {
                $song->duration_seconds = (int) $uploaded['duration_seconds'];
                $song->save();
            }
        } catch (Throwable $exception) {
            $this->discardUploadedAudio($cloudinary, $uploaded);
            throw $exception;
        }

        if ($oldSource === 'cloudinary' && $oldPublicId !== '' && $oldPublicId !== (string) ($uploaded['public_id'] ?? '')) {
            try {
                $cloudinary->deleteAudio($oldPublicId);
            } catch (Throwable $exception) {
                report($exception);
            }
        }
    }

    private function discardUploadedAudio(CloudinaryService $cloudinary, ?array $uploaded): void
    {
        if (! filled($uploaded['public_id'] ?? null)) {
            return;
        }

        try {
            $cloudinary->deleteAudio((string) $uploaded['public_id']);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function discardUploadedCover(CloudinaryService $cloudinary, ?array $uploaded): void
    {
        if (! filled($uploaded['public_id'] ?? null)) {
            return;
        }

        try {
            $cloudinary->deleteImage((string) $uploaded['public_id']);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function forgetHomeCache(): void
    {
        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        Cache::store('file')->put('api:catalog-content-revision:v1', (string) Str::uuid());
        Cache::store('file')->forget('api:home-discovery:v2:'.$dateKey);
        Cache::store('file')->forget('api:home-bootstrap:v6:'.$dateKey);
        Cache::store('file')->forget('api:trending-artists:v3:'.$dateKey);
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

    private function indexRelationsFor(Collection $songs): Collection
    {
        $songIds = $songs->map(fn (Song $song): string => (string) $song->getKey())->values()->all();
        if ($songIds === []) {
            return collect();
        }

        // Resolve all relations for the current page in batches. The previous
        // row-by-row lookups caused dozens of Mongo round trips for ten songs.
        $artistLinksBySong = SongArtist::query()
            ->whereIn('song_id', $songIds)
            ->get()
            ->sortBy(fn (SongArtist $link): int => mb_strtolower(trim((string) ($link->artist_role ?? ''))) === 'primary' ? 0 : 1)
            ->groupBy(fn (SongArtist $link): string => (string) $link->song_id)
            ->map(fn (Collection $links): SongArtist => $links->first());
        $artistIds = $artistLinksBySong->pluck('artist_id')->filter()->map(fn ($id): string => (string) $id)->unique()->values()->all();
        $artists = $artistIds === []
            ? collect()
            : Artist::query()->whereIn('_id', $artistIds)->get()->keyBy(fn (Artist $artist): string => (string) $artist->getKey());

        $albumIds = $songs->pluck('album_id')->filter()->map(fn ($id): string => (string) $id)->unique()->values()->all();
        $albums = $albumIds === []
            ? collect()
            : Album::query()->whereIn('_id', $albumIds)->get()->keyBy(fn (Album $album): string => (string) $album->getKey());

        $genreLinksBySong = SongGenre::query()
            ->whereIn('song_id', $songIds)
            ->get()
            ->groupBy(fn (SongGenre $link): string => (string) $link->song_id);
        $genreIds = $genreLinksBySong->flatten(1)->pluck('genre_id')->filter()->map(fn ($id): string => (string) $id)->unique()->values()->all();
        $genres = $genreIds === []
            ? collect()
            : Genre::query()->whereIn('_id', $genreIds)->get()->keyBy(fn (Genre $genre): string => (string) $genre->getKey());

        $topicLinksBySong = TopicSong::query()
            ->whereIn('song_id', $songIds)
            ->orderBy('position')
            ->get()
            ->groupBy(fn (TopicSong $link): string => (string) $link->song_id);
        $topicIds = $topicLinksBySong->flatten(1)->pluck('topic_id')->filter()->map(fn ($id): string => (string) $id)->unique()->values()->all();
        $topics = $topicIds === []
            ? collect()
            : Topic::query()->whereIn('_id', $topicIds)->get()->keyBy(fn (Topic $topic): string => (string) $topic->getKey());

        $playlistLinksBySong = PlaylistSong::query()
            ->whereIn('song_id', $songIds)
            ->orderBy('position')
            ->get()
            ->groupBy(fn (PlaylistSong $link): string => (string) $link->song_id);
        $playlistIds = $playlistLinksBySong->flatten(1)->pluck('playlist_id')->filter()->map(fn ($id): string => (string) $id)->unique()->values()->all();
        $playlists = $playlistIds === []
            ? collect()
            : Playlist::query()->whereIn('_id', $playlistIds)->get()->keyBy(fn (Playlist $playlist): string => (string) $playlist->getKey());

        return $songs->map(function (Song $song) use ($artistLinksBySong, $artists, $albums, $genreLinksBySong, $genres, $topicLinksBySong, $topics, $playlistLinksBySong, $playlists): array {
            $songId = (string) $song->getKey();
            $artistLink = $artistLinksBySong->get($songId);

            return [
                'song' => $song,
                'artist' => $song->artist_name ?: $artists->get((string) ($artistLink?->artist_id))?->name,
                'album' => filled($song->album_id) ? $albums->get((string) $song->album_id)?->title : null,
                'genre' => $genreLinksBySong->get($songId, collect())->map(fn (SongGenre $link) => $genres->get((string) $link->genre_id)?->name)->filter()->implode(', '),
                'topic' => $topicLinksBySong->get($songId, collect())->map(fn (TopicSong $link) => $topics->get((string) $link->topic_id)?->name)->filter()->implode(', '),
                'playlist' => $playlistLinksBySong->get($songId, collect())->map(fn (PlaylistSong $link) => $playlists->get((string) $link->playlist_id)?->name)->filter()->implode(', '),
            ];
        })->values();
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
        if ($artistName === null) {
            return;
        }

        $artistName = trim((string) $artistName);
        $previousArtistName = trim((string) ($song->artist_name ?? ''));
        $songId = (string) $song->getKey();
        $hasArtistLinks = SongArtist::query()->where('song_id', $songId)->exists();

        $song->artist_name = $artistName;
        $song->save();

        // Keep structured provider credits intact unless the admin changed the
        // visible credit; this avoids re-splitting a provider fallback string.
        if ($artistName === $previousArtistName && $hasArtistLinks) {
            return;
        }

        SongArtist::query()->where('song_id', $songId)->delete();
        $artistNames = app(SongImportService::class)->artistNames($artistName);
        if ($artistNames === []) {
            return;
        }

        $artistsByName = Artist::query()
            ->whereIn('name', $artistNames)
            ->get()
            ->keyBy(fn (Artist $artist): string => mb_strtolower(trim((string) $artist->name)));
        $position = 0;

        foreach ($artistNames as $name) {
            $artist = $artistsByName->get(mb_strtolower(trim($name)));
            if (! $artist) {
                continue;
            }

            SongArtist::query()->create([
                'song_id' => $songId,
                'artist_id' => (string) $artist->getKey(),
                'artist_role' => $position === 0 ? 'primary' : 'featured',
            ]);
            $position++;
        }
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
        if ($syncedLyrics !== '' && preg_match('/\[\d+:\d+(?:\.\d+)?\]/', $syncedLyrics) !== 1) {
            $syncedLyrics = '';
        }

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
