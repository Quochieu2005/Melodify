@props(['title', 'artist'])

<article class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
    <h3 class="font-semibold text-white">{{ $title }}</h3>
    <p class="mt-1 text-sm text-zinc-400">{{ $artist }}</p>
</article>
