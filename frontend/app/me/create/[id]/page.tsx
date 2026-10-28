import PlaylistDetailPage from '@/components/playlists/PlaylistDetailPage';

export default async function CreatedPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlaylistDetailPage key={id} slug={decodeURIComponent(id)} />;
}
