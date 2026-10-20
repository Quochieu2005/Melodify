import { useRouter } from 'expo-router';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/components/layout';
import { Artwork, SongRow } from '@/components/music';
import { ScrollPage, SectionHeading, StateMessage, surfaceStyles } from '@/components/shared';
import { AppIcon } from '@/components/shared/AppIcon';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getHomeBootstrap, type Song } from '@/lib/api';
import { getAlbumRailCardWidth } from '@/lib/layout';

function SongSection({ title, songs }: { title: string; songs: Song[] }) {
  if (!songs.length) return null;
  return <View style={styles.section}><SectionHeading title={title} />{songs.slice(0, 6).map((song) => <SongRow key={song.id} song={song} songs={songs} showFavorite />)}</View>;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const bannerWidth = Math.min(460, Math.max(260, width - 56));
  const artistCardWidth = Math.min(340, Math.max(240, width * 0.78));
  const catalogCardWidth = Math.min(184, Math.max(140, (width - 56) / 2.2));
  const albumCardWidth = getAlbumRailCardWidth(width);
  const { data, loading, error, reload } = useRemoteData(async () => (await getHomeBootstrap()).data);
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
        <View style={styles.intro}>
          <Text style={styles.kicker}>MẠNG XÃ HỘI ÂM NHẠC</Text>
          <Text style={styles.title}>Âm nhạc của bạn,{"\n"}theo cách của bạn.</Text>
          <Text style={styles.subTitle}>Khám phá bài hát, nghệ sĩ và playlist mới.</Text>
        </View>

        {loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}

        {data ? (
          <>
            {data.banners?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                {data.banners.slice(0, 3).map((banner) => (
                  <Pressable key={banner.id} onPress={() => openBanner(banner.link_url)} style={[styles.banner, { width: bannerWidth }]}>
                    {banner.image_url ? <Image source={{ uri: banner.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                    <View style={styles.bannerShade} />
                    <Text numberOfLines={2} style={styles.bannerTitle}>{banner.title}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {!!data.charts?.length ? (
              <View style={styles.section}>
                <SectionHeading title="Bảng xếp hạng" action={<Text onPress={() => router.push('/charts' as never)} style={styles.action}>Thêm</Text>} />
                <View style={styles.chartList}>
                  {data.charts.slice(0, 8).map((chart) => (
                    <Pressable key={chart.id} onPress={() => router.push(('/charts/' + chart.slug) as never)} style={styles.chartCard}>
                      <View style={styles.chartHeader}>
                        <View style={[styles.chartDot, { backgroundColor: chart.tone || '#00D3E5' }]} />
                        <View style={styles.chartCopy}>
                          <Text numberOfLines={2} style={styles.chartTitle}>{chart.title}</Text>
                          <Text style={styles.chartMeta}>{chart.song_count} bài hát</Text>
                        </View>
                        <AppIcon name="chevron" color="#00D3E5" size={18} />
                      </View>
                      {chart.songs?.slice(0, 3).map((song) => <View key={song.id} style={styles.miniSong}><Artwork uri={song.cover_url} size={38} /><View style={styles.miniCopy}><Text numberOfLines={1} style={styles.songTitle}>{song.title}</Text><Text numberOfLines={1} style={styles.artist}>{song.artists?.map((artist) => artist.name).join(', ') || song.artist?.name}</Text></View><Text style={styles.rank}>{song.rank}</Text></View>)}
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <SongSection title="Bài hát mới phát hành" songs={data.discovery?.single_new_releases ?? []} />
            <SongSection title="Bài hát phổ biến" songs={data.discovery?.popular_songs ?? []} />

            {!!data.trending_artists?.filter((artist) => artist.featured_song).length ? (
              <View style={styles.section}>
                <SectionHeading title="Nghệ sĩ thịnh hành" action={<Text onPress={() => router.push('/trending-artist' as never)} style={styles.action}>Thêm</Text>} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                  {data.trending_artists.filter((artist) => artist.featured_song).slice(0, 8).map((artist) => (
                    <Pressable key={artist.id} onPress={() => router.push(('/artist/' + (artist.slug || artist.id)) as never)} style={[styles.artistCard, { width: artistCardWidth }]}>
                      <View style={[styles.artistHero, { height: artistCardWidth * 0.68 }]}>
                        {artist.avatar_url ? <Image source={{ uri: artist.avatar_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                        <View style={styles.artistShade} />
                        <Text numberOfLines={1} style={styles.artistName}>{artist.name}</Text>
                      </View>
                      {artist.featured_song ? <View style={styles.artistSong}>
                        <Artwork uri={artist.featured_song.cover_url} size={48} />
                        <View style={styles.miniCopy}><Text numberOfLines={1} style={styles.songTitle}>{artist.featured_song.title}</Text><Text numberOfLines={1} style={styles.artist}>{artist.name}</Text></View>
                      </View> : null}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <CatalogSection title="Chủ đề" cardWidth={catalogCardWidth} items={data.topics.map((item) => ({ id: item.id, name: item.name, image: item.image_url, route: '/topic/' + (item.slug || item.id) }))} onPress={(route) => router.push(route as never)} />
            <CatalogSection title="Thể loại" cardWidth={catalogCardWidth} items={data.genres.map((item) => ({ id: item.id, name: item.name, image: item.image_url, route: '/genre/' + (item.slug || item.id) }))} onPress={(route) => router.push(route as never)} />
            <CatalogSection title="Album" cardWidth={albumCardWidth} items={data.albums.map((item) => ({ id: item.id, name: item.title, image: item.cover_url, route: '/album/' + (item.slug || item.id) }))} onPress={(route) => router.push(route as never)} />
            <CatalogSection title="Playlist" cardWidth={catalogCardWidth} items={data.playlists.map((item) => ({ id: item.id, name: item.name, image: item.cover_url, route: '/playlist/' + (item.slug || item.id) }))} onPress={(route) => router.push(route as never)} />
          </>
        ) : null}
      </ScrollPage>
    </AppShell>
  );
}

function CatalogSection({ title, items, cardWidth, onPress }: { title: string; items: { id: string; name: string; image: string | null; route: string }[]; cardWidth: number; onPress: (route: string) => void }) {
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

const styles = StyleSheet.create({
  intro: { gap: 8, paddingVertical: 5 },
  kicker: { color: '#00D3E5', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#F5F7F6', fontSize: 29, fontWeight: '900', lineHeight: 34, letterSpacing: -0.8 },
  subTitle: { color: '#AEB8B3', fontSize: 13 },
  section: { gap: 10 },
  action: { color: '#B9C2BE', fontSize: 13, fontWeight: '700' },
  rail: { gap: 12, paddingRight: 16 },
  banner: { height: 142, overflow: 'hidden', justifyContent: 'flex-end', padding: 16, borderRadius: 16, backgroundColor: '#283431' },
  bannerShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8,14,12,0.34)' },
  bannerTitle: { color: '#FFF', fontSize: 21, fontWeight: '900', zIndex: 1 },
  chartList: { gap: 10 },
  chartCard: { ...surfaceStyles.card, padding: 12, gap: 8 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 6 },
  chartDot: { width: 8, height: 32, borderRadius: 4 },
  chartCopy: { flex: 1, gap: 3 },
  chartTitle: { color: '#F5F7F6', fontSize: 15, fontWeight: '900' },
  chartMeta: { color: '#9CA8A2', fontSize: 11 },
  miniSong: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 43 },
  miniCopy: { flex: 1, minWidth: 0, gap: 3 },
  songTitle: { color: '#F5F7F6', fontSize: 12, fontWeight: '800' },
  artist: { color: '#9CA8A2', fontSize: 11 },
  rank: { color: '#00D3E5', fontSize: 14, fontWeight: '900', width: 18, textAlign: 'center' },
  artistCard: { ...surfaceStyles.card },
  artistHero: { overflow: 'hidden', justifyContent: 'flex-end', padding: 14, backgroundColor: '#18211F' },
  artistShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8,14,12,0.38)' },
  artistName: { zIndex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  artistSong: { minHeight: 72, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  catalogItem: { gap: 6 },
  catalogTitle: { color: '#E9EEEC', fontSize: 11, fontWeight: '700' },
});
