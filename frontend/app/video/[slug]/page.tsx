import type { Metadata } from 'next';

import VideoDetailPage from '@/components/videos/VideoDetailPage';

export const metadata: Metadata = {
  title: 'Video Nhạc | Melodify',
  description: 'Xem video nhạc trên Melodify.',
};

export default async function VideoPage({ params }: PageProps<'/video/[slug]'>) {
  const { slug } = await params;
  return <VideoDetailPage slug={slug} />;
}
