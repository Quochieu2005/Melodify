import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/components/layout';
import { Artwork } from '@/components/music';
import { ScrollPage, SectionHeading, useSurfaceStyles } from '@/components/shared';
import { useRemoteData } from '@/hooks/useRemoteData';
import { listAlbums, listGenres, listPlaylists, listTopics } from '@/lib/api';
import { AppIcon } from '@/components/shared/AppIcon';
import { getAlbumRailCardWidth } from '@/lib/layout';
import { useAdaptiveStyles } from '@/hooks/use-adaptive-styles';
import { useTheme } from '@/hooks/use-theme';

export function ExploreScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(184, Math.max(140, (width - 56) / 2.2));
  const albumCardWidth = getAlbumRailCardWidth(width);
  const topics = useRemoteData(() => listTopics({ perPage: 50 }));
  const genres = useRemoteData(() => listGenres({ perPage: 50 }));
  const playlists = useRemoteData(() => listPlaylists({ perPage: 50 }));
  const albums = useRemoteData(() => listAlbums({ perPage: 50 }));

  return (
    <AppShell>
      <ScrollPage>
        <View style={styles.heading}>
          <Text style={styles.kicker}>KHÁM PHÁ</Text>
          <Text style={styles.title}>Tìm điều mới để nghe</Text>
          <Pressable onPress={() => router.push('/search' as never)} style={styles.searchLink}>
            <AppIcon name="search" color={theme.primary} size={19} /><Text style={styles.searchText}>Tìm bài hát, nghệ sĩ, album…</Text>
          </Pressable>
        </View>
        <CatalogSectionResource
          title="Chủ đề"
          cardWidth={cardWidth}
          items={topics.data?.data.map((item) => ({ id: item.id, name: item.name, image: item.image_url, path: '/topic/' + (item.slug || item.id) }))}
          loading={topics.loading}
          error={topics.error}
          onRetry={() => void topics.reload()}
          onPress={(path) => router.push(path as never)}
        />
        <CatalogSectionResource
          title="Thể loại"
          cardWidth={cardWidth}
          items={genres.data?.data.map((item) => ({ id: item.id, name: item.name, image: item.image_url, path: '/genre/' + (item.slug || item.id) }))}
          loading={genres.loading}
          error={genres.error}
          onRetry={() => void genres.reload()}
          onPress={(path) => router.push(path as never)}
        />
        <CatalogSectionResource
          title="Playlist"
          cardWidth={cardWidth}
          items={playlists.data?.data.map((item) => ({ id: item.id, name: item.name, image: item.cover_url, path: '/playlist/' + (item.slug || item.id) }))}
          loading={playlists.loading}
          error={playlists.error}
          onRetry={() => void playlists.reload()}
          onPress={(path) => router.push(path as never)}
        />
        <CatalogSectionResource
          title="Album"
          cardWidth={albumCardWidth}
          items={albums.data?.data.map((item) => ({ id: item.id, name: item.title, image: item.cover_url, path: '/album/' + (item.slug || item.id) }))}
          loading={albums.loading}
          error={albums.error}
          onRetry={() => void albums.reload()}
          onPress={(path) => router.push(path as never)}
        />
        <View style={styles.shortcuts}>
          <SectionHeading title="Xem thêm" />
          <Shortcut title="Bảng xếp hạng" detail="Danh sách Top 50" onPress={() => router.push('/charts' as never)} />
          <Shortcut title="Nghệ sĩ thịnh hành" detail="Theo lượt nghe và lượt xem tuần" onPress={() => router.push('/trending-artist' as never)} />
          <Shortcut title="Bài hát mới" detail="Các bản phát hành gần đây" onPress={() => router.push('/search' as never)} />
        </View>
      </ScrollPage>
    </AppShell>
  );
}

function CatalogSection({ title, items, cardWidth, onPress }: { title: string; items: { id: string; name: string; image: string | null; path: string }[]; cardWidth: number; onPress: (path: string) => void }) {
  const styles = useAdaptiveStyles(baseStyles);
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

function CatalogSectionResource({
  title,
  items,
  cardWidth,
  loading,
  error,
  onRetry,
  onPress,
}: {
  title: string;
  items?: { id: string; name: string; image: string | null; path: string }[];
  cardWidth: number;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onPress: (path: string) => void;
}) {
  const styles = useAdaptiveStyles(baseStyles);
  if (items?.length) return <CatalogSection title={title} items={items} cardWidth={cardWidth} onPress={onPress} />;
  if (loading) {
    return <View style={styles.resourceStatus}><SectionHeading title={title} /><Text style={styles.statusText}>Đang tải {title.toLocaleLowerCase('vi-VN')}…</Text></View>;
  }
  if (error) {
    return (
      <View style={styles.resourceStatus}>
        <SectionHeading title={title} />
        <Text style={styles.statusText}>{error}</Text>
        <Pressable onPress={onRetry}><Text style={styles.retryText}>Thử tải lại</Text></Pressable>
      </View>
    );
  }
  return null;
}

function Shortcut({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  const styles = useAdaptiveStyles(baseStyles);
  const surface = useSurfaceStyles();
  const theme = useTheme();
  return <Pressable onPress={onPress} style={[styles.shortcut, surface.card]}><View style={styles.shortcutCopy}><Text style={styles.shortcutTitle}>{title}</Text><Text style={styles.shortcutDetail}>{detail}</Text></View><AppIcon name="chevron" color={theme.primary} size={19} /></Pressable>;
}

const baseStyles = StyleSheet.create({
  heading: { gap: 8 },
  kicker: { color: '#00D3E5', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#F5F7F6', fontSize: 26, fontWeight: '900' },
  searchLink: { height: 46, marginTop: 8, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13, backgroundColor: '#29332F', borderWidth: 1, borderColor: '#35403C' },
  searchText: { color: '#9CA8A2', fontSize: 13 },
  section: { gap: 11 },
  resourceStatus: { gap: 8, minHeight: 54 },
  statusText: { color: '#9CA8A2', fontSize: 12 },
  retryText: { color: '#00D3E5', fontSize: 12, fontWeight: '700' },
  rail: { gap: 12, paddingRight: 16 },
  tile: { gap: 6 },
  tileTitle: { color: '#E7ECE9', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  shortcuts: { gap: 8 },
  shortcut: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  shortcutCopy: { flex: 1, gap: 4 },
  shortcutTitle: { color: '#F5F7F6', fontWeight: '800', fontSize: 14 },
  shortcutDetail: { color: '#9CA8A2', fontSize: 11 },
});
