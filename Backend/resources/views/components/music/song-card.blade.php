@props(['title', 'artist'])

<article class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
    <h3 class="font-semibold text-zinc-900">{{ $title }}</h3>
    <p class="mt-1 text-sm text-zinc-500">{{ $artist }}</p>
</article>
