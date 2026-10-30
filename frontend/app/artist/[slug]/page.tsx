import { ArtistDetailPage } from '@/components/artists';

export default async function ArtistSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <ArtistDetailPage key={slug} slug={decodeURIComponent(slug)} />;
}
