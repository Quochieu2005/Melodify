<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Genre;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongAudioFile;
use App\Models\SongGenre;
use App\Models\UserUploadStage;
use App\Rules\PlainText;
use App\Services\CloudinaryService;
use App\Support\AudioUploadRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class UserUploadController extends Controller
{
    private const MAX_UPLOADS_PER_USER = 200;

    private const MAX_ACTIVE_STAGES_PER_USER = 3;

    public function index(Request $request): JsonResponse
    {
        $userId = (string) $request->user()->getKey();
        $query = Song::query()->where('uploaded_by_user_id', $userId);
        $total = (clone $query)->count();
        $songs = $query->orderByDesc('created_at')->limit(self::MAX_UPLOADS_PER_USER)->get();
        $audioFiles = SongAudioFile::query()
            ->whereIn('song_id', $songs->map(fn (Song $song): string => (string) $song->getKey())->all())
            ->where('file_type', 'full')
            ->where('status', 'active')
            ->get()
            ->keyBy('song_id');

        return response()->json([
            'data' => $songs->map(fn (Song $song): array => $this->summary($song, $audioFiles->get((string) $song->getKey())))->values(),
            'meta' => ['total' => $total, 'limit' => self::MAX_UPLOADS_PER_USER],
        ])->header('Cache-Control', 'private, no-store');
    }

    public function stageAudio(Request $request, CloudinaryService $cloudinary): JsonResponse
    {
        $data = $request->validate([
            'audio_file' => AudioUploadRules::rules(required: true),
        ], [
            'audio_file.extensions' => 'File âm thanh phải có định dạng '.AudioUploadRules::formatLabel().'.',
            'audio_file.mimetypes' => 'Nội dung file không khớp với định dạng âm thanh được hỗ trợ.',
            'audio_file.max' => 'File âm thanh không được lớn hơn 100 MB.',
        ]);

        $userId = (string) $request->user()->getKey();
        $this->cleanupExpiredStages($cloudinary);

        if (Song::query()->where('uploaded_by_user_id', $userId)->count() >= self::MAX_UPLOADS_PER_USER) {
            throw ValidationException::withMessages(['audio_file' => 'Bạn đã đạt giới hạn 200 bài hát tải lên.']);
        }
        if (UserUploadStage::query()->where('user_id', $userId)->where('expires_at', '>', now())->count() >= self::MAX_ACTIVE_STAGES_PER_USER) {
            throw ValidationException::withMessages(['audio_file' => 'Bạn đang có quá nhiều file tải tạm. Hãy hoàn tất hoặc hủy một file trước.']);
        }

        $file = $data['audio_file'];
        $filename = $file->getClientOriginalName();
        $slug = Str::slug(pathinfo($filename, PATHINFO_FILENAME)) ?: 'bai-hat';
        $publicId = $cloudinary->datedPublicId($slug.'-staged-audio').'-'.Str::lower(Str::random(12));
        $uploadedAudio = null;

        try {
            $uploadedAudio = $cloudinary->uploadAudio(
                $file,
                config('cloudinary.audio_folder', 'melodify/audio'),
                $publicId,
            );
            $audioUrl = (string) ($uploadedAudio['secure_url'] ?? $uploadedAudio['url'] ?? '');
            if ($audioUrl === '') {
                throw new RuntimeException('Cloudinary không trả về URL cho file âm thanh.');
            }

            $stage = UserUploadStage::query()->create([
                'user_id' => $userId,
                'file_name' => $filename,
                'file_size' => (int) $file->getSize(),
                'file_url' => $audioUrl,
                'public_id' => (string) ($uploadedAudio['public_id'] ?? $publicId),
                'duration_seconds' => isset($uploadedAudio['duration']) ? (int) round((float) $uploadedAudio['duration']) : null,
                'expires_at' => now()->addHours(2),
            ]);
        } catch (Throwable $exception) {
            try {
                $cloudinary->deleteAudio((string) ($uploadedAudio['public_id'] ?? $publicId));
            } catch (Throwable $cleanupException) {
                report($cleanupException);
            }

            report($exception);

            return response()->json(['message' => 'Không thể tải file nhạc lên lúc này. Vui lòng thử lại.'], 503);
        }

        return response()->json([
            'message' => 'Đã tải file nhạc lên.',
            'data' => [
                'upload_token' => (string) $stage->getKey(),
                'file_name' => $filename,
                'file_size' => (int) $file->getSize(),
                'duration_seconds' => $stage->duration_seconds,
            ],
        ], 201)->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request, CloudinaryService $cloudinary): JsonResponse
    {
        $audioRules = AudioUploadRules::rules();
        $audioRules[0] = 'required_without:audio_upload_token';
        $data = $request->validate([
            'title' => ['required', 'string', 'min:1', 'max:160', new PlainText],
            'artist_name' => ['required', 'string', 'min:1', 'max:160', new PlainText],
            'artist_id' => ['nullable', 'string', 'max:64'],
            'genre_id' => ['required', 'string', 'max:64'],
            'terms_accepted' => ['accepted'],
            'moderation_requested' => ['accepted'],
            'audio_file' => $audioRules,
            'audio_upload_token' => ['required_without:audio_file', 'string', 'max:64'],
            'cover_image_file' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120', 'dimensions:min_width=640,min_height=640'],
        ], [
            'audio_file.extensions' => 'File âm thanh phải có định dạng '.AudioUploadRules::formatLabel().'.',
            'audio_file.mimetypes' => 'Nội dung file không khớp với định dạng âm thanh được hỗ trợ.',
            'audio_file.max' => 'File âm thanh không được lớn hơn 100 MB.',
            'cover_image_file.image' => 'Ảnh bìa phải là ảnh JPG hoặc PNG hợp lệ.',
            'cover_image_file.mimes' => 'Ảnh bìa chỉ hỗ trợ JPG hoặc PNG.',
            'cover_image_file.max' => 'Ảnh bìa không được lớn hơn 5 MB.',
            'cover_image_file.dimensions' => 'Ảnh bìa cần có kích thước tối thiểu 640 × 640 px.',
            'cover_image_file.required' => 'Vui lòng chọn ảnh bìa cho bài hát.',
            'artist_name.required' => 'Vui lòng nhập tên nghệ sĩ.',
            'genre_id.required' => 'Vui lòng chọn thể loại.',
            'terms_accepted.accepted' => 'Bạn cần đồng ý với chính sách và thỏa thuận sử dụng.',
            'moderation_requested.accepted' => 'Bài hát cần được đăng ký kiểm duyệt trước khi gửi.',
        ]);

        $userId = (string) $request->user()->getKey();
        if (Song::query()->where('uploaded_by_user_id', $userId)->count() >= self::MAX_UPLOADS_PER_USER) {
            throw ValidationException::withMessages(['audio_file' => 'Bạn đã đạt giới hạn 200 bài hát tải lên.']);
        }

        $stagedAudio = null;
        if (filled($data['audio_upload_token'] ?? null)) {
            $stagedAudio = UserUploadStage::query()
                ->where('_id', $data['audio_upload_token'])
                ->where('user_id', $userId)
                ->first();

            if (! $stagedAudio) {
                throw ValidationException::withMessages(['audio_upload_token' => 'File nhạc đã hết hạn hoặc không thuộc tài khoản này. Hãy tải lại file.']);
            }
            if (! $stagedAudio->expires_at || $stagedAudio->expires_at->isPast()) {
                try {
                    $cloudinary->deleteAudio((string) $stagedAudio->public_id);
                    $stagedAudio->delete();
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }

                throw ValidationException::withMessages(['audio_upload_token' => 'File nhạc đã hết hạn. Hãy tải lại file.']);
            }
        }

        $title = trim($data['title']);
        $artist = null;
        if (filled($data['artist_id'] ?? null)) {
            $artist = Artist::query()->where('status', 'active')->find($data['artist_id']);
            if (! $artist) {
                throw ValidationException::withMessages(['artist_id' => 'Nghệ sĩ đã chọn không tồn tại hoặc không hoạt động.']);
            }
        }
        $genre = Genre::query()->where('status', 'active')->find($data['genre_id']);
        if (! $genre) {
            throw ValidationException::withMessages(['genre_id' => 'Vui lòng chọn một thể loại đang hoạt động.']);
        }

        $artistName = $artist ? (string) $artist->name : trim($data['artist_name']);
        $slug = (Str::slug($title) ?: 'bai-hat').'-'.Str::lower(Str::random(8));
        $audioPublicId = $stagedAudio
            ? (string) $stagedAudio->public_id
            : $cloudinary->datedPublicId($slug.'-full-audio').'-'.Str::lower(Str::random(8));
        $coverPublicId = $cloudinary->datedPublicId($slug.'-cover').'-'.Str::lower(Str::random(8));
        $uploadedAudio = null;
        $audioUploadedDuringFinalize = false;
        $uploadedCover = null;
        $song = null;

        try {
            if ($stagedAudio) {
                $uploadedAudio = [
                    'secure_url' => $stagedAudio->file_url,
                    'public_id' => $stagedAudio->public_id,
                    'duration' => $stagedAudio->duration_seconds,
                ];
            } else {
                $uploadedAudio = $cloudinary->uploadAudio(
                    $request->file('audio_file'),
                    config('cloudinary.audio_folder', 'melodify/audio'),
                    $audioPublicId,
                );
                $audioUploadedDuringFinalize = true;
            }
            $audioUrl = (string) ($uploadedAudio['secure_url'] ?? $uploadedAudio['url'] ?? '');
            $uploadedCover = $cloudinary->uploadImage(
                $request->file('cover_image_file'),
                config('cloudinary.image_folder', 'melodify/covers'),
                $coverPublicId,
            );
            $coverUrl = (string) ($uploadedCover['secure_url'] ?? $uploadedCover['url'] ?? '');

            if ($audioUrl === '' || $coverUrl === '') {
                throw new RuntimeException('Cloudinary không trả về URL cho file âm thanh hoặc ảnh bìa.');
            }

            $duration = isset($uploadedAudio['duration']) ? (int) round((float) $uploadedAudio['duration']) : null;
            $song = Song::query()->create([
                'title' => $title,
                'slug' => $slug,
                'artist_name' => $artistName,
                'duration_seconds' => $duration,
                'cover_url' => $coverUrl,
                'cover_public_id' => $uploadedCover['public_id'] ?? $coverPublicId,
                'status' => 'draft',
                'uploaded_by_user_id' => (string) $request->user()->getKey(),
                'terms_accepted_at' => now(),
                'moderation_requested_at' => now(),
            ]);

            $audioFile = SongAudioFile::query()->create([
                'song_id' => (string) $song->getKey(),
                'file_type' => 'full',
                'file_url' => $audioUrl,
                'public_id' => $uploadedAudio['public_id'] ?? $audioPublicId,
                'external_id' => null,
                'duration_seconds' => $duration,
                'premium_only' => false,
                'stream_options' => null,
                'status' => 'active',
                'source' => 'cloudinary',
            ]);

            if ($artist) {
                SongArtist::query()->create([
                    'song_id' => (string) $song->getKey(),
                    'artist_id' => (string) $artist->getKey(),
                    'artist_role' => 'primary',
                ]);
            }

            SongGenre::query()->create([
                'song_id' => (string) $song->getKey(),
                'genre_id' => (string) $genre->getKey(),
            ]);
            $stagedAudio?->delete();
        } catch (Throwable $exception) {
            if ($song) {
                foreach ([SongAudioFile::class, SongArtist::class, SongGenre::class] as $model) {
                    try {
                        $model::query()->where('song_id', (string) $song->getKey())->delete();
                    } catch (Throwable $cleanupException) {
                        report($cleanupException);
                    }
                }
                try {
                    $song->delete();
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }
            }

            if ($audioUploadedDuringFinalize) {
                try {
                    $cloudinary->deleteAudio((string) ($uploadedAudio['public_id'] ?? $audioPublicId));
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }
            }
            try {
                $cloudinary->deleteImage((string) ($uploadedCover['public_id'] ?? $coverPublicId));
            } catch (Throwable $cleanupException) {
                report($cleanupException);
            }

            report($exception);

            return response()->json([
                'message' => 'Không thể tải bài hát lên lúc này. Vui lòng thử lại sau.',
            ], 503);
        }

        return response()->json([
            'message' => 'Đã tải bài hát lên. Bài hát đang chờ quản trị viên xét duyệt.',
            'data' => $this->summary($song, $audioFile),
        ], 201)->header('Cache-Control', 'private, no-store');
    }

    public function destroyStage(Request $request, string $uploadToken, CloudinaryService $cloudinary): JsonResponse
    {
        $stage = UserUploadStage::query()
            ->where('_id', $uploadToken)
            ->where('user_id', (string) $request->user()->getKey())
            ->first();

        if ($stage) {
            $cloudinary->deleteAudio((string) $stage->public_id);
            $stage->delete();
        }

        return response()->json(['message' => 'Đã hủy file tải tạm.']);
    }

    private function cleanupExpiredStages(CloudinaryService $cloudinary): void
    {
        UserUploadStage::query()
            ->where('expires_at', '<=', now())
            ->limit(10)
            ->get()
            ->each(function (UserUploadStage $stage) use ($cloudinary): void {
                try {
                    $cloudinary->deleteAudio((string) $stage->public_id);
                    $stage->delete();
                } catch (Throwable $exception) {
                    report($exception);
                }
            });
    }

    /** @return array{id: string, title: string, slug: string, status: string, artist_name: string|null, cover_url: string|null, audio_url: string|null, duration_seconds: int|null, created_at: string|null, moderation_note: string|null} */
    private function summary(Song $song, ?SongAudioFile $audioFile = null): array
    {
        return [
            'id' => (string) $song->getKey(),
            'title' => (string) $song->title,
            'slug' => (string) $song->slug,
            'status' => (string) $song->status,
            'artist_name' => filled($song->artist_name) ? (string) $song->artist_name : null,
            'cover_url' => filled($song->cover_url) ? (string) $song->cover_url : null,
            'audio_url' => filled($audioFile?->file_url) ? (string) $audioFile->file_url : null,
            'duration_seconds' => $song->duration_seconds === null ? null : (int) $song->duration_seconds,
            'created_at' => $song->created_at?->toISOString(),
            'moderation_note' => filled($song->moderation_note) ? (string) $song->moderation_note : null,
        ];
    }
}
