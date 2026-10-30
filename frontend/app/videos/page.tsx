import type { Metadata } from 'next';

import VideoLibraryPage from '@/components/videos/VideoLibraryPage';

export const metadata: Metadata = {
  title: 'Video Nhạc | Melodify',
  description: 'Khám phá và xem video nhạc trên Melodify.',
};

export default function VideosPage() {
  return <VideoLibraryPage />;
}
