<div class="admin-dashboard">
    <section class="admin-welcome">
        <x-shared.brand />
        <p class="admin-eyebrow">ONLINE MUSIC PLATFORM</p>
        <h1>Nghe nhạc theo cách của bạn</h1>
        <p class="admin-lead">Backend Laravel của Melodify đã sẵn sàng để cung cấp API cho website và ứng dụng mobile.</p>
    </section>
    <section class="admin-stat-grid">
        <x-music.song-card title="Bài hát nổi bật" artist="Melodify Artist" />
        <x-music.song-card title="Giai điệu mới" artist="Melodify Artist" />
    </section>
    <x-player.music-player />
</div>
