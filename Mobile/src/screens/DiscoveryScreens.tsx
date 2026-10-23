import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppShell } from "@/components/layout";
import { Artwork, SongRow, useMusicControls } from "@/components/music";
import {
  PageHeading,
  PrimaryButton,
  ScrollPage,
  SectionHeading,
  StateMessage,
  useSurfaceStyles,
} from "@/components/shared";
import { AppIcon } from "@/components/shared/AppIcon";
import { useRemoteData } from "@/hooks/useRemoteData";
import {
  API_URL,
  clearAuthSession,
  createUserPlaylist,
  getForYouArtists,
  getForYouSong,
  getLibrary,
  getSavedAuthUser,
  getVisitorId,
  listFavoriteSongs,
  listGenres,
  loginWithPassword,
  registerWithPassword,
  requestPhoneLoginOtp,
  searchCatalog,
  saveAuthSession,
  verifyPhoneLoginOtp,
  type Artist,
  type Genre,
  type SearchKind,
  type SearchResults,
  type Song,
} from "@/lib/api";
import {
  getRecentEntities,
  getRecentSongs,
  type RecentEntity,
  type RecentSong,
} from "@/lib/recent-history";
import { useAdaptiveStyles } from "@/hooks/use-adaptive-styles";
import { useTheme, useThemeMode } from "@/hooks/use-theme";
import { signInWithNativeProvider } from "@/lib/native-social-login";


const searchTypes: { id: SearchKind; title: string }[] = [
  { id: "all", title: "Tất cả" },
  { id: "song", title: "Bài hát" },
  { id: "artist", title: "Nghệ sĩ" },
  { id: "album", title: "Album" },
  { id: "playlist", title: "Playlist" },
];

export function SearchScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const [query, setQuery] = useState(initialQuery || "");
  const [type, setType] = useState<SearchKind>("all");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSearch = async (searchType: SearchKind = type) => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResults(await searchCatalog(query, searchType));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tìm kiếm.",
      );
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialQuery?.trim()) return;
    let active = true;
    void searchCatalog(initialQuery, "all")
      .then((result) => {
        if (active) setResults(result);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Không thể tìm kiếm.",
          );
      });
    return () => {
      active = false;
    };
  }, [initialQuery]);

  const artists = results?.data.artist ?? [];
  const songs = results?.data.song ?? [];
  const albums = results?.data.album ?? [];
  const playlists = results?.data.playlist ?? [];
  const users = results?.data.user ?? [];
  return (
    <AppShell>
      <ScrollPage>
        <PageHeading
          title="Tìm kiếm"
          subtitle="Tìm bài hát, nghệ sĩ, album và playlist."
        />
        <View style={styles.searchBox}>
          <TextInput
            accessibilityLabel="Từ khóa tìm kiếm"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void runSearch()}
            returnKeyType="search"
            placeholder="Nhập từ khóa…"
            placeholderTextColor="#8F9994"
            style={styles.input}
          />
          <Pressable
            onPress={() => void runSearch()}
            style={styles.searchButton}
          >
            <Text style={styles.searchButtonText}>Tìm</Text>
          </Pressable>
        </View>
        <View style={styles.pills}>
          {searchTypes.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setType(item.id);
                if (query.trim()) void runSearch(item.id);
              }}
              style={[styles.pill, type === item.id && styles.pillActive]}
            >
              <Text
                style={[
                  styles.pillText,
                  type === item.id && styles.pillTextActive,
                ]}
              >
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>
        {loading || error ? (
          <StateMessage loading={loading} error={error} />
        ) : null}
        {results ? (
          <>
            {songs.length ? (
              <View style={styles.section}>
                <SectionHeading title="Bài hát" />
                {songs.map((song) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    songs={songs}
                    showFavorite
                  />
                ))}
              </View>
            ) : null}
            {artists.length ? (
              <View style={styles.section}>
                <SectionHeading title="Nghệ sĩ" />
                {artists.map((artist) => (
                  <Pressable
                    key={artist.id}
                    onPress={() =>
                      router.push(
                        ("/artist/" + (artist.slug || artist.id)) as never,
                      )
                    }
                    style={styles.entityRow}
                  >
                    <Artwork uri={artist.avatar_url} round />
                    <Text style={styles.entityName}>{artist.name}</Text>
                    <AppIcon name="chevron" color={theme.primary} size={18} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            {albums.length ? (
              <EntityResults
                title="Album"
                items={albums.map((item) => ({
                  id: item.id,
                  name: item.title,
                  image: item.cover_url,
                  route: "/album/" + (item.slug || item.id),
                }))}
              />
            ) : null}
            {playlists.length ? (
              <EntityResults
                title="Playlist"
                items={playlists.map((item) => ({
                  id: item.id,
                  name: item.name,
                  image: item.cover_url,
                  route: "/playlist/" + (item.slug || item.id),
                }))}
              />
            ) : null}
            {users.length ? (
              <EntityResults
                title="Người dùng"
                items={users.map((item) => ({
                  id: item.id,
                  name: item.name,
                  image: item.avatar_url,
                  route: "/user/" + (item.username || item.id),
                }))}
              />
            ) : null}
            {!songs.length &&
            !artists.length &&
            !albums.length &&
            !playlists.length &&
            !users.length ? (
              <StateMessage empty="Không tìm thấy kết quả phù hợp." />
            ) : null}
          </>
        ) : null}
      </ScrollPage>
    </AppShell>
  );
}

function EntityResults({
  title,
  items,
}: {
  title: string;
  items: { id: string; name: string; image: string | null; route: string }[];
}) {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={styles.section}>
      <SectionHeading title={title} />
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => router.push(item.route as never)}
          style={styles.entityRow}
        >
          <Artwork uri={item.image} />
          <Text style={styles.entityName}>{item.name}</Text>
          <AppIcon name="chevron" color={theme.primary} size={18} />
        </Pressable>
      ))}
    </View>
  );
}

export function FavoritesScreen() {
  const { data, loading, error, reload } = useRemoteData(async () => {
    const visitorId = await getVisitorId();
    return (await listFavoriteSongs(visitorId)).data;
  });
  return (
    <AppShell>
      <ScrollPage>
        <PageHeading
          title="Bài hát yêu thích"
          subtitle={data ? data.length + " bài hát" : undefined}
        />
        {loading || error ? (
          <StateMessage
            loading={loading}
            error={error}
            onRetry={() => void reload()}
          />
        ) : null}
        {data?.length
          ? data.map((song) => (
              <SongRow key={song.id} song={song} songs={data} showFavorite />
            ))
          : null}
        {data && !data.length ? (
          <StateMessage empty="Bạn chưa có bài hát yêu thích." />
        ) : null}
      </ScrollPage>
    </AppShell>
  );
}

export function RecentScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  const router = useRouter();
  const { playSong } = useMusicControls();
  const [songs, setSongs] = useState<RecentSong[] | null>(null);
  const [entities, setEntities] = useState<RecentEntity[] | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "song" | "playlist" | "album" | "artist" | "radio"
  >("song");
  const reload = async () => {
    try {
      const [recentSongs, recentEntities] = await Promise.all([
        getRecentSongs(),
        getRecentEntities(),
      ]);
      setError("");
      setSongs(recentSongs);
      setEntities(recentEntities);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tải lịch sử.",
      );
    }
  };
  useEffect(() => {
    let active = true;
    void Promise.all([getRecentSongs(), getRecentEntities()])
      .then(([recentSongs, recentEntities]) => {
        if (!active) return;
        setSongs(recentSongs);
        setEntities(recentEntities);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Không thể tải lịch sử.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const recentAlbums = Array.from(
    new Map(
      [
        ...(entities ?? []).filter((item) => item.kind === "album"),
        ...(songs ?? [])
          .filter((song) => song.album)
          .map((song) => ({
            kind: "album" as const,
            id: song.album!.id,
            slug: song.album!.id,
            name: song.album!.title,
            image: song.cover_url ?? null,
          })),
      ].map((item) => [item.id, item]),
    ).values(),
  );
  const songArtists = (songs ?? []).flatMap((song) => {
    const artists = song.artists?.length
      ? song.artists
      : song.artist
        ? [{ id: song.artist.id, name: song.artist.name }]
        : [];
    return artists.map((artist) => {
      const id = artist.id || artist.name;
      return {
        kind: "artist" as const,
        id,
        slug: artist.slug || artist.id || id,
        name: artist.name,
        image: artist.avatar_url ?? song.cover_url ?? null,
      };
    });
  });
  const recentArtists = Array.from(
    new Map(
      [
        ...(entities ?? []).filter((item) => item.kind === "artist"),
        ...songArtists,
      ].map((item) => [item.id, item]),
    ).values(),
  );
  const recentTabs = [
    { id: "song", label: "Bài hát" },
    { id: "playlist", label: "Playlist" },
    { id: "album", label: "Album" },
    { id: "artist", label: "Nghệ sĩ" },
    { id: "radio", label: "Radio" },
  ] as const;
  return (
    <AppShell>
      <ScrollPage>
        <PageHeading title="Nghe Gần Đây" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentTabs}
        >
          {recentTabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={styles.recentTabWrap}
            >
              <Text
                style={[
                  styles.recentTab,
                  activeTab === tab.id && styles.recentTabActive,
                ]}
              >
                {tab.label}
              </Text>
              {activeTab === tab.id ? (
                <View style={styles.recentTabIndicator} />
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          style={styles.playAllRow}
          disabled={!songs?.length}
          onPress={() =>
            songs?.[0] && void playSong(songs[0] as Song, songs as Song[])
          }
        >
          <View style={styles.playAllCircle}>
            <AppIcon name="play" color={theme.primaryOn} size={17} />
          </View>
          <Text style={styles.playAllText}>Tất cả</Text>
          <View style={{ flex: 1 }} />
          <AppIcon name="menu" color={theme.textMuted} size={21} />
        </Pressable>
        {songs === null || entities === null || error ? (
          <StateMessage
            loading={(songs === null || entities === null) && !error}
            error={error}
            onRetry={() => void reload()}
          />
        ) : null}
        {activeTab === "song" && songs?.length
          ? songs.map((song) => (
              <SongRow
                key={song.id}
                song={song as Song}
                songs={songs as Song[]}
              />
            ))
          : null}
        {activeTab === "album"
          ? recentAlbums.map((album) => (
              <Pressable
                key={album.id}
                onPress={() => router.push(("/album/" + album.id) as never)}
                style={styles.entityRow}
              >
                <Artwork uri={album.image} />
                <Text style={styles.entityName}>{album.name}</Text>
                <AppIcon name="chevron" color={theme.primary} size={18} />
              </Pressable>
            ))
          : null}
        {activeTab === "artist"
          ? recentArtists.map((artist) => (
              <Pressable
                key={artist.id}
                onPress={() =>
                  router.push(
                    ("/artist/" + (artist.slug || artist.id)) as never,
                  )
                }
                style={styles.entityRow}
              >
                <Artwork uri={artist.image} round />
                <Text style={styles.entityName}>{artist.name}</Text>
                <AppIcon name="chevron" color={theme.primary} size={18} />
              </Pressable>
            ))
          : null}
        {activeTab === "song" && songs && !songs.length ? (
          <StateMessage empty="Bạn chưa nghe bài hát nào trên thiết bị này." />
        ) : null}
        {activeTab === "album" && songs && entities && !recentAlbums.length ? (
          <StateMessage empty="Album đã xem hoặc nghe gần đây sẽ xuất hiện tại đây." />
        ) : null}
        {activeTab === "artist" &&
        songs &&
        entities &&
        !recentArtists.length ? (
          <StateMessage empty="Nghệ sĩ đã xem hoặc nghe gần đây sẽ xuất hiện tại đây." />
        ) : null}
        {activeTab === "playlist" &&
        entities?.filter((item) => item.kind === "playlist").length
          ? entities
              .filter((item) => item.kind === "playlist")
              .map((playlist) => (
                <Pressable
                  key={playlist.id}
                  onPress={() =>
                    router.push(
                      ("/playlist/" + (playlist.slug || playlist.id)) as never,
                    )
                  }
                  style={styles.entityRow}
                >
                  <Artwork uri={playlist.image} />
                  <Text style={styles.entityName}>{playlist.name}</Text>
                  <AppIcon name="chevron" color={theme.primary} size={18} />
                </Pressable>
              ))
          : null}
        {activeTab === "playlist" &&
        entities &&
        !entities.some((item) => item.kind === "playlist") ? (
          <StateMessage empty="Playlist đã xem sẽ xuất hiện tại đây." />
        ) : null}
        {activeTab === "radio" ? (
          <StateMessage empty="Ứng dụng hiện chưa có API Radio/lịch sử Radio." />
        ) : null}
      </ScrollPage>
    </AppShell>
  );
}

export function LibraryScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const router = useRouter();
  const [user, setUser] =
    useState<Awaited<ReturnType<typeof getSavedAuthUser>>>(null);
  const [playlistName, setPlaylistName] = useState("");
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState("");
  useEffect(() => {
    void getSavedAuthUser().then(setUser);
  }, []);
  const { data, loading, error, reload } = useRemoteData(
    async () => (await getLibrary(await getVisitorId())).data,
  );
  const createPlaylist = async () => {
    if (!user) {
      router.push("/login" as never);
      return;
    }
    if (!playlistName.trim() || savingPlaylist) return;
    setSavingPlaylist(true);
    setPlaylistError("");
    try {
      await createUserPlaylist(playlistName.trim());
      setPlaylistName("");
      await reload();
    } catch (reason) {
      setPlaylistError(
        reason instanceof Error ? reason.message : "Không thể tạo playlist.",
      );
    } finally {
      setSavingPlaylist(false);
    }
  };
  const logout = async () => {
    await clearAuthSession();
    setUser(null);
    await reload();
  };
  return (
    <AppShell>
      <ScrollPage>
        <PageHeading
          title="Thư viện"
          subtitle={
            user
              ? `Xin chào, ${user.name} • ${user.is_premium ? "👑 VIP" : "Miễn phí"}`
              : "Tập hợp nhạc và nghệ sĩ bạn đã lưu."
          }
        />
        <View style={styles.shortcuts}>
          <Shortcut
            title="Gói VIP Melodify"
            detail={
              user?.is_premium
                ? "Tài khoản VIP đang hoạt động"
                : "Nâng cấp nghe nhạc không giới hạn, không quảng cáo"
            }
            onPress={() => router.push("/vip" as never)}
          />
          <Shortcut
            title="Bài hát yêu thích"
            count={data?.favorite_song_count}
            onPress={() => router.push("/favorite" as never)}
          />
          <Shortcut
            title="Nghe gần đây"
            onPress={() => router.push("/recent" as never)}
          />
          <Shortcut
            title="Playlist của bạn"
            onPress={() => router.push("/playlist" as never)}
          />
          <Shortcut
            title="Đang theo dõi"
            count={data?.following_count}
            onPress={() => router.push("/following" as never)}
          />
          <Shortcut
            title="Người theo dõi"
            count={data?.followers_count}
            onPress={() => router.push("/followers" as never)}
          />
          {!user ? (
            <Shortcut
              title="Đăng nhập"
              detail="Đăng nhập để đồng bộ thư viện"
              onPress={() => router.push("/login" as never)}
            />
          ) : (
            <Pressable
              onPress={() => void logout()}
              style={styles.logoutButton}
            >
              <AppIcon name="logout" color="#FF8A80" size={17} />
              <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
            </Pressable>
          )}
        </View>
        {loading || error ? (
          <StateMessage
            loading={loading}
            error={error}
            onRetry={() => void reload()}
          />
        ) : null}
        {user ? (
          <View style={styles.section}>
            <SectionHeading title="Playlist của bạn" />
            <View style={styles.createPlaylist}>
              <TextInput
                value={playlistName}
                onChangeText={setPlaylistName}
                placeholder="Tên playlist mới"
                placeholderTextColor="#8F9994"
                style={styles.playlistInput}
              />
              <Pressable
                disabled={savingPlaylist}
                onPress={() => void createPlaylist()}
                style={styles.createButton}
              >
                <Text style={styles.createText}>
                  {savingPlaylist ? "…" : "+"}
                </Text>
              </Pressable>
            </View>
            {playlistError ? (
              <Text style={styles.error}>{playlistError}</Text>
            ) : null}
            {data?.created_playlists.map((playlist) => (
              <Pressable
                key={playlist.id}
                onPress={() =>
                  router.push(
                    ("/playlist/" + (playlist.slug || playlist.id)) as never,
                  )
                }
                style={styles.entityRow}
              >
                <Artwork uri={playlist.cover_url} />
                <Text style={styles.entityName}>{playlist.name}</Text>
                <AppIcon name="chevron" color="#00B5AD" size={18} />
              </Pressable>
            ))}
            {data && !data.created_playlists.length ? (
              <Text style={styles.detail}>Bạn chưa tạo playlist nào.</Text>
            ) : null}
          </View>
        ) : null}
        {data?.favorite_playlists.length ? (
          <View style={styles.section}>
            <SectionHeading title="Playlist yêu thích" />
            {data.favorite_playlists.map((playlist) => (
              <Pressable
                key={playlist.id}
                onPress={() =>
                  router.push(
                    ("/playlist/" + (playlist.slug || playlist.id)) as never,
                  )
                }
                style={styles.entityRow}
              >
                <Artwork uri={playlist.cover_url} />
                <Text style={styles.entityName}>{playlist.name}</Text>
                <AppIcon name="chevron" color="#00B5AD" size={18} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {data?.following_artists.length ? (
          <View style={styles.section}>
            <SectionHeading title="Nghệ sĩ đang theo dõi" />
            {data.following_artists.map((artist) => (
              <Pressable
                key={artist.id}
                onPress={() =>
                  router.push(
                    ("/artist/" + (artist.slug || artist.id)) as never,
                  )
                }
                style={styles.entityRow}
              >
                <Artwork uri={artist.avatar_url} round />
                <Text style={styles.entityName}>{artist.name}</Text>
                <AppIcon name="chevron" color="#00B5AD" size={18} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {data?.favorite_albums.length ? (
          <View style={styles.section}>
            <SectionHeading title="Album yêu thích" />
            {data.favorite_albums.map((album) => (
              <Pressable
                key={album.id}
                onPress={() =>
                  router.push(("/album/" + (album.slug || album.id)) as never)
                }
                style={styles.entityRow}
              >
                <Artwork uri={album.cover_url} />
                <Text style={styles.entityName}>{album.title}</Text>
                <AppIcon name="chevron" color="#00B5AD" size={18} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {data &&
        !data.following_artists.length &&
        !data.favorite_albums.length &&
        data.favorite_song_count === 0 ? (
          <StateMessage empty="Thư viện của bạn chưa có nội dung đã lưu." />
        ) : null}
      </ScrollPage>
    </AppShell>
  );
}

function Shortcut({
  title,
  count,
  detail,
  onPress,
}: {
  title: string;
  count?: number;
  detail?: string;
  onPress: () => void;
}) {
  const styles = useAdaptiveStyles(baseStyles);
  const surface = useSurfaceStyles();
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.shortcut, surface.card]}>
      <View style={styles.shortcutCopy}>
        <Text style={styles.shortcutTitle}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {count !== undefined ? (
        <Text style={styles.count}>{count}</Text>
      ) : (
        <AppIcon name="chevron" color={theme.primary} size={18} />
      )}
    </Pressable>
  );
}

export function LoginScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const mode = useThemeMode();
  const otpInput = useRef<TextInput>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [phoneMode, setPhoneMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [consent, setConsent] = useState(true);

  const finishLogin = async (
    auth: Awaited<ReturnType<typeof verifyPhoneLoginOtp>>,
  ) => {
    await saveAuthSession(auth);
    router.replace("/me" as never);
  };

  const sendOtp = async () => {
    if (!phone.trim()) {
      setError("Nhập số điện thoại để nhận mã xác thực.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await requestPhoneLoginOtp(phone.trim());
      setPhone(result.data.phone);
      setOtpSent(true);
      setSuccess(result.message);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể gửi mã xác thực.",
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!phone.trim() || !otp.trim()) {
      setError("Nhập số điện thoại và mã xác thực.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await finishLogin(await verifyPhoneLoginOtp(phone.trim(), otp.trim()));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Mã xác thực không hợp lệ.",
      );
    } finally {
      setLoading(false);
    }
  };

  const closeLogin = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/me" as never);
  };

  return (
    <AppShell hideHeader hidePlayer hideTabs>
      <LinearGradient
        colors={
          mode === "dark"
            ? ["#070B0C", "#062D2A", "#07110E"]
            : ["#FFFFFF", "#E8FBF8", "#F5FBFA"]
        }
        style={styles.loginScreen}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={insets.top}
          style={styles.loginScreen}
        >
          <ScrollView
            contentContainerStyle={[
              styles.loginScroll,
              { paddingTop: Math.max(insets.top + 8, 28) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.loginTopRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng đăng nhập, quay lại"
                hitSlop={16}
                onPress={closeLogin}
                style={styles.loginClose}
              >
                <AppIcon name="close" color={theme.text} size={22} />
              </Pressable>
            </View>

            <View style={styles.loginBrand}>
              <LinearGradient
                colors={
                  mode === "dark"
                    ? ["#FFFFFF", "#D9F9F5"]
                    : ["#073A3A", "#00B5AD"]
                }
                style={styles.loginLogo}
              >
                <AppIcon
                  name="waveform"
                  color={mode === "dark" ? "#052D2B" : "#FFFFFF"}
                  size={42}
                />
              </LinearGradient>
              <Text style={[styles.loginBrandName, { color: theme.text }]}>
                Melodify
              </Text>
              <Text
                style={[
                  styles.loginBrandCaption,
                  { color: theme.textSecondary },
                ]}
              >
                Mạng xã hội âm nhạc
              </Text>
            </View>

            <View style={styles.loginOptions}>
              <SocialOAuthButton provider="facebook" enabled={consent} />
              <SocialOAuthButton provider="google" enabled={consent} />
              <Text style={[styles.oauthHint, { color: theme.textMuted }]}>
                Bạn sẽ được xác thực an toàn qua Google hoặc Facebook rồi tự
                động quay lại Melodify.
              </Text>
              <Pressable
                onPress={() => {
                  setPhoneMode(true);
                  setError("");
                  setSuccess("");
                }}
                style={[
                  styles.loginOption,
                  {
                    backgroundColor: theme.backgroundCard,
                    borderColor: theme.border,
                  },
                ]}
              >
                <AppIcon name="phone" color={theme.text} size={22} />
                <Text style={[styles.loginOptionText, { color: theme.text }]}>
                  Sử dụng số điện thoại
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setConsent((value) => !value)}
              style={styles.consentRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
            >
              <View
                style={[
                  styles.consentCheckbox,
                  {
                    borderColor: consent ? theme.primary : theme.border,
                    backgroundColor: consent ? theme.primary : "transparent",
                  },
                ]}
              >
                {consent ? <Text style={styles.consentCheck}>✓</Text> : null}
              </View>
              <Text
                style={[styles.consentText, { color: theme.textSecondary }]}
              >
                Tôi đã đọc, hiểu và đồng ý với các điều khoản, chính sách bảo
                mật và xử lý dữ liệu cá nhân của Melodify.
              </Text>
            </Pressable>

            <View
              style={[
                styles.loginBottomPanel,
                {
                  borderTopColor: theme.border,
                  backgroundColor:
                    mode === "dark"
                      ? "rgba(25, 30, 29, 0.88)"
                      : "rgba(255,255,255,0.82)",
                },
              ]}
            >
              {phoneMode ? (
                <View style={styles.loginForm}>
                  <Text style={[styles.loginFormTitle, { color: theme.text }]}>
                    Đăng nhập bằng số điện thoại
                  </Text>
                  <TextInput
                    autoComplete="tel"
                    keyboardType="phone-pad"
                    returnKeyType={otpSent ? "next" : "done"}
                    value={phone}
                    onChangeText={setPhone}
                    onSubmitEditing={() =>
                      otpSent ? otpInput.current?.focus() : void sendOtp()
                    }
                    placeholder="Số điện thoại, ví dụ 0901234567"
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.loginField,
                      {
                        color: theme.text,
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                  {otpSent ? (
                    <TextInput
                      ref={otpInput}
                      autoComplete="one-time-code"
                      keyboardType="number-pad"
                      returnKeyType="go"
                      value={otp}
                      onChangeText={setOtp}
                      onSubmitEditing={() => void verifyOtp()}
                      placeholder="Mã xác thực"
                      placeholderTextColor={theme.textMuted}
                      style={[
                        styles.loginField,
                        {
                          color: theme.text,
                          backgroundColor: theme.backgroundElement,
                          borderColor: theme.border,
                        },
                      ]}
                    />
                  ) : null}
                  {error ? (
                    <Text style={styles.loginError}>{error}</Text>
                  ) : null}
                  {success ? (
                    <Text style={styles.loginSuccess}>{success}</Text>
                  ) : null}
                  <PrimaryButton
                    disabled={loading || !consent}
                    label={
                      loading
                        ? "Đang xử lý…"
                        : otpSent
                          ? "Xác nhận mã"
                          : "Gửi mã xác thực"
                    }
                    onPress={() => void (otpSent ? verifyOtp() : sendOtp())}
                  />
                  {otpSent ? (
                    <Pressable
                      disabled={loading}
                      onPress={() => void sendOtp()}
                    >
                      <Text
                        style={[
                          styles.loginSecondaryAction,
                          { color: theme.primary },
                        ]}
                      >
                        Gửi lại mã
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      setPhoneMode(false);
                      setOtpSent(false);
                      setError("");
                      setSuccess("");
                    }}
                  >
                    <Text
                      style={[
                        styles.loginSecondaryAction,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Quay lại các cách đăng nhập
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  disabled={!consent}
                  onPress={() => router.push("/password-login" as never)}
                  style={[
                    styles.passwordEntry,
                    !consent && styles.disabledEntry,
                  ]}
                >
                  <Text
                    style={[styles.passwordEntryText, { color: theme.text }]}
                  >
                    {consent
                      ? "Đăng nhập với mật khẩu"
                      : "Đồng ý điều khoản để tiếp tục"}
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </AppShell>
  );
}

function SocialOAuthButton({
  provider,
  enabled,
}: {
  provider: "google" | "facebook";
  enabled: boolean;
}) {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signIn = async () => {
    if (!enabled || busy) return;
    setBusy(true);
    setError("");
    try {
      const redirectUri = Linking.createURL("oauth/callback");
      if (Platform.OS !== "web") {
        if (await signInWithNativeProvider(provider)) router.replace("/me");
        return;
      }
      const isDevelopment = typeof __DEV__ !== "undefined" && __DEV__;
      const configuredOAuthBase = process.env.EXPO_PUBLIC_OAUTH_BASE_URL?.trim();
      const apiOrigin = API_URL.replace(/\/api\/?$/i, "");
      const configuredOAuthIsLoopback = Boolean(
        configuredOAuthBase &&
          /^http:\/\/(?:localhost|127(?:\.\d{1,3}){3})(?::\d+)?(?:\/|$)/i.test(
            configuredOAuthBase,
          ),
      );
      const oauthBase =
        isDevelopment && configuredOAuthIsLoopback
          ? apiOrigin
          : configuredOAuthBase || apiOrigin;
      const backendOrigin = oauthBase
        .replace(/\/api\/?$/i, "")
        .replace(/\/+$/, "");
      const oauthUrl = new URL(backendOrigin);
      const isLocalDevelopmentHost =
        oauthUrl.hostname === "localhost" ||
        /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(
          oauthUrl.hostname,
        );
      const isLocalDevelopmentOAuth =
        isDevelopment &&
        oauthUrl.protocol === "http:" &&
        isLocalDevelopmentHost;
      if (oauthUrl.protocol !== "https:" && !isLocalDevelopmentOAuth) {
        throw new Error(
          "Đăng nhập Google/Facebook cần Backend HTTPS, trừ khi đang chạy Expo development với Backend local.",
        );
      }
      const authStartUrl = new URL(
        `/auth/mobile/${provider}/redirect`,
        backendOrigin,
      );
      authStartUrl.searchParams.set("redirect_uri", redirectUri);
      window.sessionStorage.setItem("melodify_oauth_api", `${oauthUrl.origin}/api`);
      window.location.assign(authStartUrl.toString());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể đăng nhập qua mạng xã hội.",
      );
    } finally {
      setBusy(false);
    }
  };

  const title =
    provider === "google" ? "Tiếp tục với Google" : "Tiếp tục với Facebook";
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !enabled || busy }}
        disabled={!enabled || busy}
        onPress={() => void signIn()}
        style={[
          styles.loginOption,
          { backgroundColor: theme.backgroundCard, borderColor: theme.border },
          (!enabled || busy) && styles.disabledEntry,
        ]}
      >
        <View
          style={[
            styles.socialMark,
            provider === "facebook"
              ? { backgroundColor: "#1877F2" }
              : styles.googleMark,
          ]}
        >
          <Text
            style={[
              styles.socialMarkText,
              provider === "google" && { color: "#4285F4" },
            ]}
          >
            {provider === "google" ? "G" : "f"}
          </Text>
        </View>
        <Text style={[styles.loginOptionText, { color: theme.text }]}>
          {busy ? "Đang kết nối…" : title}
        </Text>
      </Pressable>
      {error ? (
        <Text style={[styles.loginError, styles.oauthError]}>{error}</Text>
      ) : null}
    </View>
  );
}

export function PasswordLoginScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const mode = useThemeMode();
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const submitting = useRef(false);
  const passwordInput = useRef<TextInput>(null);
  const passwordConfirmationInput = useRef<TextInput>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/login" as never);
  };

  const signIn = async () => {
    if (submitting.current) return;
    if (!identifier.trim() || !password) {
      setError("Nhập email hoặc số điện thoại và mật khẩu.");
      return;
    }
    if (registering && (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim()))) {
      setError('Nhập tên và email hợp lệ để đăng ký.');
      return;
    }
    if (registering && (password.length < 8 || password !== confirmation)) {
      setError('Mật khẩu cần ít nhất 8 ký tự và nhập lại phải khớp.');
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      await saveAuthSession(
        registering
          ? await registerWithPassword(name, identifier, password, confirmation)
          : await loginWithPassword(identifier.trim(), password),
      );
      router.replace("/me" as never);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Đăng nhập thất bại.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <AppShell hideHeader hidePlayer hideTabs>
      <LinearGradient
        colors={
          mode === "dark"
            ? ["#070B0C", "#062D2A", "#07110E"]
            : ["#FFFFFF", "#E8FBF8", "#F5FBFA"]
        }
        style={styles.loginScreen}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={insets.top}
          style={styles.loginScreen}
        >
          <ScrollView
            contentContainerStyle={[
              styles.passwordLoginScroll,
              { paddingTop: Math.max(insets.top + 8, 28) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.loginTopRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại đăng nhập"
                hitSlop={16}
                onPress={goBack}
                style={styles.loginClose}
              >
                <AppIcon name="close" color={theme.text} size={22} />
              </Pressable>
            </View>
            <Text style={[styles.passwordPageTitle, { color: theme.text }]}>
              {registering ? 'Tạo tài khoản' : 'Đăng nhập với mật khẩu'}
            </Text>
            <Text
              style={[
                styles.passwordPageSubtitle,
                { color: theme.textSecondary },
              ]}
            >
              {registering ? 'Đăng ký bằng email để lưu thư viện và playlist của bạn.' : 'Sử dụng email hoặc số điện thoại đã đăng ký.'}
            </Text>
            <View style={styles.passwordPageForm}>
              {registering ? <TextInput
                accessibilityLabel='Tên hiển thị'
                value={name} onChangeText={setName} editable={!loading}
                placeholder='Tên của bạn' maxLength={100} autoComplete='name'
                placeholderTextColor={theme.textMuted}
                style={[styles.loginField, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              /> : null}
              <TextInput
                accessibilityLabel="Email hoặc số điện thoại"
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
                value={identifier}
                onChangeText={setIdentifier}
                onSubmitEditing={() => passwordInput.current?.focus()}
                placeholder={registering ? "Email" : "Email hoặc số điện thoại"}
                placeholderTextColor={theme.textMuted}
                returnKeyType="next"
                blurOnSubmit={false}
                style={[
                  styles.loginField,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              />
              <View style={[styles.loginSecretField, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <TextInput
                  ref={passwordInput}
                  accessibilityLabel="Mật khẩu"
                  autoCapitalize="none"
                  autoComplete={registering ? "new-password" : "password"}
                  secureTextEntry={!passwordVisible}
                  editable={!loading}
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={() => registering ? passwordConfirmationInput.current?.focus() : void signIn()}
                  placeholder="Mật khẩu"
                  placeholderTextColor={theme.textMuted}
                  returnKeyType={registering ? "next" : "go"}
                  style={[styles.loginSecretInput, { color: theme.text }]}
                />
                <Pressable accessibilityRole="button"
                  accessibilityLabel={passwordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  hitSlop={10} onPress={() => setPasswordVisible((visible) => !visible)}
                  style={styles.loginEyeButton}>
                  <AppIcon name={passwordVisible ? "eye-off" : "eye"} color={theme.textSecondary} size={20} />
                </Pressable>
              </View>
              {registering ? <View style={[styles.loginSecretField, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <TextInput ref={passwordConfirmationInput}
                  accessibilityLabel="Nhập lại mật khẩu"
                  value={confirmation} onChangeText={setConfirmation} editable={!loading}
                  placeholder="Nhập lại mật khẩu" secureTextEntry={!confirmationVisible}
                  autoCapitalize="none" autoComplete="new-password"
                  onSubmitEditing={() => void signIn()}
                  placeholderTextColor={theme.textMuted}
                  style={[styles.loginSecretInput, { color: theme.text }]}
                />
                <Pressable accessibilityRole="button"
                  accessibilityLabel={confirmationVisible ? "Ẩn mật khẩu đã nhập lại" : "Hiện mật khẩu đã nhập lại"}
                  hitSlop={10} onPress={() => setConfirmationVisible((visible) => !visible)}
                  style={styles.loginEyeButton}>
                  <AppIcon name={confirmationVisible ? "eye-off" : "eye"} color={theme.textSecondary} size={20} />
                </Pressable>
              </View> : null}
              {error ? <Text style={styles.loginError}>{error}</Text> : null}
              <PrimaryButton
                disabled={loading}
                label={loading ? 'Đang xử lý…' : registering ? 'Đăng ký và tiếp tục' : 'Đăng nhập'}
                onPress={() => void signIn()}
              />
              <Pressable accessibilityRole='button' disabled={loading}
                onPress={() => { setRegistering(!registering); setPassword(''); setConfirmation(''); setError(''); }}
                style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ color: theme.primary, fontWeight: '600' }}>
                  {registering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </AppShell>
  );
}

function GenreCard({
  genre,
  selected,
  onPress,
}: {
  genre: Genre;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useAdaptiveStyles(baseStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text
        style={[styles.choiceTitle, selected && styles.choiceTitleSelected]}
      >
        {genre.name}
      </Text>
      <Text style={styles.choiceMeta}>{genre.song_count} bài hát</Text>
      {selected ? <Text style={styles.check}>✓</Text> : null}
    </Pressable>
  );
}

function ArtistPick({
  artist,
  selected,
  onPress,
}: {
  artist: Artist;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useAdaptiveStyles(baseStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.artistPick, selected && styles.choiceSelected]}
    >
      <Artwork uri={artist.avatar_url} size={58} round />
      <Text numberOfLines={1} style={styles.artistPickName}>
        {artist.name}
      </Text>
      {selected ? <Text style={styles.check}>✓</Text> : null}
    </Pressable>
  );
}

export function ForYouScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const router = useRouter();
  const { track, isPlaying, playSong, togglePlay } = useMusicControls();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recommendation, setRecommendation] = useState<Song | null>(null);

  useEffect(() => {
    void listGenres({ perPage: 100 })
      .then((result) => setGenres(result.data))
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Không thể tải thể loại.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const selectedGenreSet = useMemo(
    () => new Set(selectedGenres),
    [selectedGenres],
  );
  const selectedArtistSet = useMemo(
    () => new Set(selectedArtists),
    [selectedArtists],
  );

  const toggleValue = (
    value: string,
    selected: string[],
    setSelected: (values: string[]) => void,
  ) => {
    setSelected(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  const nextFromGenres = async () => {
    if (!selectedGenres.length) {
      setError("Chọn ít nhất một thể loại trước.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await getForYouArtists(selectedGenres);
      setArtists(result.data);
      setSelectedArtists([]);
      setStep(2);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tải danh sách nghệ sĩ.",
      );
    } finally {
      setLoading(false);
    }
  };

  const findSong = async () => {
    if (selectedArtists.length < 3) {
      setError("Hãy chọn ít nhất 3 nghệ sĩ.");
      return;
    }
    setStep(3);
    setSaving(true);
    setError("");
    try {
      const result = await getForYouSong(selectedGenres, selectedArtists);
      setRecommendation(result.data);
      if (result.data) await playSong(result.data);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tạo gợi ý lúc này.",
      );
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
    router.replace("/home");
  };

  return (
    <AppShell>
      <ScrollPage>
        <PageHeading
          title="Dành cho bạn"
          subtitle="Chọn sở thích để tạo gợi ý âm nhạc từ danh mục thật."
        />
        <View style={styles.stepHeader}>
          <Text style={styles.stepLabel}>BƯỚC {step} / 3</Text>
          <Pressable onPress={() => void closeFlow()}>
            <Text style={styles.closeText}>Đóng ×</Text>
          </Pressable>
        </View>
        {loading && step === 1 ? <StateMessage loading /> : null}
        {error ? <StateMessage error={error} /> : null}
        {step === 1 && !loading ? (
          <>
            <SectionHeading title="Chọn thể loại yêu thích" />
            <View style={styles.choiceGrid}>
              {genres.map((genre) => (
                <GenreCard
                  key={genre.id}
                  genre={genre}
                  selected={selectedGenreSet.has(genre.id)}
                  onPress={() =>
                    toggleValue(genre.id, selectedGenres, setSelectedGenres)
                  }
                />
              ))}
            </View>
            {!genres.length ? (
              <StateMessage empty="Chưa có thể loại trong danh mục." />
            ) : (
              <PrimaryButton
                label="Tiếp tục chọn nghệ sĩ"
                onPress={() => void nextFromGenres()}
              />
            )}
          </>
        ) : null}
        {step === 2 ? (
          <>
            <SectionHeading title="Chọn nghệ sĩ yêu thích" />
            <Text style={styles.help}>
              Chọn ít nhất 3 nghệ sĩ phù hợp với thể loại bạn đã chọn.
            </Text>
            <View style={styles.artistGrid}>
              {artists.map((artist) => (
                <ArtistPick
                  key={artist.id}
                  artist={artist}
                  selected={selectedArtistSet.has(artist.id)}
                  onPress={() =>
                    toggleValue(artist.id, selectedArtists, setSelectedArtists)
                  }
                />
              ))}
            </View>
            {artists.length < 3 ? (
              <Text style={styles.help}>
                Danh mục này hiện có {artists.length} nghệ sĩ phù hợp. Hãy quay
                lại chọn thêm thể loại để có đủ 3 nghệ sĩ.
              </Text>
            ) : null}
            {!artists.length ? (
              <StateMessage empty="Không có nghệ sĩ phù hợp với thể loại đã chọn." />
            ) : null}
            <View style={styles.buttons}>
              <Pressable
                onPress={() => setStep(1)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>
                  {artists.length < 3 ? "Chọn thêm thể loại" : "Quay lại"}
                </Text>
              </Pressable>
              <View style={styles.flex}>
                <PrimaryButton
                  disabled={artists.length < 3 || selectedArtists.length < 3}
                  label="Tìm nhạc cho tôi"
                  onPress={() => void findSong()}
                />
              </View>
            </View>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationTitle}>
                {saving
                  ? "Đang tìm nhạc cho bạn…"
                  : recommendation
                    ? "Bắt đầu phát gợi ý của bạn"
                    : "Chưa tìm được bài phù hợp"}
              </Text>
              {saving ? (
                <Text style={styles.recommendationSub}>
                  Đang chọn ngẫu nhiên bài hát theo thể loại và nghệ sĩ bạn
                  chọn.
                </Text>
              ) : null}
              {recommendation ? (
                <View style={styles.recommendationSong}>
                  <Artwork uri={recommendation.cover_url} size={76} />
                  <View style={styles.chartCopy}>
                    <Text style={styles.songTitle}>{recommendation.title}</Text>
                    <Text style={styles.detail}>
                      {recommendation.artists
                        ?.map((artist) => artist.name)
                        .join(", ") || recommendation.artist?.name}
                    </Text>
                    <Text style={styles.success}>Đang phát tự động</Text>
                  </View>
                </View>
              ) : null}
              {!saving && !recommendation ? (
                <Text style={styles.recommendationSub}>
                  Không có bài hát nào khớp với lựa chọn. Thử chọn thêm thể loại
                  hoặc nghệ sĩ.
                </Text>
              ) : null}
            </View>
            <View style={styles.buttons}>
              <Pressable
                onPress={() => setStep(2)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>Đổi nghệ sĩ</Text>
              </Pressable>
              <View style={styles.flex}>
                <PrimaryButton
                  label={saving ? "Đang tìm…" : "Tìm bài khác"}
                  disabled={saving}
                  onPress={() => void findSong()}
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollPage>
    </AppShell>
  );
}

const baseStyles = StyleSheet.create({
  searchBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
    paddingLeft: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  input: { flex: 1, color: "#0F172A", paddingVertical: 12, fontSize: 14 },
  searchButton: {
    margin: 4,
    minWidth: 55,
    height: 39,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00B5AD",
  },
  searchButtonText: { color: "#FFFFFF", fontWeight: "900" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillActive: {
    backgroundColor: "rgba(0,211,229,0.16)",
    borderColor: "#00B5AD",
  },
  pillText: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  pillTextActive: { color: "#00B5AD" },
  section: { gap: 7 },
  entityRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  entityName: { flex: 1, color: "#0F172A", fontSize: 14, fontWeight: "800" },
  recentTabs: { gap: 22, paddingRight: 16 },
  recentTabWrap: {
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  recentTab: { color: "#64748B", fontSize: 15, fontWeight: "800" },
  recentTabActive: { color: "#0F172A" },
  recentTabIndicator: {
    height: 3,
    width: "100%",
    borderRadius: 2,
    backgroundColor: "#00B5AD",
  },
  playAllRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playAllCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00D3E5",
  },
  playAllText: { color: "#0F172A", fontSize: 15, fontWeight: "800" },
  createPlaylist: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  playlistInput: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 12,
    color: "#0F172A",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  createButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#00B5AD",
  },
  createText: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" },
  shortcuts: { gap: 9 },
  shortcut: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  shortcutCopy: { flex: 1, gap: 4 },
  shortcutTitle: { color: "#0F172A", fontSize: 14, fontWeight: "800" },
  detail: { color: "#9CA8A2", fontSize: 12 },
  count: { color: "#00B5AD", fontWeight: "900" },
  form: { gap: 13, padding: 15, borderRadius: 15, backgroundColor: "#FFFFFF" },
  field: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 11,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  error: { color: "#FF8A80", fontSize: 12 },
  success: { color: "#54DDA5", fontSize: 12, fontWeight: "800" },
  loginScreen: { flex: 1 },
  loginScroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  loginTopRow: { minHeight: 58, justifyContent: "center" },
  loginClose: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 10,
  },
  loginBrand: { alignItems: "center", gap: 4, marginTop: 10, marginBottom: 25 },
  loginLogo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  loginBrandName: { fontSize: 31, fontWeight: "900", letterSpacing: 1.2 },
  loginBrandCaption: { fontSize: 13, fontWeight: "600" },
  loginOptions: { gap: 10 },
  oauthHint: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  oauthError: { textAlign: "center", paddingTop: 5 },
  loginOption: {
    minHeight: 54,
    borderRadius: 28,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
    borderWidth: 1,
  },
  socialMark: {
    position: "absolute",
    left: 18,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  googleMark: { backgroundColor: "#FFFFFF" },
  socialMarkText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 25,
  },
  loginOptionText: { fontSize: 14, fontWeight: "800" },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 24,
    marginBottom: 18,
  },
  consentCheckbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  consentCheck: {
    color: "#062C30",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  consentText: { flex: 1, fontSize: 11, lineHeight: 16 },
  loginBottomPanel: {
    borderTopWidth: 1,
    marginHorizontal: -22,
    paddingHorizontal: 22,
    paddingTop: 15,
    paddingBottom: 10,
  },
  loginForm: { gap: 11 },
  loginFormTitle: { fontSize: 16, fontWeight: "900", marginBottom: 2 },
  loginField: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  loginSecretField: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  loginSecretInput: {
    minHeight: 46,
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  loginEyeButton: {
    width: 48,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  loginError: { color: "#EF4444", fontSize: 12, lineHeight: 17 },
  loginSuccess: { color: "#16A34A", fontSize: 12, lineHeight: 17 },
  loginSecondaryAction: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 7,
  },
  passwordEntry: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordEntryText: { fontSize: 15, fontWeight: "800" },
  passwordLoginScroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 30,
  },
  passwordPageTitle: {
    fontSize: 26,
    lineHeight: 33,
    fontWeight: "900",
    marginTop: 25,
  },
  passwordPageSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 24,
  },
  passwordPageForm: { gap: 14 },
  disabledEntry: { opacity: 0.5 },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepLabel: {
    color: "#00B5AD",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  closeText: { color: "#64748B", fontSize: 13, fontWeight: "800" },
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  choice: {
    width: "48%",
    minHeight: 78,
    justifyContent: "center",
    gap: 5,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  choiceSelected: { borderColor: "#00B5AD", backgroundColor: "#E6FAF7" },
  choiceTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  choiceTitleSelected: { color: "#00B5AD" },
  choiceMeta: { color: "#9CA8A2", fontSize: 10 },
  check: {
    position: "absolute",
    top: 8,
    right: 9,
    color: "#00B5AD",
    fontSize: 15,
    fontWeight: "900",
  },
  help: { color: "#64748B", fontSize: 12 },
  artistGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  artistPick: {
    width: "30.5%",
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  artistPickName: {
    color: "#0F172A",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  buttons: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1 },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#64716B",
  },
  secondaryText: { color: "#E7ECE9", fontSize: 12, fontWeight: "800" },
  recommendationBox: {
    minHeight: 190,
    justifyContent: "center",
    gap: 16,
    padding: 18,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  recommendationTitle: {
    color: "#0F172A",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  recommendationSub: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  recommendationSong: { flexDirection: "row", alignItems: "center", gap: 13 },
  chartCopy: { flex: 1, gap: 5 },
  songTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  logoutButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#5C3331",
    backgroundColor: "rgba(255, 138, 128, 0.08)",
    marginTop: 8,
  },
  logoutText: { color: "#FF8A80", fontSize: 13, fontWeight: "800" },
});
