'use client';

import { Lexend } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ArtistLink, ArtistNames } from '@/components/artists';
import { usePlayer } from '@/components/player';
import { getArtist, getSong, listSongs, type AlbumRecord, type Lyric, type Song, type SongArtistCredit } from '@/lib/api';
import { recentAlbumItem, recentSongItem, recordRecentItem } from '@/lib/recent-history';

const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: '700' });
const fallbackCover = '/topics/genre/vpop_600.png';
const sidebarSurfaceStyle = {
  background: 'linear-gradient(180deg, #213d39 0%, #202a28 28%, #171817 68%, #111 100%)',
};

function PlayIcon() {
  return <span aria-hidden="true" className="ml-0.5 border-y-[7px] border-l-[10px] border-y-transparent border-l-current" />;
}

function PauseIcon() {
  return <span aria-hidden="true" className="flex gap-1"><span className="h-4 w-1.5 rounded-sm bg-current" /><span className="h-4 w-1.5 rounded-sm bg-current" /></span>;
}

function HeartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-[1.8]"><path d="M12 20.2 3.8 12A5.2 5.2 0 0 1 11.15 4.65L12 5.5l.85-.85A5.2 5.2 0 0 1 20.2 12L12 20.2Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-[1.8]"><path d="m5 12 14-8-4 16-4-6-6-2Zm6 2 8-10" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>;
}

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M12 3v11m0 0 4-4m-4 4-4-4M4 20h16" strokeLinecap="round" /></svg>;
}

function songArtists(song: Song): SongArtistCredit[] {
  return song.artists?.length ? song.artists : song.artist ? [song.artist] : [];
}

function formatCount(count: number | undefined) {
  return new Intl.NumberFormat('vi-VN').format(count ?? 0);
}

type SyncedLyricLine = {
  time: number;
  text: string;
};

function parseSyncedLyrics(lyrics: Lyric[]): SyncedLyricLine[] {
  const timestampPattern = /\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]/g;

  return lyrics.flatMap((lyric) => {
    const syncedLyrics = lyric.synced_lyrics?.trim();
    if (!syncedLyrics) return [];

    return syncedLyrics.split(/\r?\n/).flatMap((line) => {
      const matches = Array.from(line.matchAll(timestampPattern));
      const text = line.replace(timestampPattern, '').trim();
      if (!text || matches.length === 0) return [];

      return matches.map((match) => ({
        time: Number(match[1]) * 60 + Number(match[2]),
        text,
      }));
    });
  }).sort((first, second) => first.time - second.time);
}

function LyricBlock({ lyrics, elapsed, isActiveTrack, onSeek }: { lyrics: Lyric[]; elapsed: number; isActiveTrack: boolean; onSeek: (seconds: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const lyricScrollRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLButtonElement | null>(null);
  const syncedLines = useMemo(() => parseSyncedLyrics(lyrics), [lyrics]);
  const activeIndex = useMemo(() => {
    if (syncedLines.length === 0) return -1;
    const currentIndex = syncedLines.reduce((active, line, index) => line.time <= elapsed ? index : active, -1);
    return currentIndex >= 0 || !isActiveTrack ? currentIndex : 0;
  }, [elapsed, isActiveTrack, syncedLines]);
  const content = lyrics.map((lyric) => (lyric.content || lyric.plain_lyrics || '').trim()).filter(Boolean).join('\n\n');
  const lines = content.split('\n');
  const shouldCollapse = lines.length > 9;
  const visibleContent = shouldCollapse && !expanded ? lines.slice(0, 9).join('\n') : content;

  useEffect(() => {
    const container = lyricScrollRef.current;
    const activeLine = activeLineRef.current;
    if (!isActiveTrack || activeIndex < 0 || !container || !activeLine) return;

    const lineTop = activeLine.offsetTop;
    const lineBottom = lineTop + activeLine.offsetHeight;
    const visibleTop = container.scrollTop;
    const visibleBottom = visibleTop + container.clientHeight;

    if (lineTop < visibleTop || lineBottom > visibleBottom) {
      container.scrollTo({
        top: Math.max(0, lineTop - (container.clientHeight - activeLine.offsetHeight) / 2),
        behavior: 'smooth',
      });
    }
  }, [activeIndex, isActiveTrack]);

  if (syncedLines.length > 0) {
    return (
      <div ref={lyricScrollRef} className="lyric-scroll max-h-[430px] overflow-x-hidden overflow-y-auto pr-2">
        <div className="space-y-2">
          {syncedLines.map((line, index) => (
            <button
              type="button"
              key={`${line.time}-${index}`}
              onClick={() => onSeek(line.time)}
              ref={(element) => {
                if (index === activeIndex) activeLineRef.current = element;
              }}
              aria-current={index === activeIndex ? 'true' : undefined}
              title="Phát từ câu này"
              className={`block w-full origin-left text-left text-[15px] font-semibold leading-6 transition-all duration-500 hover:text-cyan-200 ${index === activeIndex ? 'scale-[1.02] text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.25)]' : 'text-white/65'}`}
            >
              {line.text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!content) return <p className="text-sm text-white/60">Bài hát chưa có lời.</p>;

  return (
    <>
      <p className="whitespace-pre-line text-[15px] font-semibold leading-6 text-white/90">{visibleContent}</p>
      {shouldCollapse ? <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-5 inline-flex items-center gap-3 font-bold text-white transition-colors hover:text-cyan-300">{expanded ? 'Thu gọn' : 'Xem thêm'} <span aria-hidden="true" className={`size-2 rotate-45 border-r-2 border-b-2 transition-transform ${expanded ? '-translate-y-0.5 rotate-[225deg]' : ''}`} /></button> : null}
    </>
  );
}

function ArtistPanel({ artists }: { artists: SongArtistCredit[] }) {
  return (
    <aside aria-labelledby="song-artists-heading">
      <h2 id="song-artists-heading" className={`${lexend.className} text-[26px] font-bold`}>Nghệ sĩ</h2>
      <div className="mt-5 space-y-4">
        {artists.map((artist, index) => (
          <div key={`${artist.id || artist.name}-${index}`} className="flex items-center gap-3">
            <div role="img" aria-label={`Ảnh đại diện ${artist.name}`} className="size-16 shrink-0 rounded-full bg-cover bg-center bg-[#565657]" style={artist.avatar_url ? { backgroundImage: `url("${artist.avatar_url}")`, backgroundPosition: 'center 20%' } : undefined}>
              {!artist.avatar_url ? <span className="grid size-full place-items-center text-xl font-bold text-white/70">{artist.name.charAt(0)}</span> : null}
            </div>
            <div className="min-w-0 flex-1">
              <ArtistLink artist={artist} className="block truncate text-[15px] font-bold text-white hover:text-cyan-300">{artist.name}</ArtistLink>
              <p className="mt-1 text-xs text-white/50">Nghệ sĩ</p>
            </div>
            <button type="button" className="shrink-0 rounded-full border border-white/70 px-4 py-1.5 text-xs font-bold transition-colors hover:border-cyan-300 hover:text-cyan-300">Theo dõi</button>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function SongDetailPage({ slug }: { slug: string }) {
  const { track, isPlaying, elapsed, playSong, togglePlay, seek } = usePlayer();
  const [song, setSong] = useState<(Song & { lyrics: Lyric[] }) | null>(null);
  const [featuredAlbumState, setFeaturedAlbumState] = useState<{ artistKey: string; albums: AlbumRecord[] }>({ artistKey: '', albums: [] });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const pendingLyricSeekRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSong = async () => {
      setIsLoading(true);
      setError('');
      try {
        let songResponse: Song & { lyrics: Lyric[] };
        try {
          songResponse = (await getSong(slug)).data;
        } catch {
          const searchQuery = decodeURIComponent(slug).replace(/-/g, ' ');
          const searchResponse = await listSongs({ query: searchQuery, perPage: 1 });
          const fallbackSong = searchResponse.data[0];
          if (!fallbackSong) throw new Error('Song not found');
          songResponse = { ...fallbackSong, lyrics: [] };
        }
        if (cancelled) return;
        setSong(songResponse);
        recordRecentItem(recentSongItem(songResponse));
      } catch {
        if (!cancelled) setError('Không thể tải bài hát lúc này.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadSong();

    return () => { cancelled = true; };
  }, [slug]);

  const artists = useMemo(() => song ? songArtists(song) : [], [song]);
  const currentTrack = Boolean(song && track?.id === song.id);
  const artistIdentifier = artists[0]?.slug || artists[0]?.id || artists[0]?.name || '';
  const featuredAlbums = featuredAlbumState.artistKey === artistIdentifier ? featuredAlbumState.albums : [];

  useEffect(() => {
    let cancelled = false;

    if (!artistIdentifier) {
      return () => { cancelled = true; };
    }

    void getArtist(artistIdentifier, { summary: true })
      .then(({ data }) => {
        if (!cancelled) setFeaturedAlbumState({ artistKey: artistIdentifier, albums: (data.albums || []).slice(0, 12) });
      })
      .catch(() => {
        if (!cancelled) setFeaturedAlbumState({ artistKey: artistIdentifier, albums: [] });
      });

    return () => { cancelled = true; };
  }, [artistIdentifier]);

  useEffect(() => {
    if (!currentTrack || pendingLyricSeekRef.current === null) return;

    const target = pendingLyricSeekRef.current;
    pendingLyricSeekRef.current = null;
    const timer = window.setTimeout(() => seek(target), 0);

    return () => window.clearTimeout(timer);
  }, [currentTrack, seek]);

  if (isLoading) return <main style={sidebarSurfaceStyle} className="min-h-[calc(100vh-80px)] px-5 pb-20 pt-8 sm:px-8 lg:px-10"><div className="h-[620px] animate-pulse rounded-2xl bg-[#30443f]" /></main>;
  if (error || !song) return <main style={sidebarSurfaceStyle} className="min-h-[calc(100vh-80px)] px-5 pb-20 pt-8 text-white sm:px-8 lg:px-10"><Link href="/home" className="text-sm text-white/70 hover:text-white">← Quay lại khám phá</Link><p role="alert" className="mt-8 rounded-lg bg-[#30443f] px-4 py-5 text-sm text-white/75">{error || 'Không tìm thấy bài hát.'}</p></main>;

  const handlePlay = () => {
    if (currentTrack) togglePlay();
    else playSong(song);
  };

  const handleLyricSeek = (seconds: number) => {
    if (currentTrack) {
      seek(seconds);
      if (!isPlaying) togglePlay();
      return;
    }

    pendingLyricSeekRef.current = seconds;
    playSong(song);
  };

  return (
    <main style={sidebarSurfaceStyle} className="min-h-[calc(100vh-80px)] overflow-x-hidden pb-20 text-white">
      <section className="mx-auto w-full max-w-[1582px] px-5 pb-8 pt-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div role="img" aria-label={`Ảnh bìa ${song.title}`} className="size-56 shrink-0 rounded-xl bg-cover bg-center shadow-xl sm:size-64" style={{ backgroundImage: `url("${song.cover_url || fallbackCover}")` }} />
            <div className="min-w-0 pt-1">
              <p className="text-sm text-white/60">Bài hát</p>
              <h1 className={`${lexend.className} mt-3 text-[34px] leading-tight sm:text-[42px]`}>{song.title}</h1>
              <ArtistNames artists={artists} className="mt-4 block text-sm font-bold text-white" />
              <div className="mt-7 flex items-center gap-4 text-white/80">
                <button type="button" aria-label={`Yêu thích ${song.title}`} className="transition-colors hover:text-cyan-300"><HeartIcon /></button>
                <button type="button" aria-label={`Chia sẻ ${song.title}`} className="transition-colors hover:text-cyan-300"><ShareIcon /></button>
                <button type="button" aria-label="Thêm tùy chọn" className="grid size-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"><MoreIcon /></button>
              </div>
              <div className="mt-6 flex flex-wrap gap-4">
                <button type="button" onClick={handlePlay} className="inline-flex h-11 items-center gap-3 rounded-full bg-[#00cfe3] px-8 text-sm font-bold text-[#07363a] transition-colors hover:bg-[#34dbea]">{currentTrack && isPlaying ? <PauseIcon /> : <PlayIcon />}{currentTrack && isPlaying ? 'Tạm dừng' : 'Phát'}</button>
                <a href={song.audio_url || song.stream_url || song.source_url || '#'} download className="inline-flex h-11 items-center gap-3 rounded-full bg-white/15 px-8 text-sm font-bold transition-colors hover:bg-white/25"><DownloadIcon />Tải về</a>
              </div>
            </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <section aria-labelledby="lyrics-heading">
            <h2 id="lyrics-heading" className={`${lexend.className} text-[26px] font-bold`}>Lời bài hát</h2>
            <div className="mt-4 rounded-xl bg-[#242424] p-5 sm:p-6">
              <p className="border-b border-white/10 pb-4 text-xs text-white/55">Đăng bởi <span className="font-bold text-white">{song.publisher || 'Melodify'}</span></p>
              <div className="pt-5"><LyricBlock lyrics={song.lyrics || []} elapsed={currentTrack ? elapsed : 0} isActiveTrack={currentTrack} onSeek={handleLyricSeek} /></div>
            </div>
          </section>
          <ArtistPanel artists={artists} />
        </div>
      </section>

      {artists[0] ? <section className="mx-auto w-full max-w-[1582px] px-5 pt-5 sm:px-8 lg:px-10"><h2 className={`${lexend.className} text-[25px] font-bold`}>Bài hát nổi bật của <ArtistLink artist={artists[0]} className="text-cyan-300 hover:text-cyan-200">{artists[0].name}</ArtistLink></h2><p className="mt-5 text-sm text-white/55">{formatCount(song.views)} lượt nghe</p></section> : null}

      {artists[0] && featuredAlbums.length > 0 ? <section className="mx-auto w-full max-w-[1582px] px-5 pb-12 pt-10 sm:px-8 lg:px-10">
        <h2 className={`${lexend.className} text-[25px] font-bold`}>Album nổi bật của <ArtistLink artist={artists[0]} className="text-cyan-300 transition-colors hover:text-cyan-200">{artists[0].name}</ArtistLink></h2>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {featuredAlbums.map((album) => <Link
            key={album.id}
            href={`/album/${encodeURIComponent(album.slug || album.id)}`}
            onClick={() => recordRecentItem(recentAlbumItem(album))}
            className="group min-w-0"
          >
            <div
              role="img"
              aria-label={`Ảnh bìa album ${album.title}`}
              title={album.title}
              className="aspect-square overflow-hidden rounded-lg bg-cover bg-center shadow-lg transition-transform duration-300 group-hover:scale-[1.02]"
              style={{ backgroundImage: `url("${album.cover_url || fallbackCover}")` }}
            />
            <h3 className="mt-3 truncate text-sm font-bold text-white transition-colors group-hover:text-cyan-300" title={album.title}>{album.title}</h3>
            <p className="mt-1 truncate text-xs text-white/65" title={album.artist?.name || artists[0].name}>{album.artist?.name || artists[0].name}</p>
          </Link>)}
        </div>
      </section> : null}
    </main>
  );
}
