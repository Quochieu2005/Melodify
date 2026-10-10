import { AlbumDetailPage } from '@/components/albums';

export default async function AlbumSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <AlbumDetailPage slug={decodeURIComponent(slug)} />;
}
