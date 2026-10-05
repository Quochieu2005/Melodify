@php
    $toasts = collect([
        'success' => session('success'),
        'error' => session('error'),
        'warning' => session('warning'),
        'info' => session('info'),
    ])->filter();

    if ($errors->any() && ! $toasts->has('error')) {
        $toasts->put('error', $errors->first());
    }
@endphp

@if($toasts->isNotEmpty())
    <div class="admin-toast-stack" aria-live="polite" aria-atomic="true" data-toast-stack>
        @foreach($toasts as $toastType => $toastMessage)
            <div class="admin-toast admin-toast-{{ $toastType }}" role="{{ $toastType === 'error' ? 'alert' : 'status' }}" data-toast>
                <span class="admin-toast-icon" aria-hidden="true">
                    @if($toastType === 'success')
                        <x-anticon name="check" />
                    @else
                        <x-anticon name="alert" />
                    @endif
                </span>
                <span class="admin-toast-message">{{ $toastMessage }}</span>
                <button type="button" class="admin-toast-close" aria-label="Đóng thông báo" data-toast-close>
                    <x-anticon name="close" />
                </button>
            </div>
        @endforeach
    </div>
@endif
