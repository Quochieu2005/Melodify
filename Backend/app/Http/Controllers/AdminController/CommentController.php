<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class CommentController extends Controller
{
    public function index(): View
    {
        $comments = Comment::query()->with(['user', 'song'])->latest()->paginate(15);

        return view('Admin.comments.index', compact('comments'));
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
