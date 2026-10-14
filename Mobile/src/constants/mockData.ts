export interface SongItem {
  id: string;
  title: string;
  artist: string;
  publisher?: string;
  publisherType?: 'sony' | 'believe' | 'domusic' | 'default';
  coverUrl: string;
  duration?: string;
  durationSeconds?: number;
  isHot?: boolean;
  isLossless?: boolean;
  trend?: 'up' | 'down' | 'same';
}

export interface TopicItem {
  id: string;
  title: string;
  imageUrl: string;
  category?: string;
  bgGradient?: string[];
}

export interface RankingBoard {
  id: string;
  title: string;
  songs: SongItem[];
}

export interface PlaylistItem {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  songCount?: number;
}

export const MOCK_BANNERS = [
  {
    id: 'b-1',
    title: 'Nhạc Mới Triển Vọng',
    subtitle: 'Những gương mặt bứt phá các bảng xếp hạng',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'b-2',
    title: 'Say Hi To The Beat',
    subtitle: 'Giai điệu bùng nổ cùng dàn Anh Trai',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'b-3',
    title: 'Top V-Pop Hôm Nay',
    subtitle: 'Tuyển tập những ca khúc gây nghiện',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'b-4',
    title: 'Chill Out & Relax',
    subtitle: 'Thư giãn cùng thanh âm trong trẻo',
    imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=85',
  },
];

export const MOCK_TOPICS: TopicItem[] = [
  {
    id: 'top-tiktok',
    title: 'TikTok',
    category: 'Remix',
    imageUrl: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'top-remix',
    title: 'Remix',
    category: 'Remix',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'top-nhactre',
    title: 'Nhạc Trẻ',
    category: 'V-Pop',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'top-nhachoa',
    title: 'Nhạc Hoa',
    category: 'C-Pop',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'top-bolero',
    title: 'Bolero',
    category: 'Acoustic',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'top-kpop',
    title: 'K-Pop',
    category: 'K-Pop',
    imageUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=600&q=85',
  },
];

export const MOCK_PLAYLISTS: PlaylistItem[] = [
  {
    id: 'pl-1',
    title: 'Melodify Top Hits Hôm Nay',
    subtitle: 'Tổng hợp giai điệu thịnh hành',
    coverUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=85',
    songCount: 50,
  },
  {
    id: 'pl-2',
    title: 'Acoustic Buổi Chiều Mưa',
    subtitle: 'Thanh âm mộc mạc lắng đọng',
    coverUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=85',
    songCount: 32,
  },
  {
    id: 'pl-3',
    title: 'Late Night Coffee & Lofi',
    subtitle: 'Âm nhạc cho đêm muộn thanh tĩnh',
    coverUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=85',
    songCount: 45,
  },
  {
    id: 'pl-4',
    title: 'Nhạc Trẻ Gây Nghiện',
    subtitle: 'Những bài hát nghe hoài không chán',
    coverUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=85',
    songCount: 40,
  },
];

export const MOCK_RANKING_BOARDS: RankingBoard[] = [
  {
    id: 'rb-trending',
    title: 'Top 50 Bài Hát Thịnh Hành',
    songs: [
      {
        id: 's-1',
        title: 'chờ chút...',
        artist: 'TINH HÀ "SAY HI", CONGB',
        publisher: 'SONY MUSIC',
        publisherType: 'sony',
        coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=240&q=85',
        trend: 'same',
        duration: '2:58',
      },
      {
        id: 's-2',
        title: 'LAVIEM',
        artist: 'TINH HÀ "SAY HI", Quang Hùng M...',
        publisher: 'SONY MUSIC',
        publisherType: 'sony',
        coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=240&q=85',
        trend: 'same',
        duration: '3:45',
      },
      {
        id: 's-3',
        title: 'Không Môn Đăng Hộ Đối',
        artist: 'Nguyễn Vĩ',
        publisher: 'Do Music',
        publisherType: 'domusic',
        coverUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=240&q=85',
        trend: 'same',
        duration: '3:32',
      },
    ],
  },
  {
    id: 'rb-vietnam',
    title: 'Top 50 Nhạc Việt',
    songs: [
      {
        id: 's-4',
        title: 'LAVITEM',
        artist: 'TINH HÀ "SAY HI", Wren Evans',
        publisher: 'SONY MUSIC',
        publisherType: 'sony',
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=240&q=85',
        trend: 'same',
        duration: '3:24',
      },
      {
        id: 's-5',
        title: 'Tìm Em',
        artist: 'Hngle, Bảo Anh',
        publisher: 'SONY MUSIC',
        publisherType: 'sony',
        coverUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=240&q=85',
        trend: 'up',
        duration: '3:15',
      },
      {
        id: 's-6',
        title: 'Lưu Niên',
        artist: 'Jack - J97',
        publisher: 'SONY MUSIC',
        publisherType: 'sony',
        coverUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=85',
        trend: 'down',
        duration: '3:50',
      },
    ],
  },
  {
    id: 'rb-global',
    title: 'Top 50 Quốc Tế',
    songs: [
      {
        id: 's-7',
        title: 'Dạo Bước Hongkong 1999',
        artist: 'Bố Lỗ Tích BlueC',
        publisher: 'BELIEVE MUSIC',
        publisherType: 'believe',
        coverUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=240&q=85',
        trend: 'same',
        duration: '3:18',
      },
      {
        id: 's-8',
        title: 'Golden Hour',
        artist: 'JVKE',
        publisher: 'AWAL',
        coverUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=240&q=85',
        trend: 'up',
        duration: '3:29',
      },
      {
        id: 's-9',
        title: 'Seven (feat. Latto)',
        artist: 'Jung Kook',
        publisher: 'BIGHIT MUSIC',
        coverUrl: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=240&q=85',
        trend: 'down',
        duration: '3:04',
      },
    ],
  },
];

export const DEFAULT_CURRENT_TRACK: SongItem = {
  id: 's-active',
  title: 'Em (feat. SOOBIN)',
  artist: 'Binz, SOOBIN',
  coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=200&q=85',
  duration: '3:40',
};
