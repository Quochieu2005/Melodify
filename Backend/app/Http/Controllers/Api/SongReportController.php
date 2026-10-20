<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\Song;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class SongReportController extends Controller
{
    public function store(Request $request, string $slug): JsonResponse
    {
        $song = Song::query()->where('slug', $slug)->first();
        if (! $song) {
            try {
                $song = Song::query()->find($slug);
            } catch (Throwable) {
                $song = null;
            }
        }
        abort_unless($song, 404, 'Không tìm thấy bài hát.');

        $data = $request->validate([
            'reason' => ['required', 'in:incorrect_audio,incorrect_information,duplicate,inappropriate,copyright,other'],
            'details' => ['nullable', 'string', 'max:1000'],
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
        $reasonLabels = [
            'incorrect_audio' => 'Âm thanh không đúng',
            'incorrect_information' => 'Thông tin không chính xác',
            'duplicate' => 'Bài hát bị trùng',
            'inappropriate' => 'Nội dung không phù hợp',
            'copyright' => 'Vấn đề bản quyền',
            'other' => 'Lý do khác',
        ];
        $reason = $reasonLabels[$data['reason']];
        $details = trim((string) ($data['details'] ?? ''));
        if ($details !== '') {
            $reason .= ': '.$details;
        }

        $report = Report::query()->create([
            'reporter_user_id' => $request->user()?->getKey() ? (string) $request->user()->getKey() : null,
            'reporter_visitor_id' => $data['visitor_id'] ?? null,
            'target_type' => 'song',
            'target_id' => (string) $song->getKey(),
            'reason' => $reason,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Đã gửi báo cáo bài hát.',
            'report_id' => (string) $report->getKey(),
        ], 201);
    }
}
