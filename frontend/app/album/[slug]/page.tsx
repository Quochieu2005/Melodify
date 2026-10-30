import { AlbumDetailPage } from '@/components/albums';

export default async function AlbumSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <AlbumDetailPage key={slug} slug={decodeURIComponent(slug)} />;
}
