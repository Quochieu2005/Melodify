<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use App\Rules\PlainText;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ReportController extends Controller
{
    public function index(?Request $request = null): View
    {
        $request ??= request();
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100', new PlainText()],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $query = Report::query();

        if ($search !== '') {
            $reporterIds = User::query()
                ->where(function ($userQuery) use ($search): void {
                    $userQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })
                ->pluck('_id')
                ->all();

            $query->where(function ($nestedQuery) use ($search, $reporterIds): void {
                foreach (['target_type', 'target_id', 'reason', 'status'] as $index => $field) {
                    $method = $index === 0 ? 'where' : 'orWhere';
                    $nestedQuery->{$method}($field, 'like', "%{$search}%");
                }

                if ($reporterIds !== []) {
                    $nestedQuery->orWhereIn('reporter_user_id', $reporterIds);
                }
            });
        }

        $reports = $query->with(['reporter', 'reviewedBy'])->latest()->paginate(15)->withQueryString();

        return view('Admin.reports.index', compact('reports', 'search'));
    }

    public function update(Request $request, Report $report): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,resolved,rejected']]);
        $report->update([
            'status' => $data['status'],
            'reviewed_by_admin_id' => $request->user('admin')?->getKey(),
            'reviewed_at' => now(),
        ]);

        return back()->with('success', 'Đã cập nhật báo cáo.');
    }
}
