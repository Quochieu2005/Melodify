import type { Metadata } from 'next';

import VideoLibraryPage from '@/components/videos/VideoLibraryPage';

export const metadata: Metadata = {
  title: 'Videos | Melodify',
  description: 'Khám phá toàn bộ video nhạc trên Melodify.',
};

// Keep collection-style URLs such as /videos/10 on the all-videos library.
// A video's detail page has its own singular route: /video/[slug].
export default function VideoCollectionPage() {
  return <VideoLibraryPage />;
}
