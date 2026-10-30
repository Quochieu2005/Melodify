import { ChartDetailPage } from '@/components/charts';

export default async function ChartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ChartDetailPage key={slug} slug={slug} />;
}
