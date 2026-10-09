<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Song;
use App\Models\User;
use App\Rules\PlainText;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CommentController extends Controller
{
    public function index(?Request $request = null): View
    {
        $request ??= request();
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100', new PlainText()],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $query = Comment::query();

        if ($search !== '') {
            $userIds = User::query()
                ->where(function ($userQuery) use ($search): void {
                    $userQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })
                ->pluck('_id')
                ->all();
            $songIds = Song::query()
                ->where(function ($songQuery) use ($search): void {
                    $songQuery
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%");
                })
                ->pluck('_id')
                ->all();

            $query->where(function ($nestedQuery) use ($search, $userIds, $songIds): void {
                $nestedQuery
                    ->where('content', 'like', "%{$search}%")
                    ->orWhere('status', 'like', "%{$search}%");

                if ($userIds !== []) {
                    $nestedQuery->orWhereIn('user_id', $userIds);
                }

                if ($songIds !== []) {
                    $nestedQuery->orWhereIn('song_id', $songIds);
                }
            });
        }

        $comments = $query->with(['user', 'song'])->latest()->paginate(15)->withQueryString();

        return view('Admin.comments.index', compact('comments', 'search'));
    }

    public function update(Comment $comment): RedirectResponse
    {
        $comment->update(['status' => $comment->status === 'hidden' ? 'visible' : 'hidden']);

        return back()->with('success', 'Đã cập nhật trạng thái bình luận.');
    }

    public function destroy(Comment $comment): RedirectResponse
    {
        $comment->delete();

        return back()->with('success', 'Đã xóa bình luận.');
    }
}
