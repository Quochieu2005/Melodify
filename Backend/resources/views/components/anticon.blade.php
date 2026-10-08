@props(['name' => 'question-circle'])

@php
    $paths = [
        'alert' => '<path d="M12 9v4m0 4h.01"/><path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/>',
        'appstore' => '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
        'bell' => '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
        'check' => '<path d="m5 12 4 4L19 6"/>',
        'close' => '<path d="m6 6 12 12M18 6 6 18"/>',
        'cloud-upload' => '<path d="M16 16l-4-4-4 4M12 12v9"/><path d="M20.4 17.5A4.5 4.5 0 0 0 18 9h-1.1A6 6 0 1 0 6 17.5"/>',
        'credit-card' => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
        'customer-service' => '<path d="M4 13v-1a8 8 0 0 1 16 0v1"/><path d="M4 13a2 2 0 0 0 0 4h1v-4H4ZM20 13a2 2 0 0 1 0 4h-1v-4h1ZM12 21h3"/>',
        'dashboard' => '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
        'desktop' => '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
        'down' => '<path d="m6 9 6 6 6-6"/>',
        'eye' => '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
        'eye-invisible' => '<path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.1 3.5M6.2 6.9C3.6 8.5 2 12 2 12s3.5 6 10 6c1.1 0 2.1-.2 3-.5"/>',
        'file-text' => '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
        'folder' => '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
        'lock' => '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
        'logout' => '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/>',
        'mail' => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        'menu-fold' => '<path d="M4 6h16M4 12h10M4 18h16M15 9l-3 3 3 3"/>',
        'menu-unfold' => '<path d="M4 6h16M4 12h10M4 18h16M9 9l3 3-3 3"/>',
        'message' => '<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-3-.5L4 20l1.5-4A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/>',
        'moon' => '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>',
        'plus' => '<path d="M12 5v14M5 12h14"/>',
        'play-circle' => '<circle cx="12" cy="12" r="9"/><path d="m10 8 5 4-5 4V8Z"/>',
        'safety-certificate' => '<path d="m12 3 7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
        'search' => '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
        'setting' => '<path d="m12 3 1.2 1.8 2.2.5.8 2.1 2 .9-.2 2.2 1.4 1.8-1.4 1.8.2 2.2-2 .9-.8 2.1-2.2.5L12 21l-1.2-1.8-2.2-.5-.8-2.1-2-.9.2-2.2L4.6 12 6 10.2l-.2-2.2 2-.9.8-2.1 2.2-.5L12 3Z"/><circle cx="12" cy="12" r="2.5"/>',
        'sound' => '<path d="M4 10v4h4l5 4V6l-5 4H4ZM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
        'sun' => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        'tags' => '<path d="M3 5V3h2l12 12-4 4L3 7V5Z"/><path d="M16 3h3a2 2 0 0 1 2 2v3l-8 8M6.5 6.5h.01"/>',
        'team' => '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M15 15a5 5 0 0 1 6 5"/>',
        'unordered-list' => '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
        'user' => '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        'question-circle' => '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.3 1.5c-.8 1-2 1.2-2 2.5M12 17h.01"/>',
    ];
    $icon = $paths[$name] ?? $paths['question-circle'];
@endphp

<svg {{ $attributes->class(['anticon']) }} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    {!! $icon !!}
</svg>
