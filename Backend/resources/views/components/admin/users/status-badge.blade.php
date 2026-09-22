@props(['status'])

@php
    $statusStyles = match ($status) {
        'active' => ['Đang hoạt động', 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'],
        'suspended' => ['Đã tạm khóa', 'bg-rose-50 text-rose-700 ring-rose-600/20'],
        'inactive' => ['Không hoạt động', 'bg-slate-100 text-slate-600 ring-slate-500/20'],
        default => ['Chưa xác định', 'bg-amber-50 text-amber-700 ring-amber-600/20'],
    };
@endphp

<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset {{ $statusStyles[1] }}">
    {{ $statusStyles[0] }}
</span>
