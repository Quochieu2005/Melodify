"use client";
import { Lexend } from "next/font/google";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArtistLink, ArtistNames } from "@/components/artists";
import { PlayGlyph } from "@/components/icons/PlayGlyph";
import { usePlayer } from "@/components/player";
import { getChart, type ChartRecord, type ChartSong } from "@/lib/api";
import {
  recentSongItem,
  recordRecentItem,
  songPath,
} from "@/lib/recent-history";
import styles from "@/components/albums/AlbumDetailPage.module.css";
const lexend = Lexend({ subsets: ["latin", "vietnamese"], weight: "700" });
function PauseIcon() {
  return (
    <span aria-hidden="true" className="flex gap-1">
      <span className="h-4 w-1.5 rounded-sm bg-current" />
      <span className="h-4 w-1.5 rounded-sm bg-current" />
    </span>
  );
}
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 fill-none stroke-current stroke-[1.8]"
    >
      <path
        d="m5 12 14-8-4 16-4-6-6-2Zm6 2 8-10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 fill-none stroke-current stroke-[1.8]"
    >
      <path
        d="M12 3v11m0 0 4-4m-4 4-4-4M4 20h16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function MoreHorizontalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "--:--";
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
function ChartSongRow({
  song,
  onPlay,
  onShare,
  isCurrent,
  isPlaying,
}: {
  song: ChartSong;
  onPlay: () => void;
  onShare: () => void;
  isCurrent: boolean;
  isPlaying: boolean;
}) {
  const artists = song.artists?.length
    ? song.artists
    : song.artist
      ? [song.artist]
      : [];
  return (
    <li
      className={`${styles.songRow} group grid grid-cols-[32px_minmax(0,1fr)_56px_28px] items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.08] focus-within:bg-white/[0.08] sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4`}
    >
      {" "}
      <div className="flex flex-col items-center justify-center gap-1 text-center text-sm text-white/70">
        <span className="font-bold text-white">{song.rank}</span>
        <span
          className={
            song.trend === "up"
              ? "text-[10px] text-cyan-300"
              : song.trend === "down"
                ? "text-[10px] text-rose-400"
                : "text-xs text-white/45"
          }
        >
          {song.trend === "up" ? "▲" : song.trend === "down" ? "▼" : "−"}
        </span>
      </div>{" "}
      <div className="flex min-w-0 items-center gap-3">
        {" "}
        <div
          className="group/cover relative size-11 shrink-0 overflow-hidden rounded-[4px] bg-black/20 bg-cover bg-center"
          style={{
            backgroundImage: `url("${song.cover_url || "/topics/genre/vpop_600.png"}")`,
          }}
        >
          {" "}
          <button
            type="button"
            onClick={onPlay}
            aria-label={
              isCurrent && isPlaying
                ? `Tạm dừng ${song.title}`
                : `Phát ${song.title}`
            }
            className={`absolute inset-0 grid place-items-center bg-black/45 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isCurrent ? "opacity-100" : "opacity-0 group-hover/cover:opacity-100 group-focus-within/cover:opacity-100"}`}
          >
            {isCurrent && isPlaying ? <PauseIcon /> : <PlayGlyph className="ml-0.5 size-4" />}
          </button>{" "}
        </div>{" "}
        <Link
          href={songPath(song)}
          onClick={() => recordRecentItem(recentSongItem(song))}
          className={`min-w-0 truncate text-sm font-bold transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isCurrent ? "text-cyan-300" : "text-white"}`}
        >
          {song.title}
        </Link>{" "}
      </div>{" "}
      <span className="hidden truncate text-sm text-white/70 sm:block">
        <ArtistNames artists={artists} />
      </span>{" "}
      <span className="text-right text-sm text-white/75">
        {formatDuration(song.duration_seconds)}
      </span>{" "}
      <button
        type="button"
        onClick={onShare}
        aria-label={`Chia sẻ ${song.title}`}
        className={`${styles.rowMore} grid size-7 place-items-center rounded-full text-white/75 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300`}
      >
        <MoreHorizontalIcon />
      </button>{" "}
    </li>
  );
}
export default function ChartDetailPage({ slug }: { slug: string }) {
  const { track, isPlaying, playSong, togglePlay } = usePlayer();
  const [request, setRequest] = useState<{
    slug: string;
    chart: ChartRecord | null;
    loading: boolean;
    error: string;
  }>({ slug: "", chart: null, loading: true, error: "" });
  const [shareStatus, setShareStatus] = useState("");
  useEffect(() => {
    let cancelled = false;
    getChart(slug)
      .then((response) => {
        if (!cancelled)
          setRequest({ slug, chart: response.data, loading: false, error: "" });
      })
      .catch(() => {
        if (!cancelled)
          setRequest({
            slug,
            chart: null,
            loading: false,
            error: "Không thể tải bảng xếp hạng lúc này.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);
  const chart = request.slug === slug ? request.chart : null;
  const songs = useMemo(() => chart?.songs ?? [], [chart]);
  const collaborators = useMemo(() => {
    const artists = new Map<
      string,
      NonNullable<ChartSong["artists"]>[number]
    >();
    songs.forEach((song) => {
      (song.artists?.length
        ? song.artists
        : song.artist
          ? [song.artist]
          : []
      ).forEach((artist) => {
        const key = artist.id || artist.name;
        if (!artists.has(key)) artists.set(key, artist);
      });
    });
    return Array.from(artists.values());
  }, [songs]);
  const chartHasCurrentTrack = Boolean(
    track && songs.some((song) => song.id === track.id),
  );
  const chartIsPlaying = Boolean(track && isPlaying && chartHasCurrentTrack);
  if (request.loading || !chart) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 pb-24 pt-8 text-white sm:px-8 lg:px-10">
        {request.error ? (
          <p
            role="alert"
            className="rounded-xl bg-white/10 px-4 py-5 text-sm text-white/70"
          >
            {request.error}
          </p>
        ) : (
          <div className="h-[320px] animate-pulse rounded-2xl bg-white/10" />
        )}
      </main>
    );
  }
  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (chartHasCurrentTrack) {
      togglePlay();
      return;
    }
    playSong(songs[0], songs);
  };
  const handlePlaySong = (song: ChartSong) => {
    if (track?.id === song.id) {
      togglePlay();
      return;
    }
    playSong(song, songs);
  };
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: chart.title, url });
      else await navigator.clipboard.writeText(url);
      setShareStatus("Đã sao chép liên kết chart.");
    } catch {
      setShareStatus("");
    }
  };
  const handleDownload = () => {
    const content = `${chart.title}\n\n${songs.map((song) => `${song.rank}. ${song.title} — ${song.artists?.map((artist) => artist.name).join(", ") || song.artist?.name || "Nghệ sĩ chưa cập nhật"}`).join("\n")}`;
    const href = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${chart.slug}.txt`;
    anchor.click();
    URL.revokeObjectURL(href);
  };
  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-24 pt-8 text-white sm:px-8 lg:px-10">
      {" "}
      <div className="mx-auto w-full max-w-[1582px]">
        {" "}
        <section className="mt-6 grid gap-7 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-stretch">
          {" "}
          <div
            role="img"
            aria-label={`Ảnh bìa ${chart.title}`}
            className="aspect-square w-full max-w-[260px] rounded-[10px] bg-cover bg-center shadow-2xl shadow-black/25"
            style={{
              backgroundImage: `url("${chart.cover_url || "/topics/genre/vpop_600.png"}")`,
            }}
          />{" "}
          <div className="flex min-w-0 flex-col lg:min-h-[260px]">
            {" "}
            <p className="text-[13px] text-white/55">
              Chart&nbsp; · &nbsp;{chart.song_count || songs.length} bài hát
            </p>{" "}
            <h1
              className={`${lexend.className} mt-4 max-w-4xl text-3xl font-bold leading-tight sm:text-5xl`}
            >
              {chart.title}
            </h1>{" "}
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-7">
              {" "}
              <button
                type="button"
                onClick={() => void handleShare()}
                className="grid size-10 place-items-center rounded-full bg-[#303c39] text-white transition-colors hover:bg-[#40504b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <ShareIcon />
              </button>{" "}
              <button
                type="button"
                onClick={handlePlayAll}
                disabled={songs.length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#00cfe3] px-7 text-sm font-bold text-[#07363a] transition-colors hover:bg-[#34dbea] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {chartIsPlaying ? <PauseIcon /> : <PlayGlyph className="ml-0.5 size-4" />}
                {chartIsPlaying ? "Tạm dừng" : "Phát"}
              </button>{" "}
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#3c4140] px-7 text-sm font-bold text-white transition-colors hover:bg-[#4a504e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <DownloadIcon />
                Tải về
              </button>{" "}
            </div>{" "}
            <span className="sr-only" aria-live="polite">
              {shareStatus}
            </span>{" "}
          </div>{" "}
        </section>{" "}
        <section className="mt-12" aria-labelledby="chart-songs-heading">
          {" "}
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            {" "}
            <div>
              <h2
                id="chart-songs-heading"
                className={`${lexend.className} text-2xl font-bold`}
              >
                Bảng xếp hạng
              </h2>
            </div>{" "}
          </div>{" "}
          <div className="grid grid-cols-[32px_minmax(0,1fr)_56px_28px] gap-3 border-b border-white/10 px-2 pb-3 text-[13px] font-bold text-white/60 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4">
            <span>#</span>
            <span>Tiêu đề</span>
            <span className="hidden sm:block">Nghệ sĩ</span>
            <span className="grid size-5 place-items-center justify-self-end text-[18px] leading-none">
              ◷
            </span>
            <span aria-hidden="true" />
          </div>{" "}
          {songs.length > 0 ? (
            <ol className="mt-2 space-y-0.5">
              {songs.map((song) => (
                <ChartSongRow
                  key={song.id}
                  song={song}
                  onPlay={() => handlePlaySong(song)}
                  onShare={() => void handleShare()}
                  isCurrent={track?.id === song.id}
                  isPlaying={isPlaying && track?.id === song.id}
                />
              ))}
            </ol>
          ) : (
            <p className="mt-5 rounded-lg bg-white/10 px-4 py-5 text-sm text-white/70">
              Chart chưa có bài hát.
            </p>
          )}{" "}
        </section>{" "}
        {collaborators.length > 0 ? (
          <section
            aria-labelledby="chart-collaborators-heading"
            className="mt-14"
          >
            <h2
              id="chart-collaborators-heading"
              className={`${lexend.className} text-[24px] font-bold text-white`}
            >
              Kết hợp từ các nghệ sĩ
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-7">
              {collaborators.map((artist) => (
                <article
                  key={artist.id || artist.name}
                  className="min-w-0 text-center"
                >
                  <ArtistLink artist={artist} className="block">
                    <div
                      role="img"
                      aria-label={`Ảnh đại diện ${artist.name}`}
                      className="mx-auto grid aspect-square w-full max-w-[180px] place-items-center overflow-hidden rounded-full bg-[#565657] text-3xl font-bold text-white/75"
                      style={
                        artist.avatar_url
                          ? {
                              backgroundImage: `url("${artist.avatar_url}")`,
                              backgroundPosition: "center 20%",
                              backgroundSize: "cover",
                            }
                          : undefined
                      }
                    >
                      {!artist.avatar_url
                        ? artist.name.trim().charAt(0).toUpperCase()
                        : null}
                    </div>
                    <h3 className="mt-3 truncate text-[14px] font-bold text-white">
                      {artist.name}
                    </h3>
                  </ArtistLink>
                  <button
                    type="button"
                    className="mt-2 rounded-full border border-white/35 px-4 py-1.5 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"
                  >
                    Theo dõi
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>{" "}
    </main>
  );
}
