import SearchResultsPage from '@/components/search/SearchResultsPage';
import type { SearchKind } from '@/lib/library-api';

export default async function Page({ searchParams }: { searchParams: Promise<{ key?: string; t?: string; page?: string }> }) {
  const params = await searchParams;
  const kind = ['all', 'song', 'playlist', 'artist', 'album', 'video', 'user'].includes(params.t || '') ? params.t as SearchKind : 'all';
  const page = Math.min(1000, Math.max(1, Number(params.page) || 1));
  return <SearchResultsPage key={`${params.key}:${kind}:${page}`} query={(params.key || '').slice(0, 100)} kind={kind} page={page} />;
}
