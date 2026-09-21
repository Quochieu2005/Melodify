<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TestEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $recipient)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Melodify - Email test');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.test');
    }

    public function attachments(): array
    {
        return [];
    }
}
