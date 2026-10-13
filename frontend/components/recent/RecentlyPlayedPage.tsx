'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import styles from '@/components/albums/AlbumDetailPage.module.css';
import { ArtistNames } from '@/components/artists';
import { getSong } from '@/lib/api';
import { usePlayer } from '@/components/player';
import {
  readRecentItems,
  recordRecentItem,
  subscribeRecentHistory,
  type RecentCategory,
  type RecentItem,
} from '@/lib/recent-history';

const tabs: Array<{ label: string; value: RecentCategory }> = [
  { label: 'Bài hát', value: 'song' },
  { label: 'Playlist', value: 'playlist' },
  { label: 'Album', value: 'album' },
  { label: 'Nghệ sĩ', value: 'artist' },
  { label: 'Radios', value: 'radio' },
  { label: 'Video', value: 'video' },
];

const fallbackCover = '/topics/genre/vpop_600.png';

function PlayIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current"><path d="m8 5.5 10 6.5-10 6.5v-13Z" /></svg>;
}

function PauseIcon() {
  return <span aria-hidden="true" className="flex gap-1"><span className="h-4 w-1.5 rounded-sm bg-current" /><span className="h-4 w-1.5 rounded-sm bg-current" /></span>;
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-2"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5l3 1.5" strokeLinecap="round" /></svg>;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '--:--';
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function displayCount(count: number) {
  return new Intl.NumberFormat('vi-VN').format(count);
}

function MoreHorizontalIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>;
}

function SelectionCheckbox({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="grid size-6 shrink-0 cursor-pointer place-items-center">
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} className="peer sr-only" />
      <span className="grid size-5 place-items-center rounded-[4px] border border-white/45 text-[13px] font-bold text-transparent transition-colors peer-checked:border-white peer-checked:bg-white peer-checked:text-[#202020]">✓</span>
    </label>
  );
}

function imageStyle(item: RecentItem) {
  return { backgroundImage: `url("${item.imageUrl || fallbackCover}")` };
}

function remember(item: RecentItem) {
  const rest = Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'updatedAt')) as Omit<RecentItem, 'updatedAt'>;
  recordRecentItem(rest);
}

function EntityGrid({ items }: { items: RecentItem[] }) {
  return items.length > 0 ? (
    <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <Link key={`${item.category}-${item.id}`} href={item.href} onClick={() => remember(item)} className="group min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <div role="img" aria-label={item.title} className="aspect-square overflow-hidden rounded-xl bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]" style={imageStyle(item)} />
          <h2 className="mt-3 truncate text-base font-bold text-white transition-colors group-hover:text-cyan-300">{item.title}</h2>
          <p className="mt-1 truncate text-sm text-white/55">{item.subtitle}</p>
        </Link>
      ))}
    </div>
  ) : <EmptyState />;
}

function EmptyState() {
  return <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-12 text-center text-sm text-white/55">Chưa có nội dung nào trong mục này.</div>;
}

function SongTable({ items, selectedIds, onToggle, onPlay, currentTrackId, isPlaying, isLoading }: {
  items: RecentItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onPlay: (item: RecentItem) => void;
  currentTrackId?: string;
  isPlaying: boolean;
  isLoading: boolean;
}) {
  if (items.length === 0) return <EmptyState />;

  return (
    <div className="mt-7 min-w-[720px]">
      <div className="grid grid-cols-[32px_minmax(0,1fr)_56px_28px] gap-3 border-b border-white/10 px-2 pb-3 text-[13px] font-bold text-white/60 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4">
        <span>#</span><span>Tiêu đề</span><span className="hidden sm:block">Nghệ sĩ</span><span className="grid size-5 place-items-center justify-self-end text-[18px] leading-none"><ClockIcon /></span><span aria-hidden="true" />
      </div>
      {items.map((item, index) => (
        <RecentSongRow
          key={`${item.category}-${item.id}`}
          item={item}
          index={index}
          checked={selectedIds.includes(item.id)}
          onToggle={() => onToggle(item.id)}
          onPlay={() => onPlay(item)}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}

function RecentSongRow({ item, index, checked, onToggle, onPlay, currentTrackId, isPlaying, isLoading }: {
  item: RecentItem;
  index: number;
  checked: boolean;
  onToggle: () => void;
  onPlay: () => void;
  currentTrackId?: string;
  isPlaying: boolean;
  isLoading: boolean;
}) {
  const isCurrentTrack = currentTrackId === item.id;
  const checkboxVisibility = checked
    ? 'opacity-100'
    : isCurrentTrack
      ? 'pointer-events-none opacity-0'
      : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100';
  const indexVisibility = checked ? 'hidden' : 'group-hover:hidden';
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className={`${styles.songRow} group grid grid-cols-[32px_minmax(0,1fr)_56px_28px] items-center gap-3 rounded-lg px-2 py-2.5 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4`}>
      <div className="relative grid size-6 place-items-center">
        <span className={`text-[13px] text-white/70 ${indexVisibility}`}>{index + 1}</span>
        <div className={`absolute inset-0 grid place-items-center ${checkboxVisibility}`}>
          <SelectionCheckbox checked={checked} label={`Chọn bài ${item.title}`} onChange={onToggle} />
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div className="group/cover relative size-11 shrink-0 overflow-hidden rounded-[4px]">
          <div role="img" aria-label={item.title} className="size-full bg-cover bg-center" style={imageStyle(item)} />
          <button type="button" aria-label={isCurrentTrack && isPlaying ? `Tạm dừng ${item.title}` : `Phát ${item.title}`} onClick={onPlay} disabled={isLoading} className={`absolute inset-0 grid place-items-center bg-black/45 text-white disabled:cursor-wait ${isCurrentTrack ? 'opacity-100' : 'opacity-0 group-hover/cover:opacity-100 group-focus-within/cover:opacity-100'}`}>
            {isCurrentTrack && isPlaying ? <span className={`${styles.equalizer} ${styles.equalizerOnCover}`}><span className={styles.equalizerBar} /><span className={styles.equalizerBar} /><span className={styles.equalizerBar} /></span> : <PlayIcon />}
          </button>
        </div>
        <Link href={item.href} onClick={() => remember(item)} className={`truncate text-[14px] font-bold transition-colors hover:text-[#00d3e5] ${isCurrentTrack ? 'text-[#00d3e5]' : 'text-white'}`}>{item.title}</Link>
      </div>
      <ArtistNames artists={item.artists || []} fallback={item.subtitle} className="hidden truncate text-[13px] text-white/65 sm:block" />
      <span className="text-right text-[13px] text-white/75">{formatDuration(item.durationSeconds)}</span>
      <div className="relative flex justify-end">
        <button type="button" aria-label={`Tùy chọn bài ${item.title}`} aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((value) => !value)} className={`${styles.rowMore} grid size-7 place-items-center rounded-full text-white/75 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#00d3e5]`}><MoreHorizontalIcon /></button>
        {isMenuOpen ? <div role="menu" className="absolute right-0 top-8 z-20 w-36 overflow-hidden rounded-lg bg-[#2b2b2b] p-1.5 text-[12px] font-bold text-white shadow-xl"><button type="button" role="menuitem" onClick={() => { setIsMenuOpen(false); onPlay(); }} className="flex w-full rounded-md px-2.5 py-2 text-left hover:bg-white/10">Phát bài hát</button><Link href={item.href} role="menuitem" onClick={() => { setIsMenuOpen(false); remember(item); }} className="flex w-full rounded-md px-2.5 py-2 hover:bg-white/10">Mở bài hát</Link></div> : null}
      </div>
    </div>
  );
}

export default function RecentlyPlayedPage() {
  const { playSong, track, isPlaying, togglePlay } = usePlayer();
  const [activeTab, setActiveTab] = useState<RecentCategory>('song');
  const [items, setItems] = useState<RecentItem[]>([]);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

  useEffect(() => {
    const refresh = () => setItems(readRecentItems());
    refresh();
    return subscribeRecentHistory(refresh);
  }, []);

  const visibleItems = useMemo(() => items.filter((item) => item.category === activeTab), [activeTab, items]);
  const songItems = useMemo(() => items.filter((item) => item.category === 'song'), [items]);
  const currentSong = songItems[0];

  const playRecentSong = async (item: RecentItem) => {
    if (track?.id === item.id) {
      togglePlay();
      return;
    }

    setIsLoadingSong(true);
    try {
      const response = await getSong(item.id);
      playSong(response.data);
    } catch {
      // The history link remains available even when an old song is no longer in the catalog.
    } finally {
      setIsLoadingSong(false);
    }
  };

  const toggleSongSelection = (id: string) => {
    setSelectedSongIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  };

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-auto bg-[#202a28] px-4 pb-12 pt-6 text-white sm:px-8 lg:px-8">
      <div className="mx-auto min-w-[760px] max-w-[1582px]">
        <h1 className="text-[34px] font-extrabold tracking-[-0.04em]">Recently played</h1>
        <div role="tablist" aria-label="Các mục nghe gần đây" className="mt-7 flex gap-9 border-b border-white/10">
          {tabs.map((tab) => (
            <button key={tab.value} type="button" role="tab" aria-selected={activeTab === tab.value} onClick={() => setActiveTab(tab.value)} className={['relative pb-3 text-base font-semibold outline-none transition-colors focus-visible:text-cyan-300', activeTab === tab.value ? 'text-white' : 'text-white/50 hover:text-white'].join(' ')}>
              {tab.label}
              {activeTab === tab.value ? <span className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-cyan-400" /> : null}
            </button>
          ))}
        </div>

        {activeTab === 'song' ? (
          <section className="mt-8">
            <div className="flex items-center gap-4">
              <button type="button" aria-label="Phát bài hát đã phát" onClick={() => { if (currentSong) void playRecentSong(currentSong); }} disabled={!currentSong || isLoadingSong} className="grid size-12 place-items-center rounded-full bg-cyan-400 text-[#07363a] outline-none hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white">
                {track?.id === currentSong?.id && isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <h2 className="text-[29px] font-extrabold tracking-[-0.03em]">Bài hát đã phát <span className="text-sm font-medium text-white/70">({displayCount(visibleItems.length)})</span></h2>
            </div>
            <SongTable items={visibleItems} selectedIds={selectedSongIds} onToggle={toggleSongSelection} onPlay={(item) => void playRecentSong(item)} currentTrackId={track?.id} isPlaying={isPlaying} isLoading={isLoadingSong} />
          </section>
        ) : activeTab === 'radio' ? (
          <EmptyState />
        ) : (
          <EntityGrid items={visibleItems} />
        )}
      </div>
    </main>
  );
}
