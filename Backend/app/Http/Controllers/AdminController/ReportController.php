<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ReportController extends Controller
{
    public function index(): View
    {
        $reports = Report::query()->with(['reporter', 'reviewedBy'])->latest()->paginate(15);

        return view('Admin.reports.index', compact('reports'));
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
