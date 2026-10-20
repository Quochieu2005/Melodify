import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppShell } from '@/components/layout';
import { Artwork, SongRow, useMusic } from '@/components/music';
import { PageHeading, PrimaryButton, ScrollPage, SectionHeading, StateMessage, surfaceStyles } from '@/components/shared';
import { AppIcon } from '@/components/shared/AppIcon';
import { useRemoteData } from '@/hooks/useRemoteData';
import {
  createUserPlaylist, getForYouArtists, getForYouSong, getLibrary, getSavedAuthUser, getVisitorId,
  listFavoriteSongs, listGenres, loginWithPassword, searchCatalog, saveAuthSession,
  type Artist, type Genre, type SearchKind, type SearchResults, type Song,
} from '@/lib/api';
import { getRecentSongs, type RecentSong } from '@/lib/recent-history';

const searchTypes: { id: SearchKind; title: string }[] = [
  { id: 'all', title: 'Tất cả' }, { id: 'song', title: 'Bài hát' }, { id: 'artist', title: 'Nghệ sĩ' },
  { id: 'album', title: 'Album' }, { id: 'playlist', title: 'Playlist' },
];

export function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const [query, setQuery] = useState(initialQuery || '');
  const [type, setType] = useState<SearchKind>('all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async (searchType: SearchKind = type) => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      setResults(await searchCatalog(query, searchType));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tìm kiếm.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialQuery?.trim()) return;
    let active = true;
    void searchCatalog(initialQuery, 'all')
      .then((result) => { if (active) setResults(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Không thể tìm kiếm.'); });
    return () => { active = false; };
  }, [initialQuery]);

  const artists = results?.data.artist ?? [];
  const songs = results?.data.song ?? [];
  const albums = results?.data.album ?? [];
  const playlists = results?.data.playlist ?? [];
  const users = results?.data.user ?? [];
  return (
    <AppShell><ScrollPage>
      <PageHeading title="Tìm kiếm" subtitle="Tìm bài hát, nghệ sĩ, album và playlist." />
      <View style={styles.searchBox}><TextInput accessibilityLabel="Từ khóa tìm kiếm" value={query} onChangeText={setQuery} onSubmitEditing={() => void runSearch()} returnKeyType="search" placeholder="Nhập từ khóa…" placeholderTextColor="#8F9994" style={styles.input} /><Pressable onPress={() => void runSearch()} style={styles.searchButton}><Text style={styles.searchButtonText}>Tìm</Text></Pressable></View>
      <View style={styles.pills}>{searchTypes.map((item) => <Pressable key={item.id} onPress={() => { setType(item.id); if (query.trim()) void runSearch(item.id); }} style={[styles.pill, type === item.id && styles.pillActive]}><Text style={[styles.pillText, type === item.id && styles.pillTextActive]}>{item.title}</Text></Pressable>)}</View>
      {loading || error ? <StateMessage loading={loading} error={error} /> : null}
      {results ? (
        <>
          {songs.length ? <View style={styles.section}><SectionHeading title="Bài hát" />{songs.map((song) => <SongRow key={song.id} song={song} songs={songs} showFavorite />)}</View> : null}
          {artists.length ? <View style={styles.section}><SectionHeading title="Nghệ sĩ" />{artists.map((artist) => <Pressable key={artist.id} onPress={() => router.push(('/artist/' + (artist.slug || artist.id)) as never)} style={styles.entityRow}><Artwork uri={artist.avatar_url} round /><Text style={styles.entityName}>{artist.name}</Text><AppIcon name="chevron" color="#00D3E5" size={18} /></Pressable>)}</View> : null}
          {albums.length ? <EntityResults title="Album" items={albums.map((item) => ({ id: item.id, name: item.title, image: item.cover_url, route: '/album/' + (item.slug || item.id) }))} /> : null}
          {playlists.length ? <EntityResults title="Playlist" items={playlists.map((item) => ({ id: item.id, name: item.name, image: item.cover_url, route: '/playlist/' + (item.slug || item.id) }))} /> : null}
          {users.length ? <EntityResults title="Người dùng" items={users.map((item) => ({ id: item.id, name: item.name, image: item.avatar_url, route: '/user/' + (item.username || item.id) }))} /> : null}
          {!songs.length && !artists.length && !albums.length && !playlists.length && !users.length ? <StateMessage empty="Không tìm thấy kết quả phù hợp." /> : null}
        </>
      ) : null}
    </ScrollPage></AppShell>
  );
}

function EntityResults({ title, items }: { title: string; items: { id: string; name: string; image: string | null; route: string }[] }) {
  const router = useRouter();
  return <View style={styles.section}><SectionHeading title={title} />{items.map((item) => <Pressable key={item.id} onPress={() => router.push(item.route as never)} style={styles.entityRow}><Artwork uri={item.image} /><Text style={styles.entityName}>{item.name}</Text><AppIcon name="chevron" color="#00D3E5" size={18} /></Pressable>)}</View>;
}

export function FavoritesScreen() {
  const { data, loading, error, reload } = useRemoteData(async () => {
    const visitorId = await getVisitorId();
    return (await listFavoriteSongs(visitorId)).data;
  });
  return <AppShell><ScrollPage><PageHeading title="Bài hát yêu thích" subtitle={data ? data.length + ' bài hát' : undefined} />
    {loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}
    {data?.length ? data.map((song) => <SongRow key={song.id} song={song} songs={data} showFavorite />) : null}
    {data && !data.length ? <StateMessage empty="Bạn chưa có bài hát yêu thích." /> : null}
  </ScrollPage></AppShell>;
}

export function RecentScreen() {
  const [songs, setSongs] = useState<RecentSong[] | null>(null);
  const [error, setError] = useState('');
  const reload = () => getRecentSongs().then(setSongs).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Không thể tải lịch sử.'));
  useEffect(() => { void reload(); }, []);
  return <AppShell><ScrollPage><PageHeading title="Nghe gần đây" subtitle="Lịch sử nghe được lưu trên thiết bị này." />
    {songs === null || error ? <StateMessage loading={songs === null && !error} error={error} onRetry={() => void reload()} /> : null}
    {songs?.length ? songs.map((song) => <SongRow key={song.id} song={song as Song} songs={songs as Song[]} />) : null}
    {songs && !songs.length ? <StateMessage empty="Bạn chưa nghe bài hát nào trên thiết bị này." /> : null}
  </ScrollPage></AppShell>;
}

export function LibraryScreen() {
  const router = useRouter();
  const [user, setUser] = useState<Awaited<ReturnType<typeof getSavedAuthUser>>>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState('');
  useEffect(() => { void getSavedAuthUser().then(setUser); }, []);
  const { data, loading, error, reload } = useRemoteData(async () => (await getLibrary(await getVisitorId())).data);
  const createPlaylist = async () => {
    if (!user) {
      router.push('/login' as never);
      return;
    }
    if (!playlistName.trim() || savingPlaylist) return;
    setSavingPlaylist(true);
    setPlaylistError('');
    try {
      await createUserPlaylist(playlistName.trim());
      setPlaylistName('');
      await reload();
    } catch (reason) {
      setPlaylistError(reason instanceof Error ? reason.message : 'Không thể tạo playlist.');
    } finally {
      setSavingPlaylist(false);
    }
  };
  return <AppShell><ScrollPage><PageHeading title="Thư viện" subtitle={user ? 'Xin chào, ' + user.name : 'Tập hợp nhạc và nghệ sĩ bạn đã lưu.'} />
    <View style={styles.shortcuts}>
      <Shortcut title="Bài hát yêu thích" count={data?.favorite_song_count} onPress={() => router.push('/favorite' as never)} />
      <Shortcut title="Nghe gần đây" onPress={() => router.push('/recent' as never)} />
      <Shortcut title="Playlist của bạn" onPress={() => router.push('/playlist' as never)} />
      <Shortcut title="Đang theo dõi" count={data?.following_count} onPress={() => router.push('/following' as never)} />
      <Shortcut title="Người theo dõi" count={data?.followers_count} onPress={() => router.push('/followers' as never)} />
      {!user ? <Shortcut title="Đăng nhập" detail="Đăng nhập để đồng bộ thư viện" onPress={() => router.push('/login' as never)} /> : null}
    </View>
    {loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}
    {user ? <View style={styles.section}><SectionHeading title="Playlist của bạn" /><View style={styles.createPlaylist}><TextInput value={playlistName} onChangeText={setPlaylistName} placeholder="Tên playlist mới" placeholderTextColor="#8F9994" style={styles.playlistInput} /><Pressable disabled={savingPlaylist} onPress={() => void createPlaylist()} style={styles.createButton}><Text style={styles.createText}>{savingPlaylist ? '…' : '+'}</Text></Pressable></View>{playlistError ? <Text style={styles.error}>{playlistError}</Text> : null}{data?.created_playlists.map((playlist) => <Pressable key={playlist.id} onPress={() => router.push(('/playlist/' + (playlist.slug || playlist.id)) as never)} style={styles.entityRow}><Artwork uri={playlist.cover_url} /><Text style={styles.entityName}>{playlist.name}</Text><AppIcon name="chevron" color="#00D3E5" size={18} /></Pressable>)}{data && !data.created_playlists.length ? <Text style={styles.detail}>Bạn chưa tạo playlist nào.</Text> : null}</View> : null}
    {data?.favorite_playlists.length ? <View style={styles.section}><SectionHeading title="Playlist yêu thích" />{data.favorite_playlists.map((playlist) => <Pressable key={playlist.id} onPress={() => router.push(('/playlist/' + (playlist.slug || playlist.id)) as never)} style={styles.entityRow}><Artwork uri={playlist.cover_url} /><Text style={styles.entityName}>{playlist.name}</Text><AppIcon name="chevron" color="#00D3E5" size={18} /></Pressable>)}</View> : null}
    {data?.following_artists.length ? <View style={styles.section}><SectionHeading title="Nghệ sĩ đang theo dõi" />{data.following_artists.map((artist) => <Pressable key={artist.id} onPress={() => router.push(('/artist/' + (artist.slug || artist.id)) as never)} style={styles.entityRow}><Artwork uri={artist.avatar_url} round /><Text style={styles.entityName}>{artist.name}</Text><AppIcon name="chevron" color="#00D3E5" size={18} /></Pressable>)}</View> : null}
    {data?.favorite_albums.length ? <View style={styles.section}><SectionHeading title="Album yêu thích" />{data.favorite_albums.map((album) => <Pressable key={album.id} onPress={() => router.push(('/album/' + (album.slug || album.id)) as never)} style={styles.entityRow}><Artwork uri={album.cover_url} /><Text style={styles.entityName}>{album.title}</Text><AppIcon name="chevron" color="#00D3E5" size={18} /></Pressable>)}</View> : null}
    {data && !data.following_artists.length && !data.favorite_albums.length && data.favorite_song_count === 0 ? <StateMessage empty="Thư viện của bạn chưa có nội dung đã lưu." /> : null}
  </ScrollPage></AppShell>;
}

function Shortcut({ title, count, detail, onPress }: { title: string; count?: number; detail?: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.shortcut, surfaceStyles.card]}><View style={styles.shortcutCopy}><Text style={styles.shortcutTitle}>{title}</Text>{detail ? <Text style={styles.detail}>{detail}</Text> : null}</View>{count !== undefined ? <Text style={styles.count}>{count}</Text> : <AppIcon name="chevron" color="#00D3E5" size={18} />}</Pressable>;
}

export function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const signIn = async () => {
    if (!identifier.trim() || !password) {
      setError('Nhập email/tên đăng nhập và mật khẩu.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const auth = await loginWithPassword(identifier.trim(), password);
      await saveAuthSession(auth);
      setSuccess('Đăng nhập thành công.');
      router.replace('/me' as never);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };
  return <AppShell><ScrollPage><PageHeading title="Đăng nhập" subtitle="Đăng nhập để đồng bộ thư viện và tài khoản." />
    <View style={styles.form}>
      <TextInput autoCapitalize="none" autoComplete="username" value={identifier} onChangeText={setIdentifier} placeholder="Email hoặc tên đăng nhập" placeholderTextColor="#8F9994" style={styles.field} />
      <TextInput autoCapitalize="none" autoComplete="password" secureTextEntry value={password} onChangeText={setPassword} placeholder="Mật khẩu" placeholderTextColor="#8F9994" style={styles.field} onSubmitEditing={() => void signIn()} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <PrimaryButton disabled={loading} label={loading ? 'Đang đăng nhập…' : 'Đăng nhập'} onPress={() => void signIn()} />
    </View>
  </ScrollPage></AppShell>;
}

function GenreCard({ genre, selected, onPress }: { genre: Genre; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><Text style={[styles.choiceTitle, selected && styles.choiceTitleSelected]}>{genre.name}</Text><Text style={styles.choiceMeta}>{genre.song_count} bài hát</Text>{selected ? <Text style={styles.check}>✓</Text> : null}</Pressable>;
}

function ArtistPick({ artist, selected, onPress }: { artist: Artist; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.artistPick, selected && styles.choiceSelected]}><Artwork uri={artist.avatar_url} size={58} round /><Text numberOfLines={1} style={styles.artistPickName}>{artist.name}</Text>{selected ? <Text style={styles.check}>✓</Text> : null}</Pressable>;
}

export function ForYouScreen() {
  const router = useRouter();
  const { track, isPlaying, playSong, togglePlay } = useMusic();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState<Song | null>(null);

  useEffect(() => {
    void listGenres({ perPage: 100 }).then((result) => setGenres(result.data)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Không thể tải thể loại.')).finally(() => setLoading(false));
  }, []);

  const selectedGenreSet = useMemo(() => new Set(selectedGenres), [selectedGenres]);
  const selectedArtistSet = useMemo(() => new Set(selectedArtists), [selectedArtists]);

  const toggleValue = (value: string, selected: string[], setSelected: (values: string[]) => void) => {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  const nextFromGenres = async () => {
    if (!selectedGenres.length) {
      setError('Chọn ít nhất một thể loại trước.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await getForYouArtists(selectedGenres);
      setArtists(result.data);
      setSelectedArtists([]);
      setStep(2);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách nghệ sĩ.');
    } finally {
      setLoading(false);
    }
  };

  const findSong = async () => {
    if (selectedArtists.length < 3) {
      setError('Hãy chọn ít nhất 3 nghệ sĩ.');
      return;
    }
    setStep(3);
    setSaving(true);
    setError('');
    try {
      const result = await getForYouSong(selectedGenres, selectedArtists);
      setRecommendation(result.data);
      if (result.data) await playSong(result.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tạo gợi ý lúc này.');
    } finally {
      setSaving(false);
    }
  };

  const closeFlow = async () => {
    if (track) {
      if (!isPlaying) togglePlay();
    } else {
      try {
        const recent = await getRecentSongs();
        if (recent[0]) await playSong(recent[0] as Song);
      } catch {
        // Leave playback empty when no saved recent song exists.
      }
    }
    router.replace('/home');
  };

  return <AppShell><ScrollPage>
    <PageHeading title="Dành cho bạn" subtitle="Chọn sở thích để tạo gợi ý âm nhạc từ danh mục thật." />
    <View style={styles.stepHeader}><Text style={styles.stepLabel}>BƯỚC {step} / 3</Text><Pressable onPress={() => void closeFlow()}><Text style={styles.closeText}>Đóng ×</Text></Pressable></View>
    {loading && step === 1 ? <StateMessage loading /> : null}
    {error ? <StateMessage error={error} /> : null}
    {step === 1 && !loading ? <>
      <SectionHeading title="Chọn thể loại yêu thích" />
      <View style={styles.choiceGrid}>{genres.map((genre) => <GenreCard key={genre.id} genre={genre} selected={selectedGenreSet.has(genre.id)} onPress={() => toggleValue(genre.id, selectedGenres, setSelectedGenres)} />)}</View>
      {!genres.length ? <StateMessage empty="Chưa có thể loại trong danh mục." /> : <PrimaryButton label="Tiếp tục chọn nghệ sĩ" onPress={() => void nextFromGenres()} />}
    </> : null}
    {step === 2 ? <>
      <SectionHeading title="Chọn nghệ sĩ yêu thích" />
      <Text style={styles.help}>Chọn ít nhất 3 nghệ sĩ phù hợp với thể loại bạn đã chọn.</Text>
      <View style={styles.artistGrid}>{artists.map((artist) => <ArtistPick key={artist.id} artist={artist} selected={selectedArtistSet.has(artist.id)} onPress={() => toggleValue(artist.id, selectedArtists, setSelectedArtists)} />)}</View>
      {artists.length < 3 ? <Text style={styles.help}>Danh mục này hiện có {artists.length} nghệ sĩ phù hợp. Hãy quay lại chọn thêm thể loại để có đủ 3 nghệ sĩ.</Text> : null}
      {!artists.length ? <StateMessage empty="Không có nghệ sĩ phù hợp với thể loại đã chọn." /> : null}
      <View style={styles.buttons}><Pressable onPress={() => setStep(1)} style={styles.secondaryButton}><Text style={styles.secondaryText}>{artists.length < 3 ? 'Chọn thêm thể loại' : 'Quay lại'}</Text></Pressable><View style={styles.flex}><PrimaryButton disabled={artists.length < 3 || selectedArtists.length < 3} label="Tìm nhạc cho tôi" onPress={() => void findSong()} /></View></View>
    </> : null}
    {step === 3 ? <>
      <View style={styles.recommendationBox}>
        <Text style={styles.recommendationTitle}>{saving ? 'Đang tìm nhạc cho bạn…' : recommendation ? 'Bắt đầu phát gợi ý của bạn' : 'Chưa tìm được bài phù hợp'}</Text>
        {saving ? <Text style={styles.recommendationSub}>Đang chọn ngẫu nhiên bài hát theo thể loại và nghệ sĩ bạn chọn.</Text> : null}
        {recommendation ? <View style={styles.recommendationSong}><Artwork uri={recommendation.cover_url} size={76} /><View style={styles.chartCopy}><Text style={styles.songTitle}>{recommendation.title}</Text><Text style={styles.detail}>{recommendation.artists?.map((artist) => artist.name).join(', ') || recommendation.artist?.name}</Text><Text style={styles.success}>Đang phát tự động</Text></View></View> : null}
      {!saving && !recommendation ? <Text style={styles.recommendationSub}>Không có bài hát nào khớp với lựa chọn. Thử chọn thêm thể loại hoặc nghệ sĩ.</Text> : null}
      </View>
      <View style={styles.buttons}><Pressable onPress={() => setStep(2)} style={styles.secondaryButton}><Text style={styles.secondaryText}>Đổi nghệ sĩ</Text></Pressable><View style={styles.flex}><PrimaryButton label={saving ? 'Đang tìm…' : 'Tìm bài khác'} disabled={saving} onPress={() => void findSong()} /></View></View>
    </> : null}
  </ScrollPage></AppShell>;
}

const styles = StyleSheet.create({
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderRadius: 13, paddingLeft: 14, backgroundColor: '#29332F', borderWidth: 1, borderColor: '#35403C' },
  input: { flex: 1, color: '#F5F7F6', paddingVertical: 12, fontSize: 14 },
  searchButton: { margin: 4, minWidth: 55, height: 39, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00D3E5' },
  searchButtonText: { color: '#082326', fontWeight: '900' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 18, backgroundColor: '#202A28', borderWidth: 1, borderColor: '#35403C' },
  pillActive: { backgroundColor: 'rgba(0,211,229,0.16)', borderColor: '#00D3E5' },
  pillText: { color: '#AEB8B3', fontSize: 11, fontWeight: '700' },
  pillTextActive: { color: '#00D3E5' },
  section: { gap: 7 },
  entityRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  entityName: { flex: 1, color: '#F5F7F6', fontSize: 14, fontWeight: '800' },
  createPlaylist: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  playlistInput: { flex: 1, minHeight: 42, paddingHorizontal: 12, color: '#F5F7F6', borderRadius: 11, backgroundColor: '#202A28', borderWidth: 1, borderColor: '#35403C' },
  createButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#00D3E5' },
  createText: { color: '#082326', fontSize: 24, fontWeight: '900' },
  shortcuts: { gap: 9 },
  shortcut: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  shortcutCopy: { flex: 1, gap: 4 },
  shortcutTitle: { color: '#F5F7F6', fontSize: 14, fontWeight: '800' },
  detail: { color: '#9CA8A2', fontSize: 12 },
  count: { color: '#00D3E5', fontWeight: '900' },
  form: { gap: 13, padding: 15, borderRadius: 15, backgroundColor: '#202A28' },
  field: { minHeight: 48, paddingHorizontal: 13, borderRadius: 11, color: '#F5F7F6', backgroundColor: '#151817', borderWidth: 1, borderColor: '#35403C' },
  error: { color: '#FF8A80', fontSize: 12 },
  success: { color: '#54DDA5', fontSize: 12, fontWeight: '800' },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepLabel: { color: '#00D3E5', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  closeText: { color: '#AEB8B3', fontSize: 13, fontWeight: '800' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  choice: { width: '48%', minHeight: 78, justifyContent: 'center', gap: 5, padding: 12, borderRadius: 13, backgroundColor: '#202A28', borderWidth: 1, borderColor: '#35403C' },
  choiceSelected: { borderColor: '#00D3E5', backgroundColor: '#213738' },
  choiceTitle: { color: '#F5F7F6', fontSize: 14, fontWeight: '900' },
  choiceTitleSelected: { color: '#00D3E5' },
  choiceMeta: { color: '#9CA8A2', fontSize: 10 },
  check: { position: 'absolute', top: 8, right: 9, color: '#00D3E5', fontSize: 15, fontWeight: '900' },
  help: { color: '#AEB8B3', fontSize: 12 },
  artistGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  artistPick: { width: '30.5%', minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, borderRadius: 13, backgroundColor: '#202A28', borderWidth: 1, borderColor: '#35403C' },
  artistPickName: { color: '#EDF1EF', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: '#64716B' },
  secondaryText: { color: '#E7ECE9', fontSize: 12, fontWeight: '800' },
  recommendationBox: { minHeight: 190, justifyContent: 'center', gap: 16, padding: 18, borderRadius: 17, backgroundColor: '#202A28', borderWidth: 1, borderColor: '#35403C' },
  recommendationTitle: { color: '#F5F7F6', fontSize: 21, fontWeight: '900', textAlign: 'center' },
  recommendationSub: { color: '#AEB8B3', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  recommendationSong: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  chartCopy: { flex: 1, gap: 5 },
  songTitle: { color: '#F5F7F6', fontSize: 15, fontWeight: '900' },
});
