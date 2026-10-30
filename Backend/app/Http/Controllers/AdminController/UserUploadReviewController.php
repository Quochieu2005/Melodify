<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Song;
use App\Models\SongAudioFile;
use App\Models\User;
use App\Rules\PlainText;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class UserUploadReviewController extends Controller
{
    public function index(Request $request): View
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100', new PlainText],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $pending = Song::query()
            ->whereNotNull('uploaded_by_user_id')
            ->where('status', 'draft');
        $query = clone $pending;

        if ($search !== '') {
            $matchingUploaderIds = User::query()
                ->where(function ($builder) use ($search): void {
                    $builder->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })
                ->get()
                ->map(fn (User $user): string => (string) $user->getKey())
                ->all();

            $query->where(function ($builder) use ($search, $matchingUploaderIds): void {
                $builder->where('title', 'like', "%{$search}%")
                    ->orWhere('artist_name', 'like', "%{$search}%");

                if ($matchingUploaderIds !== []) {
                    $builder->orWhereIn('uploaded_by_user_id', $matchingUploaderIds);
                }
            });
        }

        $pendingCount = (clone $pending)->count();
        $items = $query->latest()->paginate(15)->withQueryString();
        $songIds = $items->getCollection()->map(fn (Song $song): string => (string) $song->getKey())->all();
        $uploaderIds = $items->getCollection()->pluck('uploaded_by_user_id')->filter()->map(fn ($id): string => (string) $id)->unique()->values()->all();
        $users = $uploaderIds === []
            ? collect()
            : User::query()->whereIn('_id', $uploaderIds)->get()->keyBy(fn (User $user): string => (string) $user->getKey());
        $audioFiles = $songIds === []
            ? collect()
            : SongAudioFile::query()
                ->whereIn('song_id', $songIds)
                ->where('file_type', 'full')
                ->where('status', 'active')
                ->get()
                ->keyBy('song_id');
        $rows = $items->getCollection()->map(function (Song $song) use ($users, $audioFiles): array {
            $uploaderId = (string) $song->uploaded_by_user_id;
            $uploader = $users->get($uploaderId);

            return [
                'song' => $song,
                'uploader' => $uploader,
                'uploader_label' => $uploader?->name ?: $uploader?->email ?: "Tài khoản {$uploaderId}",
                'audio' => $audioFiles->get((string) $song->getKey()),
            ];
        })->values();

        return view('Admin.upload-reviews.index', compact('items', 'rows', 'search', 'pendingCount'));
    }

    public function approve(string $songId): RedirectResponse
    {
        $song = $this->pendingSong($songId);
        $hasActiveAudio = SongAudioFile::query()
            ->where('song_id', (string) $song->getKey())
            ->where('file_type', 'full')
            ->where('status', 'active')
            ->exists();

        if (! $hasActiveAudio || blank($song->cover_url)) {
            return back()->withErrors([
                'review' => 'Không thể phát hành bài hát này vì đang thiếu audio hoặc ảnh bìa hợp lệ.',
            ]);
        }

        $song->status = 'published';
        $song->moderated_by_admin_id = (string) auth('admin')->id();
        $song->moderated_at = now();
        $song->moderation_note = null;
        $song->save();

        return redirect()->route('admin.uploads.review.index')
            ->with('success', "Đã duyệt và phát hành bài hát “{$song->title}”.");
    }

    public function reject(Request $request, string $songId): RedirectResponse
    {
        $data = $request->validate([
            'note' => ['required', 'string', 'min:3', 'max:500', new PlainText],
        ], [
            'note.required' => 'Vui lòng ghi lý do từ chối để người tải lên biết cần chỉnh sửa gì.',
            'note.min' => 'Lý do từ chối cần có ít nhất 3 ký tự.',
            'note.max' => 'Lý do từ chối không được dài hơn 500 ký tự.',
        ]);
        $song = $this->pendingSong($songId);
        $song->status = 'blocked';
        $song->moderated_by_admin_id = (string) auth('admin')->id();
        $song->moderated_at = now();
        $song->moderation_note = trim($data['note']);
        $song->save();

        return redirect()->route('admin.uploads.review.index')
            ->with('success', "Đã từ chối bài hát “{$song->title}” và lưu lý do cho người tải lên.");
    }

    private function pendingSong(string $songId): Song
    {
        return Song::query()
            ->whereNotNull('uploaded_by_user_id')
            ->where('status', 'draft')
            ->findOrFail($songId);
    }
}
