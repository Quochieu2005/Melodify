import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/components/layout';
import { Artwork, SongRow, useMusic } from '@/components/music';
import { PageHeading, ScrollPage, SectionHeading, StateMessage, surfaceStyles } from '@/components/shared';
import { AppIcon } from '@/components/shared/AppIcon';
import { SyncedLyricsView } from '@/components/player';
import { parseLrcLyrics } from '@/lib/lyrics';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getAlbumRailCardWidth } from '@/lib/layout';
import {
  getAlbum, getArtist, getChart, getGenre, getPlaylist, getSavedAuthUser, getSong, getTopic,
  getTrendingArtists, getVisitorId, listAlbums, listCharts, listPlaylists, setFollowing,
  toggleAlbumFavorite, togglePlaylistFavorite,
  type Chart, type Song, type TrendingArtist,
} from '@/lib/api';

function identifierParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

function CatalogRows({ title, items, routeBase }: { title: string; items: { id: string; name: string; image: string | null; slug: string | null }[]; routeBase: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = title === 'Album'
    ? getAlbumRailCardWidth(width)
    : Math.min(192, Math.max(140, (width - 56) / 2.1));
  if (!items.length) return <StateMessage empty={'Chưa có ' + title.toLowerCase() + ' để hiển thị.'} />;
  return (
    <View style={styles.section}>
      <SectionHeading title={title} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catalogList}>
        {items.map((item) => (
          <Pressable key={item.id} onPress={() => router.push((routeBase + '/' + (item.slug || item.id)) as never)} style={[styles.catalogCard, { width: cardWidth }]}>
            <Artwork uri={item.image} size={cardWidth} />
            <Text numberOfLines={2} style={styles.catalogTitle}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function SongCollection({ title, songs }: { title: string; songs: Song[] }) {
  return <View style={styles.section}><SectionHeading title={title} />{songs.length ? songs.map((song) => <SongRow key={song.id} song={song} songs={songs} showFavorite />) : <StateMessage empty="Chưa có bài hát trong danh sách này." />}</View>;
}

export function ChartsScreen() {
  const router = useRouter();
  const { data, loading, error, reload } = useRemoteData(async () => (await listCharts()).data);
  return (
    <AppShell><ScrollPage><PageHeading title="Bảng xếp hạng" subtitle="Các bảng xếp hạng Melodify" />
      {loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}
      {data?.length ? data.map((chart) => <ChartCard key={chart.id} chart={chart} onPress={() => router.push(('/charts/' + chart.slug) as never)} />) : null}
      {data && !data.length ? <StateMessage empty="Chưa có bảng xếp hạng." /> : null}
    </ScrollPage></AppShell>
  );
}

export function ChartDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const identifier = identifierParam(slug);
  const { data, loading, error, reload } = useRemoteData(async () => (await getChart(identifier)).data, identifier);
  return (
    <AppShell><ScrollPage>
      {loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}
      {data ? <><PageHeading title={data.title} subtitle={data.description || data.song_count + ' bài hát'} /><SongCollection title="Danh sách bài hát" songs={data.songs ?? []} /></> : null}
    </ScrollPage></AppShell>
  );
}

function ChartCard({ chart, onPress }: { chart: Chart; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chartCard, surfaceStyles.card]}>
      <View style={styles.chartTop}><View style={[styles.chartTone, { backgroundColor: chart.tone || '#00D3E5' }]} /><View style={styles.chartCopy}><Text style={styles.chartTitle}>{chart.title}</Text><Text style={styles.muted}>{chart.song_count} bài hát</Text></View><AppIcon name="chevron" color="#00D3E5" size={18} /></View>
      {chart.songs?.slice(0, 5).map((song) => <View key={song.id} style={styles.chartSong}><Text style={styles.rank}>{song.rank}</Text><Artwork uri={song.cover_url} size={44} /><View style={styles.chartCopy}><Text numberOfLines={1} style={styles.songTitle}>{song.title}</Text><Text numberOfLines={1} style={styles.muted}>{song.artists?.map((artist) => artist.name).join(', ') || song.artist?.name}</Text></View><AppIcon name="music" color="#9CA8A2" size={15} /></View>)}
    </Pressable>
  );
}

export function TrendingArtistsScreen() {
  const router = useRouter();
  const [canFollow, setCanFollow] = useState(false);
  const { data, loading, error, reload } = useRemoteData(async () => (await getTrendingArtists()).data);
  useEffect(() => { void getSavedAuthUser().then((user) => setCanFollow(Boolean(user))); }, []);
  return <AppShell><ScrollPage><PageHeading title="Nghệ sĩ thịnh hành" subtitle="Xếp hạng dựa trên lượt nghe và lượt xem trong 7 ngày, chỉ hiện nghệ sĩ có bài hát nổi bật." />
    {loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}
    {data?.filter((artist) => artist.featured_song).map((artist, index) => <TrendingArtistRow key={artist.id} artist={artist} rank={index + 1} canFollow={canFollow} onLogin={() => router.push('/login' as never)} />)}
    {data && !data.some((artist) => artist.featured_song) ? <StateMessage empty="Chưa có nghệ sĩ đủ dữ liệu và có bài hát nổi bật trong tuần." /> : null}
  </ScrollPage></AppShell>;
}

function TrendingArtistRow({ artist, rank, canFollow, onLogin }: { artist: TrendingArtist; rank: number; canFollow: boolean; onLogin: () => void }) {
  const router = useRouter();
  const [following, setFollowingState] = useState(Boolean(artist.is_following));
  const [busy, setBusy] = useState(false);
  const song = artist.featured_song;
  const toggleFollow = async () => {
    if (!canFollow) {
      onLogin();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const result = await setFollowing('artist', artist.slug || artist.id, !following);
      setFollowingState(result.following);
    } catch {
      // Keep the existing follow state if the API request fails.
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[styles.trendingRow, surfaceStyles.card]}>
      <View style={styles.trendingTop}>
        <Pressable onPress={() => router.push(('/artist/' + (artist.slug || artist.id)) as never)} style={styles.artistMain}>
          <Text style={styles.rank}>#{rank}</Text><Artwork uri={artist.avatar_url} size={58} round />
          <View style={styles.chartCopy}><Text numberOfLines={1} style={styles.chartTitle}>{artist.name}</Text><Text style={styles.muted}>{artist.weekly_plays.toLocaleString()} lượt nghe tuần này</Text><Text style={styles.muted}>{artist.weekly_views.toLocaleString()} lượt xem tuần này</Text></View>
        </Pressable>
        <Pressable disabled={busy} onPress={() => void toggleFollow()} style={styles.followButton}><Text style={styles.followText}>{canFollow ? (following ? 'Đang theo dõi' : 'Theo dõi') : 'Đăng nhập'}</Text></Pressable>
      </View>
      {song ? <Pressable onPress={() => router.push(('/song/' + (song.slug || song.id)) as never)} style={styles.featuredSong}><Artwork uri={song.cover_url} size={46} /><View style={styles.chartCopy}><Text numberOfLines={1} style={styles.songTitle}>{song.title}</Text><Text numberOfLines={1} style={styles.muted}>{song.artists?.map((item) => item.name).join(', ') || artist.name}</Text></View></Pressable> : null}
    </View>
  );
}

export function AlbumListScreen() {
  const { data, loading, error, reload } = useRemoteData(async () => (await listAlbums({ perPage: 60 })).data);
  const items = data?.map((album) => ({ id: album.id, name: album.title, image: album.cover_url, slug: album.slug })) ?? [];
  return <AppShell><ScrollPage><PageHeading title="Album" subtitle="Album trong thư viện Melodify" />{loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}<CatalogRows title="Album" items={items} routeBase="/album" /></ScrollPage></AppShell>;
}

export function AlbumDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const identifier = identifierParam(slug);
  const { data, loading, error, reload } = useRemoteData(async () => (await getAlbum(identifier, await getVisitorId())).data, identifier);
  return <AppShell><ScrollPage>{loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}{data ? <><EntityHero title={data.title} subtitle={data.artist?.name || 'Album'} image={data.cover_url} meta={data.song_count + ' bài hát'} action={<EntityFavoriteButton key={identifier} initial={Boolean(data.is_favorite)} toggle={(visitorId) => toggleAlbumFavorite(identifier, visitorId)} />} /><SongCollection title="Bài hát trong album" songs={data.songs ?? []} /></> : null}</ScrollPage></AppShell>;
}

export function PlaylistListScreen() {
  const { data, loading, error, reload } = useRemoteData(async () => (await listPlaylists({ perPage: 60 })).data);
  const items = data?.map((playlist) => ({ id: playlist.id, name: playlist.name, image: playlist.cover_url, slug: playlist.slug })) ?? [];
  return <AppShell><ScrollPage><PageHeading title="Playlist" subtitle="Danh sách playlist công khai" />{loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}<CatalogRows title="Playlist" items={items} routeBase="/playlist" /></ScrollPage></AppShell>;
}

export function PlaylistDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const identifier = identifierParam(slug);
  const { data, loading, error, reload } = useRemoteData(async () => (await getPlaylist(identifier, await getVisitorId())).data, identifier);
  return <AppShell><ScrollPage>{loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}{data ? <><EntityHero title={data.name} subtitle={data.description || 'Playlist Melodify'} image={data.cover_url} meta={data.song_count + ' bài hát'} action={<EntityFavoriteButton key={identifier} initial={Boolean(data.is_favorite)} toggle={(visitorId) => togglePlaylistFavorite(identifier, visitorId)} />} /><SongCollection title="Danh sách bài hát" songs={data.songs ?? []} /></> : null}</ScrollPage></AppShell>;
}

export function ArtistDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const identifier = identifierParam(slug);
  const { data, loading, error, reload } = useRemoteData(async () => (await getArtist(identifier)).data, identifier);
  return <AppShell><ScrollPage>{loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}{data ? <><EntityHero title={data.name} subtitle={data.bio || 'Nghệ sĩ Melodify'} image={data.avatar_url} meta={(data.followers_count ?? 0).toLocaleString() + ' người theo dõi'} action={<ArtistFollowControl key={identifier} artist={data} />} /><SongCollection title="Bài hát" songs={data.featured_songs?.length ? data.featured_songs : data.songs ?? []} />{data.albums?.length ? <CatalogRows title="Album" items={data.albums.map((item) => ({ id: item.id, name: item.title, image: item.cover_url, slug: item.slug }))} routeBase="/album" /> : null}{data.playlists?.length ? <CatalogRows title="Playlist" items={data.playlists.map((item) => ({ id: item.id, name: item.name, image: item.cover_url, slug: item.slug }))} routeBase="/playlist" /> : null}</> : null}</ScrollPage></AppShell>;
}

export function TopicDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const identifier = identifierParam(slug);
  const { data, loading, error, reload } = useRemoteData(async () => (await getTopic(identifier)).data, identifier);
  return <AppShell><ScrollPage>{loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}{data ? <><EntityHero title={data.name} subtitle={data.description || 'Chủ đề âm nhạc'} image={data.image_url} meta={data.song_count + ' bài hát'} /><SongCollection title="Bài hát trong chủ đề" songs={data.songs ?? []} /></> : null}</ScrollPage></AppShell>;
}

export function GenreDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const identifier = identifierParam(slug);
  const { data, loading, error, reload } = useRemoteData(async () => (await getGenre(identifier)).data, identifier);
  return <AppShell><ScrollPage>{loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}{data ? <><EntityHero title={data.name} subtitle={data.description || 'Thể loại âm nhạc'} image={data.image_url} meta={data.song_count + ' bài hát'} /><SongCollection title="Bài hát thể loại này" songs={data.songs ?? []} /></> : null}</ScrollPage></AppShell>;
}

export function SongDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const identifier = identifierParam(slug);
  const { data, loading, error, reload } = useRemoteData(async () => (await getSong(identifier)).data, identifier);
  const { track, isPlaying, playSong, togglePlay, seekTo, parsedLyrics, activeLyricIndex } = useMusic();
  const song = data as Song | null;

  const isThisSongLoaded = Boolean(song && (track?.id === song.id || track?.slug === song.slug));
  const isThisTrackPlaying = Boolean(isThisSongLoaded && isPlaying);

  const songParsedLyrics = useMemo(() => {
    if (isThisSongLoaded && parsedLyrics.length > 0) return parsedLyrics;
    const synced = song?.lyrics?.find((l) => l.is_synced && l.synced_lyrics);
    if (synced?.synced_lyrics) return parseLrcLyrics(synced.synced_lyrics);
    const content = song?.lyrics?.[0]?.content;
    if (content && content.includes('[0')) return parseLrcLyrics(content);
    return [];
  }, [isThisSongLoaded, parsedLyrics, song?.lyrics]);

  const handlePlayToggle = () => {
    if (!song) return;
    if (isThisSongLoaded) {
      togglePlay();
    } else {
      void playSong(song);
    }
  };

  const handleSeek = (seconds: number) => {
    if (!song) return;
    if (!isThisSongLoaded) {
      void playSong(song).then(() => {
        setTimeout(() => seekTo(seconds), 350);
      });
    } else {
      seekTo(seconds);
    }
  };

  return (
    <AppShell>
      <ScrollPage>
        {loading || error ? (
          <StateMessage loading={loading} error={error} onRetry={() => void reload()} />
        ) : null}

        {song ? (
          <>
            <EntityHero
              title={song.title}
              subtitle={
                song.artists?.map((artist) => artist.name).join(', ') ||
                song.artist?.name ||
                'Nghệ sĩ'
              }
              image={song.cover_url}
              meta={song.album?.title || song.publisher || ''}
            />

            <Pressable onPress={handlePlayToggle} style={styles.playLarge}>
              <AppIcon
                name={isThisTrackPlaying ? 'pause' : 'play'}
                color="#092326"
                size={18}
              />
              <Text style={styles.playLargeText}>
                {isThisTrackPlaying ? 'Tạm dừng' : 'Phát bài hát'}
              </Text>
            </Pressable>

            {song.lyrics?.length ? (
              <View style={styles.lyrics}>
                <SectionHeading
                  title="Lời bài hát"
                  action={
                    songParsedLyrics.length > 0 ? (
                      <Text style={styles.karaokeBadge}>✦ Chạy theo bài hát</Text>
                    ) : undefined
                  }
                />
                <SyncedLyricsView
                  lyrics={songParsedLyrics}
                  plainText={song.lyrics[0]?.plain_lyrics || song.lyrics[0]?.content}
                  activeLyricIndex={isThisTrackPlaying ? activeLyricIndex : -1}
                  onSeekToLine={handleSeek}
                  containerHeight={320}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollPage>
    </AppShell>
  );
}

function EntityHero({ title, subtitle, image, meta, action }: { title: string; subtitle: string; image?: string | null; meta: string; action?: ReactNode }) {
  return <View style={[styles.hero, surfaceStyles.card]}>{image ? <Image source={{ uri: image }} style={styles.heroImage} resizeMode="cover" /> : <Artwork uri={image} size={112} />}<View style={styles.heroCopy}><Text style={styles.heroSubtitle}>{subtitle}</Text><Text style={styles.heroTitle}>{title}</Text><Text style={styles.muted}>{meta}</Text>{action}</View></View>;
}

function EntityFavoriteButton({ initial, toggle }: { initial: boolean; toggle: (visitorId: string) => Promise<{ favorited: boolean }> }) {
  const [favorite, setFavorite] = useState(initial);
  const [busy, setBusy] = useState(false);
  const update = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const visitorId = await getVisitorId();
      const result = await toggle(visitorId);
      setFavorite(result.favorited);
    } catch {
      // Keep the server-provided favorite state when the request fails.
    } finally {
      setBusy(false);
    }
  };
  return <Pressable disabled={busy} onPress={() => void update()} style={styles.entityAction}><AppIcon name="heart" color={favorite ? '#00D3E5' : '#E9EEEC'} size={15} /><Text style={styles.entityActionText}>{favorite ? 'Đã lưu' : 'Lưu'}</Text></Pressable>;
}

function ArtistFollowControl({ artist }: { artist: { id: string; slug: string | null; is_following?: boolean } }) {
  const router = useRouter();
  const [userReady, setUserReady] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [following, setFollowingState] = useState(Boolean(artist.is_following));
  const [busy, setBusy] = useState(false);
  useEffect(() => { void getSavedAuthUser().then((user) => { setHasUser(Boolean(user)); setUserReady(true); }); }, []);
  const update = async () => {
    if (!hasUser) {
      router.push('/login' as never);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const result = await setFollowing('artist', artist.slug || artist.id, !following);
      setFollowingState(result.following);
    } catch {
      // Keep the current state if the server rejects the change.
    } finally {
      setBusy(false);
    }
  };
  return <Pressable disabled={!userReady || busy} onPress={() => void update()} style={styles.entityAction}><Text style={styles.entityActionText}>{userReady && hasUser ? (following ? 'Đang theo dõi' : 'Theo dõi') : 'Đăng nhập để theo dõi'}</Text></Pressable>;
}

const styles = StyleSheet.create({
  section: { gap: 9 },
  catalogList: { gap: 12, paddingRight: 16 },
  catalogCard: { gap: 7 },
  catalogTitle: { color: '#E9EEEC', fontSize: 12, fontWeight: '700' },
  chartCard: { padding: 12, gap: 7 },
  chartTop: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 11, paddingBottom: 6 },
  chartTone: { width: 7, height: 34, borderRadius: 4 },
  chartCopy: { flex: 1, minWidth: 0, gap: 3 },
  chartTitle: { color: '#F5F7F6', fontSize: 15, fontWeight: '900' },
  muted: { color: '#9CA8A2', fontSize: 11 },
  chartSong: { minHeight: 51, flexDirection: 'row', alignItems: 'center', gap: 9 },
  rank: { color: '#00D3E5', width: 28, fontSize: 15, fontWeight: '900' },
  songTitle: { color: '#F5F7F6', fontSize: 12, fontWeight: '800' },
  trendingRow: { padding: 12, gap: 11 },
  trendingTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  artistMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  followButton: { minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 20, paddingHorizontal: 10, borderWidth: 1, borderColor: '#75817B' },
  followText: { color: '#E9EEEC', fontSize: 11, fontWeight: '800' },
  featuredSong: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  hero: { minHeight: 156, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroImage: { width: 112, height: 112, borderRadius: 12 },
  heroCopy: { flex: 1, gap: 7 },
  heroSubtitle: { color: '#9CA8A2', fontSize: 12 },
  heroTitle: { color: '#F5F7F6', fontSize: 21, fontWeight: '900' },
  entityAction: { alignSelf: 'flex-start', minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 18, paddingHorizontal: 11, borderWidth: 1, borderColor: '#75817B' },
  entityActionText: { color: '#E9EEEC', fontSize: 10, fontWeight: '800' },
  playLarge: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 24, backgroundColor: '#00D3E5' },
  playLargeText: { color: '#092326', fontWeight: '900' },
  karaokeBadge: { color: '#00D3E5', fontSize: 11, fontWeight: '800' },
  lyrics: { gap: 14, padding: 14, borderRadius: 14, backgroundColor: '#F8FAFC' },
  lyricText: { color: '#334155', fontSize: 14, lineHeight: 24 },
});

