import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/components/layout';
import { Artwork } from '@/components/music';
import { ScrollPage, SectionHeading, StateMessage, surfaceStyles } from '@/components/shared';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getHomeBootstrap } from '@/lib/api';
import { AppIcon } from '@/components/shared/AppIcon';
import { getAlbumRailCardWidth } from '@/lib/layout';

export function ExploreScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(184, Math.max(140, (width - 56) / 2.2));
  const albumCardWidth = getAlbumRailCardWidth(width);
  const { data, loading, error, reload } = useRemoteData(async () => (await getHomeBootstrap()).data);

  return (
    <AppShell>
      <ScrollPage>
        <View style={styles.heading}>
          <Text style={styles.kicker}>KHÁM PHÁ</Text>
          <Text style={styles.title}>Tìm điều mới để nghe</Text>
          <Pressable onPress={() => router.push('/search' as never)} style={styles.searchLink}>
            <AppIcon name="search" color="#00D3E5" size={19} /><Text style={styles.searchText}>Tìm bài hát, nghệ sĩ, album…</Text>
          </Pressable>
        </View>
        {loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}
        {data ? (
          <>
            <CatalogSection title="Chủ đề" cardWidth={cardWidth} items={data.topics.map((item) => ({ id: item.id, name: item.name, image: item.image_url, path: '/topic/' + (item.slug || item.id) }))} onPress={(path) => router.push(path as never)} />
            <CatalogSection title="Thể loại" cardWidth={cardWidth} items={data.genres.map((item) => ({ id: item.id, name: item.name, image: item.image_url, path: '/genre/' + (item.slug || item.id) }))} onPress={(path) => router.push(path as never)} />
            <CatalogSection title="Playlist" cardWidth={cardWidth} items={data.playlists.map((item) => ({ id: item.id, name: item.name, image: item.cover_url, path: '/playlist/' + (item.slug || item.id) }))} onPress={(path) => router.push(path as never)} />
            <CatalogSection title="Album" cardWidth={albumCardWidth} items={data.albums.map((item) => ({ id: item.id, name: item.title, image: item.cover_url, path: '/album/' + (item.slug || item.id) }))} onPress={(path) => router.push(path as never)} />
            <View style={styles.shortcuts}>
              <SectionHeading title="Xem thêm" />
              <Shortcut title="Bảng xếp hạng" detail="Danh sách Top 50" onPress={() => router.push('/charts' as never)} />
              <Shortcut title="Nghệ sĩ thịnh hành" detail="Theo lượt nghe và lượt xem tuần" onPress={() => router.push('/trending-artist' as never)} />
              <Shortcut title="Bài hát mới" detail="Các bản phát hành gần đây" onPress={() => router.push('/search' as never)} />
            </View>
          </>
        ) : null}
      </ScrollPage>
    </AppShell>
  );
}

function CatalogSection({ title, items, cardWidth, onPress }: { title: string; items: { id: string; name: string; image: string | null; path: string }[]; cardWidth: number; onPress: (path: string) => void }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <SectionHeading title={title} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {items.map((item) => (
          <Pressable key={item.id} onPress={() => onPress(item.path)} style={[styles.tile, { width: cardWidth }]}>
            <Artwork uri={item.image} size={cardWidth} />
            <Text numberOfLines={2} style={styles.tileTitle}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Shortcut({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.shortcut}><View style={styles.shortcutCopy}><Text style={styles.shortcutTitle}>{title}</Text><Text style={styles.shortcutDetail}>{detail}</Text></View><AppIcon name="chevron" color="#00D3E5" size={19} /></Pressable>;
}

const styles = StyleSheet.create({
  heading: { gap: 8 },
  kicker: { color: '#00D3E5', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#F5F7F6', fontSize: 26, fontWeight: '900' },
  searchLink: { height: 46, marginTop: 8, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13, backgroundColor: '#29332F', borderWidth: 1, borderColor: '#35403C' },
  searchText: { color: '#9CA8A2', fontSize: 13 },
  section: { gap: 11 },
  rail: { gap: 12, paddingRight: 16 },
  tile: { gap: 6 },
  tileTitle: { color: '#E7ECE9', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  shortcuts: { gap: 8 },
  shortcut: { ...surfaceStyles.card, flexDirection: 'row', alignItems: 'center', padding: 14 },
  shortcutCopy: { flex: 1, gap: 4 },
  shortcutTitle: { color: '#F5F7F6', fontWeight: '800', fontSize: 14 },
  shortcutDetail: { color: '#9CA8A2', fontSize: 11 },
});
