type SongCardProps = { title: string; artist: string };

export default function SongCard({ title, artist }: SongCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="font-semibold text-zinc-950">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{artist}</p>
    </article>
  );
}
