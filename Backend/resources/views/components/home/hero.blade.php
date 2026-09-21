<main class="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-8 px-6 py-16">
    <x-shared.brand />
    <section class="max-w-3xl">
        <p class="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">Online music platform</p>
        <h1 class="text-4xl font-bold tracking-tight sm:text-6xl">Nghe nhạc theo cách của bạn</h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">Backend Laravel của Melodify đã sẵn sàng để cung cấp API cho website và ứng dụng mobile.</p>
    </section>
    <section class="grid gap-4 sm:grid-cols-2">
        <x-music.song-card title="Bài hát nổi bật" artist="Melodify Artist" />
        <x-music.song-card title="Giai điệu mới" artist="Melodify Artist" />
    </section>
    <x-player.music-player />
</main>
