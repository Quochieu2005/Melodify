import { Lexend } from 'next/font/google';

import styles from './MusicDiscoverySections.module.css';

const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: ['500', '600', '700'] });

type Playlist = {
  title: string;
  artists: string;
  image: string;
};

type PlaylistSectionProps = {
  id: string;
  title: string;
  playlists: Playlist[];
};

const top100: Playlist[] = [
  { title: 'Top 100 Nhạc Hoa Hay Nhất', artists: 'Bố Lỗ Tích BlueC, Mã Dã (Crabbit), LBI', image: 'https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?auto=format&fit=crop&w=700&q=85' },
  { title: 'Top 100 Nhạc Trữ Tình Hay Nhất', artists: 'Lệ Quyên, Đan Trường, Quang Lê, Mạnh Quỳnh', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=700&q=85' },
  { title: 'Top 100 Nhạc Hàn Hay Nhất', artists: 'BIGBANG, JENNIE, BTS', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=85' },
  { title: 'Top 100 Rap Việt Hay Nhất', artists: 'Đen, Rhymastic, Binz, Suboi', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=700&q=85' },
  { title: 'Top 100 Pop USUK Hay Nhất', artists: 'Dua Lipa, Ariana Grande, Bruno Mars', image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=700&q=85' },
];

const moods: Playlist[] = [
  { title: 'Lofi Chill Cho Ngày Mưa', artists: 'Kiều Chi, Meme Media, Quốc Thiên', image: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=700&q=85' },
  { title: 'Từ Tiktok qua đây...', artists: 'TINH HÀ “SAY HÍ”, Quang Hùng MasterD', image: 'https://images.unsplash.com/photo-1455885666463-9a8b6fdd7c67?auto=format&fit=crop&w=700&q=85' },
  { title: 'Hồi Ức 8x 9x', artists: 'Wanbi Tuấn Anh, Cẩm Ly, Mỹ Tâm', image: 'https://images.unsplash.com/photo-1461360228754-6e81c478b882?auto=format&fit=crop&w=700&q=85' },
  { title: 'Thật ther Thật chill', artists: 'TINH HÀ “SAY HÍ”, Wren Evans, Ali Hoàng Dương', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=85' },
  { title: 'Chẳng muốn làm gì, chỉ muốn Chill', artists: 'Đan Trường, Donal, Smiley Panda', image: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?auto=format&fit=crop&w=700&q=85' },
];

const vietnameseUniverse: Playlist[] = [
  { title: 'Hit Việt Quốc Dân', artists: 'Hngle, Bảo Anh, TINH HÀ “SAY HÍ”', image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=700&q=85' },
  { title: 'V-Pop Thịnh Hành', artists: 'Jack - J97, TINH HÀ “SAY HÍ”, Quang Hùng', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=85' },
  { title: 'V-Pop Live Stage', artists: 'TINH HÀ “SAY HÍ”, Dương Domic, CONGB', image: 'https://images.unsplash.com/photo-1524650359799-842906ca1c06?auto=format&fit=crop&w=700&q=85' },
  { title: 'Gen Gì Gen Z', artists: 'TINH HÀ “SAY HÍ”, Wren Evans, Itsnk', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=85' },
  { title: 'Bản Sắc Việt', artists: 'TINH HÀ “SAY HÍ”, buitruonglinh, Hoàng Dũng', image: 'https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?auto=format&fit=crop&w=700&q=85' },
];

const artists = [
  { name: 'TINH HÀ “SAY HÍ”', followers: '9362 người theo dõi', song: 'YÊU', songArtists: 'TINH HÀ “SAY HÍ”, Wren Evans,...', image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85' },
  { name: 'CONGB', followers: '7576 người theo dõi', song: 'chờ chút...', songArtists: 'TINH HÀ “SAY HÍ”, CONGB', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85' },
  { name: 'buitruonglinh', followers: '45668 người theo dõi', song: 'MRT (feat. Xuân Định K.Y, ...', songArtists: 'TINH HÀ “SAY HÍ”, ...', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85' },
  { name: 'Hngle', followers: '8076 người theo dõi', song: 'Tìm Em', songArtists: 'Hngle, Bảo Anh', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=900&q=85' },
];

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current">
      <path d="M8 5.2v13.6a1.2 1.2 0 0 0 1.84 1.02l9.93-6.8a1.24 1.24 0 0 0 0-2.04L9.84 4.18A1.2 1.2 0 0 0 8 5.2Z" />
    </svg>
  );
}

function AudioBadge() {
  return (
    <span aria-hidden="true" className="absolute right-3 top-3 z-10 grid size-6 place-items-center rounded-full bg-black/35 text-[11px] text-white/80 backdrop-blur-sm">
      ◖▮◗
    </span>
  );
}

function SectionHeader({ id, title }: { id: string; title: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 id={id} className={`${lexend.className} text-[24px] font-bold leading-tight text-white sm:text-[28px]`}>{title}</h2>
      <button type="button" className="shrink-0 text-[14px] font-medium text-[#bdbdbd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">Thêm</button>
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <article className={`${styles.playlistCard} group`}>
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-[#18211f]">
        <div
          aria-hidden="true"
          className={`${styles.coverImage} h-full w-full bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.045]`}
          style={{ backgroundImage: `url(${playlist.image})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <AudioBadge />
        <button type="button" aria-label={`Phát ${playlist.title}`} className="absolute bottom-3 right-3 grid size-12 translate-y-2 place-items-center rounded-full bg-[#00d3e5] text-[#13201e] opacity-0 shadow-lg shadow-black/30 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <PlayIcon />
        </button>
      </div>
      <h3 className="mt-3 truncate text-[15px] font-bold leading-5 text-white">{playlist.title}</h3>
      <p className="mt-1 truncate text-[13px] leading-5 text-[#c2c5c4]">{playlist.artists}</p>
    </article>
  );
}

function PlaylistSection({ id, title, playlists }: PlaylistSectionProps) {
  return (
    <section aria-labelledby={id} className={`${styles.section} mt-12`}>
      <SectionHeader id={id} title={title} />
      <div className={styles.playlistTrack}>
        {playlists.map((playlist) => <PlaylistCard key={playlist.title} playlist={playlist} />)}
      </div>
    </section>
  );
}

function TrendingArtistsSection() {
  return (
    <section aria-labelledby="trending-artists-heading" className={`${styles.section} mt-14`}>
      <SectionHeader id="trending-artists-heading" title="Nghệ Sĩ Thịnh Hành" />
      <div className={styles.artistTrack}>
        {artists.map((artist) => (
          <article key={artist.name} className={`${styles.artistCard} overflow-hidden rounded-[8px] bg-[#292b2b]`}>
            <div className="group relative aspect-[1.18/1] overflow-hidden bg-[#18211f]">
              <div
                aria-hidden="true"
                className={`${styles.coverImage} h-full w-full bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.04]`}
                style={{ backgroundImage: `url(${artist.image})` }}
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#292b2b] via-transparent to-transparent" />
              <div className="absolute inset-x-5 bottom-4">
                <h3 className="truncate text-[16px] font-bold text-white">{artist.name}</h3>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="truncate text-[13px] text-[#c2c5c4]">{artist.followers}</p>
                  <button type="button" className="h-8 shrink-0 rounded-full border border-white/30 px-5 text-[13px] font-semibold text-white transition-colors hover:border-[#00d3e5] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">Theo dõi</button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="size-14 shrink-0 overflow-hidden rounded-[4px] bg-black/20">
                <div aria-hidden="true" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${artist.image})` }} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-white">{artist.song}</p>
                <p className="mt-1 truncate text-[12px] text-[#aeb1b0]">{artist.songArtists}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function MusicDiscoverySections() {
  return (
    <>
      <PlaylistSection id="top-100-heading" title="Top 100" playlists={top100} />
      <PlaylistSection id="mood-heading" title="Tâm Trạng Hôm Nay" playlists={moods} />
      <PlaylistSection id="vietnamese-universe-heading" title="Vũ Trụ Nhạc Việt" playlists={vietnameseUniverse} />
      <TrendingArtistsSection />
    </>
  );
}
