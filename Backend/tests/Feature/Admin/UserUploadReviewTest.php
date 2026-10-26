<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use App\Models\Song;
use App\Models\SongAudioFile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class UserUploadReviewTest extends TestCase
{
    private string $testPrefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->testPrefix = 'test_upload_review_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->testPrefix]);
        DB::purge('mongodb');
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->testPrefix && preg_match('/^test_upload_review_[a-f0-9]{16}_$/', $this->testPrefix)) {
                foreach (['admins', 'logs', 'users', 'songs', 'song_audio_files'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_review_queue_shows_only_pending_user_uploads_and_audio_preview(): void
    {
        $admin = $this->admin(['uploads.review']);
        $this->actingAs($admin, 'admin');
        $pendingSong = $this->pendingUpload('Song Waiting for Review', 'Uploader One');
        Song::query()->create([
            'title' => 'Admin Draft Must Not Appear',
            'slug' => 'admin-draft-not-pending',
            'status' => 'draft',
        ]);
        $publishedSong = $this->pendingUpload('Already Published Upload', 'Uploader Two');
        $publishedSong->status = 'published';
        $publishedSong->save();

        $this->get(route('admin.uploads.review.index'))
            ->assertOk()
            ->assertSee('Duyệt bài hát tải lên')
            ->assertSee('Song Waiting for Review')
            ->assertSee('uploader-one@example.test')
            ->assertSee('https://res.cloudinary.com/demo/audio/review.mp3', false)
            ->assertSee('Duyệt &amp; phát hành', false)
            ->assertDontSee('Admin Draft Must Not Appear')
            ->assertDontSee('Already Published Upload');
    }

    public function test_admin_role_can_approve_upload_and_publish_it(): void
    {
        $admin = $this->admin(['uploads.review']);
        $this->actingAs($admin, 'admin');
        $song = $this->pendingUpload('Approve This Upload', 'Uploader Approve');

        $this->post(route('admin.uploads.review.approve', $song->getKey()))
            ->assertRedirect(route('admin.uploads.review.index'))
            ->assertSessionHas('success');

        $song->refresh();
        $this->assertSame('published', $song->status);
        $this->assertSame((string) $admin->getKey(), (string) $song->moderated_by_admin_id);
        $this->assertNotNull($song->moderated_at);
        $this->assertNull($song->moderation_note);
        $this->get(route('admin.uploads.review.index'))
            ->assertOk()
            ->assertSee('Không có bài hát đang chờ duyệt');
    }

    public function test_admin_role_can_reject_upload_with_a_reason(): void
    {
        $this->actingAs($this->admin(['uploads.review']), 'admin');
        $song = $this->pendingUpload('Reject This Upload', 'Uploader Reject');

        $this->post(route('admin.uploads.review.reject', $song->getKey()), ['note' => 'Ảnh bìa chưa đúng quy định.'])
            ->assertRedirect(route('admin.uploads.review.index'))
            ->assertSessionHas('success');

        $song->refresh();
        $this->assertSame('blocked', $song->status);
        $this->assertSame('Ảnh bìa chưa đúng quy định.', $song->moderation_note);
        $this->assertNotNull($song->moderated_at);
    }

    public function test_song_editors_can_review_but_unassigned_admin_roles_cannot(): void
    {
        $songEditor = $this->admin(['songs.update']);
        $this->actingAs($songEditor, 'admin')
            ->get(route('admin.uploads.review.index'))
            ->assertOk();

        auth('admin')->logout();
        $unassignedAdmin = $this->admin([]);
        $this->actingAs($unassignedAdmin, 'admin')
            ->get(route('admin.uploads.review.index'))
            ->assertForbidden();
    }

    public function test_rejection_requires_a_reason(): void
    {
        $this->actingAs($this->admin(['uploads.review']), 'admin');
        $song = $this->pendingUpload('Reason Required Upload', 'Uploader Reason');

        $this->from(route('admin.uploads.review.index'))
            ->post(route('admin.uploads.review.reject', $song->getKey()), ['note' => ''])
            ->assertSessionHasErrors('note');

        $this->assertSame('draft', $song->fresh()->status);
    }

    /** @param array<int, string> $permissions */
    private function admin(array $permissions): Admin
    {
        static $sequence = 0;
        $sequence++;
        $slug = 'upload-review-admin-'.$sequence.'-'.Str::lower(Str::random(5));

        return Admin::query()->create([
            'name' => 'Upload Review Admin',
            'email' => $slug.'@example.test',
            'slug' => $slug,
            'password' => 'not-a-real-password',
            'role' => 'admin',
            'permissions' => $permissions,
            'status' => 'active',
            'is_active' => true,
        ]);
    }

    private function pendingUpload(string $title, string $uploaderName): Song
    {
        $uploaderSlug = Str::slug($uploaderName);
        $uploader = User::query()->create([
            'name' => $uploaderName,
            'username' => $uploaderSlug,
            'email' => $uploaderSlug.'@example.test',
            'status' => 'active',
        ]);
        $song = Song::query()->create([
            'title' => $title,
            'slug' => Str::slug($title),
            'artist_name' => 'Test Artist',
            'cover_url' => 'https://res.cloudinary.com/demo/image/review-cover.jpg',
            'status' => 'draft',
            'uploaded_by_user_id' => (string) $uploader->getKey(),
        ]);
        SongAudioFile::query()->create([
            'song_id' => (string) $song->getKey(),
            'file_type' => 'full',
            'file_url' => 'https://res.cloudinary.com/demo/audio/review.mp3',
            'status' => 'active',
        ]);

        return $song;
    }
}
