import { FeaturedSongsSection, HeroSection } from '@/components/home';
import { AppLayout } from '@/components/layout';

export default function HomePage() {
  return (
    <AppLayout>
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <HeroSection />
        <FeaturedSongsSection />
      </main>
    </AppLayout>
  );
}
