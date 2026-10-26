<?php

namespace App\Support;

final class AudioUploadRules
{
    /** @var list<string> */
    private const EXTENSIONS = ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'oga', 'opus', 'webm'];

    /** @var list<string> */
    private const MIME_TYPES = [
        'audio/mpeg', 'audio/mp3',
        'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'video/mp4',
        'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave',
        'audio/flac', 'audio/x-flac',
        'audio/aac', 'audio/x-aac', 'audio/aacp',
        'audio/ogg', 'application/ogg', 'audio/x-ogg', 'audio/vorbis', 'audio/opus',
        'audio/webm', 'video/webm',
    ];

    /** @return list<string> */
    public static function rules(bool $required = false): array
    {
        return [
            $required ? 'required' : 'nullable',
            'file',
            'extensions:'.implode(',', self::EXTENSIONS),
            'mimetypes:'.implode(',', self::MIME_TYPES),
            'max:102400',
        ];
    }

    public static function formatLabel(): string
    {
        return 'MP3, M4A, WAV, FLAC, AAC, OGG/OGA, OPUS hoặc WEBM';
    }
}
