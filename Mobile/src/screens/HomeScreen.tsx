import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

import { AppShell } from '@/components/layout';
import { Artwork, SongRow } from '@/components/music';
import { ScrollPage, SectionHeading, useSurfaceStyles } from '@/components/shared';
import { AppIcon } from '@/components/shared/AppIcon';
import { useRemoteData } from '@/hooks/useRemoteData';
import { useAdaptiveStyles } from '@/hooks/use-adaptive-styles';
import { useTheme } from '@/hooks/use-theme';
import {
  getHomeDiscovery,
  getTrendingArtists,
  listAlbums,
  listBanners,
  listCharts,
  listGenres,
  listPlaylists,
  listTopics,
  type Song,
} from '@/lib/api';
import { getAlbumRailCardWidth } from '@/lib/layout';

function SongSection({ title, songs }: { title: string; songs: Song[] }) {
  const styles = useAdaptiveStyles(baseStyles);
  if (!songs.length) return null;
  return (
    <View style={styles.section}>
      <SectionHeading title={title} />
      <View style={styles.cardSection}>
        {songs.slice(0, 6).map((song) => (
          <SongRow key={song.id} song={song} songs={songs} showFavorite />
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const surface = useSurfaceStyles();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const bannerWidth = Math.min(460, Math.max(280, width - 32));
  const artistCardWidth = Math.min(340, Math.max(240, width * 0.75));
  const catalogCardWidth = Math.min(184, Math.max(140, (width - 48) / 2.2));
  const albumCardWidth = getAlbumRailCardWidth(width);
  const chartWidth = Math.max(280, width - 32);
  // Keep each home area on its own API and let all requests start together.
  const bannersResource = useRemoteData(() => listBanners({ daily: true, limit: 4 }));
  const topicsResource = useRemoteData(() => listTopics({ perPage: 12 }));
  const chartsResource = useRemoteData(listCharts);
  const discoveryResource = useRemoteData(getHomeDiscovery);
  const artistsResource = useRemoteData(getTrendingArtists);
  const genresResource = useRemoteData(() => listGenres({ perPage: 12 }));
  const albumsResource = useRemoteData(() => listAlbums({ perPage: 12 }));
  const playlistsResource = useRemoteData(() => listPlaylists({ perPage: 12 }));

  const banners = bannersResource.data?.data ?? [];
  const topics = topicsResource.data?.data ?? [];
  const charts = chartsResource.data?.data ?? [];
  const discovery = discoveryResource.data?.data;
  const trendingArtists = artistsResource.data?.data ?? [];
  const genres = genresResource.data?.data ?? [];
  const albums = albumsResource.data?.data ?? [];
  const playlists = playlistsResource.data?.data ?? [];

  const openBanner = (target: string | null) => {
    if (!target) return;
    if (/^https?:\/\//i.test(target)) {
      void Linking.openURL(target).catch(() => undefined);
    } else {
      router.push(target as never);
    }
  };

  return (
    <AppShell>
      <ScrollPage>
            {/* Top Banners Carousel (Ảnh 1) */}
            {banners.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                {banners.slice(0, 4).map((banner) => (
                  <Pressable key={banner.id} onPress={() => openBanner(banner.link_url)} style={[styles.banner, { width: bannerWidth }]}>
                    {banner.image_url ? <Image source={{ uri: banner.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /> : null}
                    <View style={styles.bannerShade} />
                    <Text numberOfLines={2} style={styles.bannerTitle}>{banner.title}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {/* Chủ Đề (Topic Cards Grid/Rail - Ảnh 1) */}
            {topics.length ? (
              <CatalogSection
                title="Chủ Đề"
                cardWidth={catalogCardWidth}
                items={topics.map((item) => ({
                  id: item.id,
                  name: item.name,
                  image: item.image_url,
                  route: '/topic/' + (item.slug || item.id),
                }))}
                onPress={(route) => router.push(route as never)}
              />
            ) : null}

            {/* Bảng Xếp Hạng (Rankings - Ảnh 1) */}
            {!!charts.length ? (
              <View style={styles.section}>
                <SectionHeading
                  title="Bảng Xếp Hạng"
                  action={
                    <Text onPress={() => router.push('/charts' as never)} style={styles.action}>
                      Thêm
                    </Text>
                  }
                />
                <ScrollView
                  horizontal
                  pagingEnabled
                  snapToInterval={chartWidth}
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chartCarousel}
                >
                  {charts.map((chart) => (
                    <Pressable
                      key={chart.id}
                      onPress={() => router.push(('/charts/' + chart.slug) as never)}
                      style={[styles.chartCard, surface.card, { width: chartWidth }]}
                    >
                      <View style={styles.chartHeader}>
                        <View style={styles.chartTitleRow}>
                          <Text numberOfLines={1} style={styles.chartTitle}>
                            {chart.title} ❯
                          </Text>
                          <Text style={styles.chartMeta}>{chart.song_count} bài hát</Text>
                        </View>
                        <View style={styles.chartPlayCircle}>
                          <AppIcon name="play" color={theme.primary} size={14} />
                        </View>
                      </View>
                      {chart.songs?.slice(0, 5).map((song, sIdx) => (
                        <View key={song.id} style={styles.miniSong}>
                          <Text style={[styles.rank, sIdx === 0 && styles.rankTop]}>
                            {song.rank || sIdx + 1}
                          </Text>
                          <Artwork uri={song.cover_url} size={42} />
                          <View style={styles.miniCopy}>
                            <Text numberOfLines={1} style={styles.songTitle}>
                              {song.title}
                            </Text>
                            <Text numberOfLines={1} style={styles.artist}>
                              {song.artists?.map((artist) => artist.name).join(', ') || song.artist?.name}
                            </Text>
                            {song.publisher ? (
                              <Text numberOfLines={1} style={styles.publisherTag}>
                                ● {song.publisher}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Bài hát mới phát hành & phổ biến */}
            <SongSection title="Bài hát mới phát hành" songs={discovery?.single_new_releases ?? []} />
            <SongSection title="Bài hát phổ biến" songs={discovery?.popular_songs ?? []} />

            {/* Nghệ sĩ thịnh hành */}
            {!!trendingArtists.filter((artist) => artist.featured_song).length ? (
              <View style={styles.section}>
                <SectionHeading
                  title="Nghệ sĩ thịnh hành"
                  action={
                    <Text onPress={() => router.push('/trending-artist' as never)} style={styles.action}>
                      Thêm
                    </Text>
                  }
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                  {trendingArtists
                    .filter((artist) => artist.featured_song)
                    .slice(0, 8)
                    .map((artist) => (
                      <Pressable
                        key={artist.id}
                        onPress={() => router.push(('/artist/' + (artist.slug || artist.id)) as never)}
                        style={[styles.artistCard, surface.card, { width: artistCardWidth }]}
                      >
                        <View style={[styles.artistHero, { height: artistCardWidth * 0.65 }]}>
                          {artist.avatar_url ? (
                            <Image source={{ uri: artist.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                          ) : null}
                          <View style={styles.artistShade} />
                          <Text numberOfLines={1} style={styles.artistName}>
                            {artist.name}
                          </Text>
                        </View>
                        {artist.featured_song ? (
                          <View style={styles.artistSong}>
                            <Artwork uri={artist.featured_song.cover_url} size={46} />
                            <View style={styles.miniCopy}>
                              <Text numberOfLines={1} style={styles.songTitle}>
                                {artist.featured_song.title}
                              </Text>
                              <Text numberOfLines={1} style={styles.artist}>
                                {artist.name}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </Pressable>
                    ))}
                </ScrollView>
              </View>
            ) : null}

            <CatalogSection title="Thể loại" cardWidth={catalogCardWidth} items={genres.map((item) => ({ id: item.id, name: item.name, image: item.image_url, route: '/genre/' + (item.slug || item.id) }))} onPress={(route) => router.push(route as never)} />
            <CatalogSection title="Album" cardWidth={albumCardWidth} items={albums.map((item) => ({ id: item.id, name: item.title, image: item.cover_url, route: '/album/' + (item.slug || item.id) }))} onPress={(route) => router.push(route as never)} />
            <CatalogSection title="Playlist" cardWidth={catalogCardWidth} items={playlists.map((item) => ({ id: item.id, name: item.name, image: item.cover_url, route: '/playlist/' + (item.slug || item.id) }))} onPress={(route) => router.push(route as never)} />
      </ScrollPage>
    </AppShell>
  );
}

function CatalogSection({
  title,
  items,
  cardWidth,
  onPress,
}: {
  title: string;
  items: { id: string; name: string; image: string | null; route: string }[];
  cardWidth: number;
  onPress: (route: string) => void;
}) {
  const styles = useAdaptiveStyles(baseStyles);
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <SectionHeading title={title} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {items.slice(0, 12).map((item) => (
          <Pressable key={item.id} onPress={() => onPress(item.route)} style={[styles.catalogItem, { width: cardWidth }]}>
            <Artwork uri={item.image} size={cardWidth} />
            <Text numberOfLines={2} style={styles.catalogTitle}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  section: { gap: 10 },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  action: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  rail: { gap: 12, paddingRight: 16 },
  banner: {
    height: 148,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  bannerShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  bannerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', zIndex: 1 },
  chartCarousel: { gap: 0 },
  chartCard: {
    padding: 14,
    gap: 10,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  chartTitleRow: {
    flex: 1,
    gap: 2,
  },
  chartTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  chartMeta: { color: '#64748B', fontSize: 11 },
  chartPlayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6FAF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniSong: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  miniCopy: { flex: 1, minWidth: 0, gap: 2 },
  songTitle: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
  artist: { color: '#64748B', fontSize: 11 },
  publisherTag: { color: '#94A3B8', fontSize: 10 },
  rank: { color: '#64748B', fontSize: 16, fontWeight: '900', width: 22, textAlign: 'center' },
  rankTop: { color: '#00B5AD' },
  artistCard: {},
  artistHero: { overflow: 'hidden', justifyContent: 'flex-end', padding: 14, backgroundColor: '#CBD5E1' },
  artistShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  artistName: { zIndex: 1, color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  artistSong: { minHeight: 68, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  catalogItem: { gap: 6 },
  catalogTitle: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
});
