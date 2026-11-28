<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\SongVideo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class VideoReportController extends Controller
{
    public function store(Request $request, string $slug): JsonResponse
    {
        $video = SongVideo::query()->where('status', 'active')->where('slug', $slug)->first();
        if (! $video) {
            try {
                $video = SongVideo::query()->where('status', 'active')->find($slug);
            } catch (Throwable) {
                $video = null;
            }
        }
        abort_unless($video, 404, 'Không tìm thấy video.');

        $data = $request->validate([
            'reason' => ['required', 'in:incorrect_video,incorrect_information,duplicate,inappropriate,copyright,other'],
            'details' => ['nullable', 'string', 'max:1000'],
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
        $reasonLabels = [
            'incorrect_video' => 'Video không phát được',
            'incorrect_information' => 'Thông tin không chính xác',
            'duplicate' => 'Video bị trùng',
            'inappropriate' => 'Nội dung không phù hợp',
            'copyright' => 'Vấn đề bản quyền',
            'other' => 'Lý do khác',
        ];
        $reason = $reasonLabels[$data['reason']];
        $details = trim((string) ($data['details'] ?? ''));
        if ($details !== '') {
            $reason .= ': '.$details;
        }

        // The same account (or, for guests, the same address) reporting the same thing again within a day is
        // one report, so the moderation queue cannot be flooded with copies.
        $reporterKey = $request->user()?->getKey() ? 'user:'.$request->user()->getKey() : 'ip:'.hash('sha256', (string) $request->ip());
        $existing = Report::query()
            ->where('target_type', 'video')
            ->where('target_id', (string) $video->getKey())
            ->where('reporter_key', $reporterKey)
            ->where('reason', $reason)
            ->where('created_at', '>=', now()->subDay())
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Bạn đã báo cáo video này rồi. Cảm ơn bạn.', 'report_id' => (string) $existing->getKey()]);
        }

        $report = Report::query()->create([
            'reporter_key' => $reporterKey,
            'reporter_user_id' => $request->user()?->getKey() ? (string) $request->user()->getKey() : null,
            'reporter_visitor_id' => $data['visitor_id'] ?? null,
            'target_type' => 'video',
            'target_id' => (string) $video->getKey(),
            'reason' => $reason,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Đã gửi báo cáo video.',
            'report_id' => (string) $report->getKey(),
        ], 201);
    }
}
