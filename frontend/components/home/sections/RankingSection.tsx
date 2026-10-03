import { Lexend } from 'next/font/google';

import styles from './RankingSection.module.css';

const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: '700' });

type RankingSong = {
  title: string;
  artist: string;
  publisher: string;
  image: string;
  trend?: 'up' | 'down';
};

type RankingBoard = {
  title: string;
  background: string;
  songs: RankingSong[];
};

const rankingBoards: RankingBoard[] = [
  {
    title: 'Top 50 Bài Hát Thịnh Hành',
    background: 'linear-gradient(rgba(205, 104, 104, 0.3) 0%, rgba(205, 104, 104, 0.06) 100%)',
    songs: [
      { title: 'LAVITEM', artist: 'TINH HÀ "SAY HÍ",...', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=240&q=85' },
      { title: 'SECRET (feat. Quang Hùng...)', artist: 'TINH HÀ "SAY HÍ",...', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=240&q=85' },
      { title: 'chờ chút...', artist: 'TINH HÀ "SAY HÍ", CONGB', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=240&q=85' },
      { title: 'THIÊU HOA DỆT GẤM', artist: 'TINH HÀ "SAY HÍ", buitrUonglinh,...', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=240&q=85' },
      { title: 'SAU HÌNH BÓNG ẤY', artist: 'TINH HÀ "SAY HÍ", Dương Domic,...', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=240&q=85' },
    ],
  },
  {
    title: 'Top 50 Nhạc Việt',
    background: 'linear-gradient(rgba(225, 228, 59, 0.3) 0%, rgba(225, 228, 59, 0.06) 100%)',
    songs: [
      { title: 'LAVITEM', artist: 'TINH HÀ "SAY HÍ",...', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=240&q=85' },
      { title: 'Tìm Em', artist: 'Hngle, Bảo Anh', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=240&q=85' },
      { title: 'Lưu Niên', artist: 'Jack - J97', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=85' },
      { title: 'Người Dưng', artist: 'Jack - J97, Ling Yin, YangT', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=85' },
      { title: 'chờ chút...', artist: 'TINH HÀ "SAY HÍ", CONGB', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=240&q=85' },
    ],
  },
  {
    title: 'Top 50 Nhạc Hoa',
    background: 'linear-gradient(rgba(180, 90, 203, 0.3) 0%, rgba(180, 90, 203, 0.06) 100%)',
    songs: [
      { title: 'Dạo Bước Hongkong 1999...', artist: 'Bố Lỗ Tích BlueC', publisher: 'BELIEVE MUSIC', image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=240&q=85' },
      { title: '大风在刮大雪在下 (Bản Họ...', artist: 'Lục Tiểu Lạc', publisher: 'BELIEVE MUSIC', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=240&q=85' },
      { title: '眺楼机', artist: 'LBI', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=240&q=85', trend: 'up' },
      { title: 'Buông Bỏ Sự Phụ Thuộc ...', artist: 'Thất Nguyên', publisher: 'BELIEVE MUSIC', image: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=240&q=85', trend: 'down' },
      { title: '昨夜风今宵月', artist: 'Trang Kỳ Văn 29 (Zhuang Qi Wen 29)', publisher: 'BELIEVE MUSIC', image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=240&q=85' },
    ],
  },
];

const extraRankingBoards: RankingBoard[] = [
  {
    title: 'Top 50 Youtube',
    background: 'linear-gradient(rgba(205, 84, 84, 0.3) 0%, rgba(205, 84, 84, 0.06) 100%)',
    songs: [
      rankingBoards[0].songs[4],
      rankingBoards[1].songs[2],
      rankingBoards[0].songs[3],
      rankingBoards[0].songs[2],
      rankingBoards[1].songs[3],
    ],
  },
  {
    title: 'Top 50 Nhạc Remix',
    background: 'linear-gradient(rgba(225, 228, 59, 0.3) 0%, rgba(225, 228, 59, 0.06) 100%)',
    songs: [
      { title: 'Xin Đừng Rời Xa Anh (Remix)', artist: 'Lê Gia Bảo', publisher: 'BELIEVE MUSIC', image: 'https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?w=240' },
      { title: 'Mở Lòng Vì Ai (Thazh x Inso)', artist: 'Inso', publisher: 'The Orchard', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=240' },
      { title: 'Hẹn Hò Nhưng Không Yêu', artist: 'Wendy Thảo', publisher: 'The Orchard', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240' },
      { title: 'Em Thua Cô Ta (ACV Remix)', artist: 'Huyền Trang', publisher: 'BELIEVE MUSIC', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240' },
      { title: 'Hạt Mưa Vương Vấn (Remix)', artist: 'Ness Remix', publisher: 'SONY MUSIC', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=240' },
    ],
  },
];

function PlayIcon({ size = 'size-4' }: { size?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${size} fill-current`}>
      <path d="M8 5.2v13.6a1.2 1.2 0 0 0 1.84 1.02l9.93-6.8a1.24 1.24 0 0 0 0-2.04L9.84 4.18A1.2 1.2 0 0 0 8 5.2Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2">
      <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PublisherMark() {
  return (
    <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center rounded-full bg-black">
      <span className="size-2 rounded-full bg-[#e43f3f]" />
    </span>
  );
}

function RankingBoardCard({ board }: { board: RankingBoard }) {
  return (
    <article className="h-[442px] min-w-0 rounded-[12px] p-5" style={{ background: board.background }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-[16px] font-bold leading-6 text-white" style={{ color: '#ffffff', fontWeight: 700, lineHeight: '24px' }}>{board.title}</h3>
          <ChevronIcon />
        </div>
        <button type="button" className="flex h-[32px] w-[80px] shrink-0 items-center justify-center gap-1 rounded-full bg-white/15 px-0 text-[14px] font-medium text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>
          Phát
          <span className="text-[#00d3e5]" style={{ color: '#00d3e5', fill: '#00d3e5', fontSize: '14px', lineHeight: '22.4px' }}>
            <PlayIcon size="h-[18px] w-[18px]" />
          </span>
        </button>
      </div>

      <ol className="mt-2">
        {board.songs.map((song, index) => {
          return (
            <li key={`${board.title}-${song.title}`} className="group relative grid grid-cols-[24px_54px_minmax(0,1fr)] items-center gap-3 rounded-[14px] px-2 py-1 transition-colors hover:bg-white/10 focus-within:bg-white/10">
              <div className="flex h-[54px] flex-col items-center justify-center gap-1 text-center">
                <span className="text-lg font-bold text-white">{index + 1}</span>
                {song.trend === 'up' && <span className="text-[10px] leading-none text-cyan-300">▲</span>}
                {song.trend === 'down' && <span className="text-[10px] leading-none text-red-400">▼</span>}
                {!song.trend && <span className="text-xs leading-none text-white/50">−</span>}
              </div>

              <div className="relative size-[54px] overflow-hidden rounded-[6px] bg-black/20 bg-cover bg-center" style={{ backgroundImage: `url(${song.image})` }}>
                <button type="button" aria-label={`Phát ${song.title}`} className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20 text-white opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <span className="grid size-9 place-items-center rounded-full bg-white text-[#202a28]"><PlayIcon /></span>
                </button>
              </div>

              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-white" style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>{song.title}</p>
                <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-[12px] text-[#8f8f8f]" style={{ color: '#8f8f8f', fontSize: '12px' }}>
                  <span className="shrink-0 rounded-[3px] bg-black/30 px-1 text-[10px] font-bold text-white/65">Lossless</span>
                  <span className="truncate">{song.artist}</span>
                </p>
                <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] leading-[17.6px] text-[#babdbe]" style={{ color: '#babdbe', fontSize: '11px', lineHeight: '17.6px' }}>
                  <PublisherMark />
                  <span className="truncate">{song.publisher}</span>
                </p>
              </div>

              <button type="button" aria-label={`Tùy chọn ${song.title}`} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold tracking-[3px] text-white opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                ...
              </button>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

export default function RankingSection() {
  return (
    <section aria-labelledby="ranking-heading" className={`mt-12 h-[552px] w-full ${styles.rankingSection}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="ranking-heading" className={`${lexend.className} text-[24px] font-bold leading-none text-white`} style={{ color: '#ffffff', fontFamily: 'Lexend, sans-serif', fontSize: '24px', fontWeight: 700 }}>
          Bảng Xếp Hạng
        </h2>
        <button type="button" className="cursor-pointer text-[14px] font-medium text-[#bdbdbd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202a28]" style={{ color: '#bdbdbd', fontSize: '14px', fontWeight: 500 }}>
          Thêm
        </button>
      </div>

      <div aria-label="Cuộn ngang để xem thêm bảng xếp hạng" role="region" tabIndex={0} className="h-[442px] w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 [&::-webkit-scrollbar]:hidden">
        <div className={styles.boardTrack}>
          {[...rankingBoards, ...extraRankingBoards].map((board) => (
            <RankingBoardCard key={board.title} board={board} />
          ))}
        </div>
      </div>
    </section>
  );
}
