'use client';
import FollowButton from '@/components/follow/FollowButton';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ArtistLink, ArtistNames } from '@/components/artists';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { usePlayer } from '@/components/player';
import { ApiError, getArtist, getSong, getSongLyrics, getSongDownloadUrl, getVisitorId, recordSongShare, toggleSongFavorite, type AlbumRecord, type Lyric, type Song, type SongArtistCredit } from '@/lib/api';
import { recentAlbumItem, recentSongItem, recordRecentItem } from '@/lib/recent-history';
import { activeLyricIndex, getPlainLyrics, parseSyncedLyrics } from '@/lib/lyrics';
import { LyricText } from '@/components/player/LyricText';

const fallbackCover = '/images/cover-placeholder.svg';
const sidebarSurfaceStyle = {
  background: 'linear-gradient(180deg, #213d39 0%, #202a28 28%, #171817 68%, #111 100%)',
};

function PauseIcon() {
  return <span aria-hidden="true" className="flex gap-1"><span className="h-4 w-1.5 rounded-sm bg-current" /><span className="h-4 w-1.5 rounded-sm bg-current" /></span>;
}

function HeartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M12 21.1 3.4 12.7a5.8 5.8 0 0 1 8.2-8.2l.4.4.4-.4a5.8 5.8 0 0 1 8.2 8.2L12 21.1Z" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M14 3 23 11l-9 8v-5C8.2 14 4.4 15.5 1 21c.7-8 4.3-12.1 13-12.8V3Z" /></svg>;
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

function LyricBlock({ lyrics, elapsed, isActiveTrack, onSeek }: { lyrics: Lyric[]; elapsed: number; isActiveTrack: boolean; onSeek: (seconds: number) => void }) {
  const syncedLines = useMemo(() => parseSyncedLyrics(lyrics), [lyrics]);
  const activeIndex = isActiveTrack ? activeLyricIndex(syncedLines, elapsed) : -1;
  const content = useMemo(() => getPlainLyrics(lyrics), [lyrics]);
  const hasPlainText = lyrics.some((lyric) => lyric.plain_lyrics?.trim() || (!lyric.is_synced && lyric.content?.trim()));

  // Read the complete plain transcript when browsing. During playback use the
  // complete saved timed version, just like admin; never align the two by guess.
  if (syncedLines.length > 0 && (isActiveTrack || !hasPlainText)) {
    return (
      <div role="region" aria-label="Lời bài hát đồng bộ">
        <div className="space-y-2">
          {syncedLines.map((line, index) => (
            <button
              type="button"
              key={`${line.time}-${index}`}
              onClick={() => onSeek(line.time)}
              data-lyric-time={line.time}
              aria-label={line.text}
              aria-current={index === activeIndex ? 'true' : undefined}
              title="Phát từ câu này"
              className={`block w-full origin-left text-left text-[15px] font-semibold leading-6 transition-all duration-500 hover:text-cyan-200 ${index === activeIndex ? 'scale-[1.02] text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.25)]' : 'text-white/65'}`}
            >
              <LyricText line={line} elapsed={elapsed} active={index === activeIndex} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!content) return <p className="text-sm text-white/60">Bài hát chưa có lời.</p>;

  return (
    <p data-plain-lyrics className="whitespace-pre-line text-[15px] font-semibold leading-6 text-white/90">{content}</p>
  );
}

function ArtistPanel({ artists }: { artists: SongArtistCredit[] }) {
  return (
    <aside aria-labelledby="song-artists-heading">
      <h2 id="song-artists-heading" className="text-[26px] font-bold">Nghệ sĩ</h2>
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
                  {artist.id && <FollowButton id={artist.id} />}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function SongDetailPage({ slug }: { slug: string }) {
  const { track, isPlaying, isPremium, elapsed, requestVipAccess, playSong, togglePlay, seek, refreshTrackMetadata } = usePlayer();
  const [song, setSong] = useState<(Song & { lyrics: Lyric[] }) | null>(null);
  const [featuredAlbumState, setFeaturedAlbumState] = useState<{ artistKey: string; albums: AlbumRecord[] }>({ artistKey: '', albums: [] });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSharePending, setIsSharePending] = useState(false);
  const [engagementStatus, setEngagementStatus] = useState('');
  const pendingLyricSeekRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSong = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [response, lyricsResponse] = await Promise.all([
          getSong(slug, getVisitorId()),
          getSongLyrics(slug),
        ]);
        const songResponse = { ...response.data, lyrics: lyricsResponse.data };
        if (cancelled) return;
        setSong(songResponse);
        recordRecentItem(recentSongItem(songResponse));
      } catch (cause) {
        if (!cancelled) setError(cause instanceof ApiError && cause.status === 404 ? 'Không tìm thấy bài hát.' : 'Không thể tải bài hát lúc này.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadSong();

    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!song || isLoading || window.location.hash !== '#lyrics') return;
    const frame = window.requestAnimationFrame(() => document.getElementById('lyrics')?.scrollIntoView({ block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
  }, [song, isLoading]);

  const artists = useMemo(() => song ? songArtists(song) : [], [song]);
  const currentTrack = Boolean(song && track?.id === song.id);
  const artistIdentifier = artists[0]?.slug || artists[0]?.id || artists[0]?.name || '';
  const featuredAlbums = featuredAlbumState.artistKey === artistIdentifier ? featuredAlbumState.albums : [];

  useEffect(() => {
    if (song && currentTrack) void refreshTrackMetadata(song);
  }, [currentTrack, refreshTrackMetadata, song]);

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
    seek(target);
  }, [currentTrack, seek]);

  if (isLoading) return <main style={sidebarSurfaceStyle} className="min-h-[calc(100vh-80px)] px-5 pb-20 pt-8 sm:px-8 lg:px-10"><div className="h-[620px] animate-pulse rounded-2xl bg-[#30443f]" /></main>;
  if (error || !song) return <main style={sidebarSurfaceStyle} className="min-h-[calc(100vh-80px)] px-5 pb-20 pt-8 text-white sm:px-8 lg:px-10"><Link href="/home" className="text-sm text-white/70 hover:text-white">← Quay lại khám phá</Link><p role="alert" className="mt-8 rounded-lg bg-[#30443f] px-4 py-5 text-sm text-white/75">{error || 'Không tìm thấy bài hát.'}</p></main>;

  const handlePlay = () => {
    if (currentTrack) togglePlay();
    else playSong(song);
  };

  const handleFavorite = async () => {
    if (!song || isFavoritePending) return;

    const wasFavorited = Boolean(song.is_favorite);
    const previousCount = song.favorite_count ?? 0;
    setIsFavoritePending(true);
    setEngagementStatus('');
    setSong((current) => current ? {
      ...current,
      is_favorite: !wasFavorited,
      favorite_count: Math.max(0, previousCount + (wasFavorited ? -1 : 1)),
    } : current);

    try {
      const result = await toggleSongFavorite(song.id, getVisitorId());
      setSong((current) => current ? {
        ...current,
        is_favorite: result.favorited,
        favorite_count: result.favorites,
      } : current);
    } catch {
      setSong((current) => current ? {
        ...current,
        is_favorite: wasFavorited,
        favorite_count: previousCount,
      } : current);
      setEngagementStatus('Chưa thể cập nhật lượt yêu thích. Vui lòng thử lại.');
    } finally {
      setIsFavoritePending(false);
    }
  };

  const handleShare = async (source: 'facebook' | 'copy_link') => {
    if (!song || isSharePending) return;

    const url = new URL(window.location.pathname, window.location.origin).toString();
    if (source === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        setEngagementStatus('Không thể sao chép đường dẫn trên trình duyệt này.');
        return;
      }
    }

    setIsShareOpen(false);
    setIsSharePending(true);
    setEngagementStatus('');
    try {
      const result = await recordSongShare(song.id, source, getVisitorId());
      setSong((current) => current ? { ...current, share_count: result.shares } : current);
      setEngagementStatus(source === 'copy_link' ? 'Đã sao chép đường dẫn.' : 'Đã mở cửa sổ chia sẻ Facebook.');
    } catch {
      setEngagementStatus('Đã chia sẻ nhưng chưa ghi nhận được lượt chia sẻ.');
    } finally {
      setIsSharePending(false);
    }
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
              <h1 className="mt-3 text-[34px] leading-tight sm:text-[42px]">{song.title}</h1>
              <ArtistNames artists={artists} className="mt-4 block text-sm font-bold text-white" />
              <div className="mt-7 flex items-start gap-4 text-white">
                <button type="button" aria-label={song.is_favorite ? `Bỏ yêu thích ${song.title}` : `Yêu thích ${song.title}`} aria-pressed={Boolean(song.is_favorite)} disabled={isFavoritePending} onClick={() => void handleFavorite()} className="flex min-w-8 flex-col items-center gap-1 text-white outline-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <span className={song.is_favorite ? 'text-[#ff3b66]' : 'text-white'}><HeartIcon /></span>
                  <span className="text-[11px] font-bold text-white">{formatCount(song.favorite_count)}</span>
                </button>
                <div className="relative">
                  <button type="button" aria-label={`Chia sẻ ${song.title}`} aria-expanded={isShareOpen} disabled={isSharePending} onClick={() => setIsShareOpen((current) => !current)} className="flex min-w-8 flex-col items-center gap-1 text-white outline-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-cyan-300">
                    <ShareIcon />
                    <span className="text-[11px] font-bold text-white">{formatCount(song.share_count)}</span>
                  </button>
                  {isShareOpen ? <div role="menu" aria-label="Chia sẻ bài hát" className="absolute left-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl border border-white/[0.06] bg-[#292c2b] p-1.5 text-[13px] font-bold text-white shadow-2xl">
                    <button type="button" role="menuitem" onClick={() => void handleShare('facebook')} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/[0.09]">Facebook</button>
                    <button type="button" role="menuitem" onClick={() => void handleShare('copy_link')} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/[0.09]">Sao chép đường dẫn</button>
                  </div> : null}
                </div>
                <button type="button" aria-label="Thêm tùy chọn" className="grid size-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"><MoreIcon /></button>
              </div>
              <p role="status" aria-live="polite" className="sr-only">{engagementStatus}</p>
              <div className="mt-6 flex flex-wrap gap-4">
                <button type="button" onClick={handlePlay} className="inline-flex h-11 items-center gap-3 rounded-full bg-[#00cfe3] px-8 text-sm font-bold text-[#07363a] transition-colors hover:bg-[#34dbea]">{currentTrack && isPlaying ? <PauseIcon /> : <PlayGlyph className="ml-0.5 size-4" />}{currentTrack && isPlaying ? 'Tạm dừng' : 'Phát'}</button>
                <a href={currentTrack && track?.downloadUrl ? track.downloadUrl : getSongDownloadUrl(song, currentTrack ? track?.selectedQualityId : null)} onClick={(event) => {
                  const selectedQuality = currentTrack
                    ? track?.audioQualities?.find((quality) => quality.quality_id === track.selectedQualityId)
                    : undefined;
                  if ((song.premium_only || selectedQuality?.premium_only) && !isPremium) {
                    event.preventDefault();
                    requestVipAccess();
                  }
                }} download className="inline-flex h-11 items-center gap-3 rounded-full bg-white/15 px-8 text-sm font-bold transition-colors hover:bg-white/25"><DownloadIcon />Tải về</a>
              </div>
            </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <section id="lyrics" aria-labelledby="lyrics-heading" className="scroll-mt-24">
            <h2 id="lyrics-heading" className="text-[26px] font-bold">Lời bài hát</h2>
            <div className="mt-4 rounded-xl bg-[#242424] p-5 sm:p-6">
              <p className="border-b border-white/10 pb-4 text-xs text-white/55">Đăng bởi <span className="font-bold text-white">{song.publisher || 'Melodify'}</span></p>
              <div className="pt-5"><LyricBlock lyrics={song.lyrics || []} elapsed={currentTrack ? elapsed : 0} isActiveTrack={currentTrack} onSeek={handleLyricSeek} /></div>
            </div>
          </section>
          <ArtistPanel artists={artists} />
        </div>
      </section>

      {artists[0] ? <section className="mx-auto w-full max-w-[1582px] px-5 pt-5 sm:px-8 lg:px-10"><h2 className="text-[25px] font-bold">Bài hát nổi bật của <ArtistLink artist={artists[0]} className="text-cyan-300 hover:text-cyan-200">{artists[0].name}</ArtistLink></h2><p className="mt-5 text-sm text-white/55">{formatCount(song.views)} lượt nghe</p></section> : null}

      {artists[0] && featuredAlbums.length > 0 ? <section className="mx-auto w-full max-w-[1582px] px-5 pb-12 pt-10 sm:px-8 lg:px-10">
        <h2 className="text-[25px] font-bold">Album nổi bật của <ArtistLink artist={artists[0]} className="text-cyan-300 transition-colors hover:text-cyan-200">{artists[0].name}</ArtistLink></h2>
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
