@php
    $toastMessage = session('success') ?? session('error');
    $toastType = session('error') ? 'error' : 'success';
@endphp
@if($toastMessage)
    <div class="admin-toast admin-toast-{{ $toastType }}" role="status" data-toast>
        <span class="admin-toast-icon">{{ $toastType === 'success' ? '✓' : '!' }}</span>
        <span>{{ $toastMessage }}</span>
        <button type="button" aria-label="Đóng thông báo" data-toast-close>×</button>
    </div>
@endif
