import { SongCard } from '@/components/music';

const featuredSongs = [
  { title: 'Bài hát nổi bật', artist: 'Melodify Artist' },
  { title: 'Giai điệu mới', artist: 'Melodify Artist' },
];

export default function FeaturedSongsSection() {
  return (
    <section>
      <h2 className="text-2xl font-semibold">Gợi ý hôm nay</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {featuredSongs.map((song) => (
          <SongCard key={song.title} {...song} />
        ))}
      </div>
    </section>
  );
}
