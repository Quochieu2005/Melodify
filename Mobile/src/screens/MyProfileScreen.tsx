import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { AppShell } from '@/components/layout';
import { AppIcon } from '@/components/shared/AppIcon';
import { useRemoteData } from '@/hooks/useRemoteData';
import {
  clearAuthSession,
  createUserPlaylist,
  getLibrary,
  getSavedAuthUser,
  getVisitorId,
  type AuthUser,
} from '@/lib/api';
import { getRecentSongs } from '@/lib/recent-history';

type ProfileTab = 'created' | 'favorite_playlists' | 'favorite_albums';

export function MyProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('created');
  const [recentCount, setRecentCount] = useState<number>(0);

  // Create playlist modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingBusy, setCreatingBusy] = useState(false);

  // Settings & search
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    void getSavedAuthUser()
      .then((u) => {
        if (active) {
          setUser(u);
          setAuthChecking(false);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setAuthChecking(false);
        }
      });
    void getRecentSongs().then((items) => {
      if (active) {
        setRecentCount(items.length);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Fetch real library data from backend
  const { data, loading, reload } = useRemoteData(async () => {
    const visitorId = await getVisitorId();
    const res = await getLibrary(visitorId);
    return res.data;
  }, user?.id);

  // Handle Create Playlist
  const handleCreatePlaylist = async () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    setCreatingBusy(true);
    try {
      await createUserPlaylist(name);
      setNewPlaylistName('');
      setCreateModalOpen(false);
      await reload();
      Alert.alert('Thành công', `Đã tạo playlist "${name}"`);
    } catch (err) {
      Alert.alert('Lỗi', err instanceof Error ? err.message : 'Không thể tạo playlist.');
    } finally {
      setCreatingBusy(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    setSettingsOpen(false);
    await clearAuthSession();
    setUser(null);
    await reload();
  };

  // Filter created playlists
  const displayCreatedPlaylists = useMemo(() => {
    let list = [...(data?.created_playlists ?? [])];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [data?.created_playlists, searchQuery]);

  // Top header icons: Bell & Settings
  const customHeader = (
    <View style={styles.topHeaderRow}>
      <View style={styles.topHeaderLeft} />

      <View style={styles.topHeaderRight}>
        {/* Bell Notifications */}
        <Pressable
          accessibilityLabel="Thông báo"
          onPress={() => Alert.alert('Thông báo', 'Bạn không có thông báo mới nào.')}
          style={styles.topHeaderBtn}
        >
          <AppIcon name="bell" color="#1E293B" size={20} />
          <View style={styles.notificationDot} />
        </Pressable>

        {/* Settings Gear */}
        <Pressable
          accessibilityLabel="Cài đặt tài khoản"
          onPress={() => setSettingsOpen(true)}
          style={styles.topHeaderBtn}
        >
          <AppIcon name="settings" color="#1E293B" size={20} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <AppShell customHeader={customHeader}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {authChecking ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#00B5AD" size="small" />
          </View>
        ) : user ? (
          /* USER LOGGED IN */
          <>
            {/* User Profile Card */}
            <View style={styles.profileSection}>
              <View style={styles.avatarWrapper}>
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <LinearGradient
                    colors={['#38BDF8', '#0284C7']}
                    style={styles.avatarFallback}
                  >
                    <Text style={styles.avatarFallbackText}>
                      {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>

              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={styles.profileName}>
                    {user.name || user.username || 'Người dùng'}
                  </Text>
                  <View style={styles.vipTag}>
                    <Text style={styles.vipTagText}>
                      {user.is_premium ? 'VIP' : 'Miễn phí'}
                    </Text>
                  </View>
                </View>

                {/* Real stats: Đang theo dõi & Người theo dõi */}
                <View style={styles.statsRow}>
                  <Pressable
                    onPress={() => router.push('/following' as never)}
                    style={styles.statCol}
                  >
                    <Text style={styles.statNum}>{data?.following_count ?? 0}</Text>
                    <Text numberOfLines={1} style={styles.statLabel}>
                      Đang theo dõi
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push('/followers' as never)}
                    style={styles.statCol}
                  >
                    <Text style={styles.statNum}>{data?.followers_count ?? 0}</Text>
                    <Text numberOfLines={1} style={styles.statLabel}>
                      Người theo dõi
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Hồ sơ > Button */}
              <Pressable
                accessibilityLabel="Xem hồ sơ"
                onPress={() => router.push(('/user/' + (user.username || user.id)) as never)}
                style={styles.profileLink}
              >
                <Text style={styles.profileLinkText}>Hồ sơ</Text>
                <AppIcon name="chevron" color="#334155" size={13} />
              </Pressable>
            </View>

            {/* Quick Action Cards (Chỉ hiển thị các chức năng thực tế có trong hệ thống) */}
            <View style={styles.actionCardsGrid}>
              {/* Card 1: Tài khoản VIP */}
              <Pressable
                onPress={() => router.push('/vip' as never)}
                style={[styles.actionCard, styles.vipCard]}
              >
                <View style={styles.cardIconBox}>
                  <AppIcon name="crown" color="#D97706" size={24} />
                </View>
                <View style={styles.cardTextBox}>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    Tài khoản VIP
                  </Text>
                  <Text numberOfLines={1} style={styles.cardSubtitle}>
                    {user.is_premium ? 'Gói VIP đang dùng' : 'Gói miễn phí'}
                  </Text>
                </View>
              </Pressable>

              {/* Card 2: Nghe gần đây */}
              <Pressable
                onPress={() => router.push('/recent' as never)}
                style={[styles.actionCard, styles.grayCard]}
              >
                <View style={styles.cardIconBox}>
                  <AppIcon name="history" color="#0284C7" size={24} />
                </View>
                <View style={styles.cardTextBox}>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    Gần đây
                  </Text>
                  <Text numberOfLines={1} style={styles.cardSubtitle}>
                    {recentCount > 0 ? `${recentCount} bài hát` : 'Chưa có bài hát'}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Full Width Favorite Card */}
            <Pressable
              onPress={() => router.push('/favorite' as never)}
              style={styles.favoriteFullCard}
            >
              <LinearGradient
                colors={['#FF5E8E', '#FF3D81']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.favoriteHeartBox}
              >
                <AppIcon name="heart" color="#FFFFFF" size={26} />
              </LinearGradient>

              <View style={styles.favoriteCopy}>
                <Text style={styles.favoriteTitle}>Yêu Thích</Text>
                <Text style={styles.favoriteSubtitle}>
                  {data ? `${data.favorite_song_count} bài hát` : '0 bài hát'}
                </Text>
              </View>

              <AppIcon name="chevron" color="#94A3B8" size={16} />
            </Pressable>

            {/* Horizontal Tabs: Playlist đã tạo | Playlist yêu thích | Album yêu thích */}
            <View style={styles.tabsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsRow}
              >
                <Pressable
                  onPress={() => setActiveTab('created')}
                  style={styles.tabItem}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      activeTab === 'created' && styles.tabItemTextActive,
                    ]}
                  >
                    Playlist đã tạo
                  </Text>
                  {activeTab === 'created' && <View style={styles.tabIndicator} />}
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab('favorite_playlists')}
                  style={styles.tabItem}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      activeTab === 'favorite_playlists' && styles.tabItemTextActive,
                    ]}
                  >
                    Playlist yêu thích
                  </Text>
                  {activeTab === 'favorite_playlists' && (
                    <View style={styles.tabIndicator} />
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab('favorite_albums')}
                  style={styles.tabItem}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      activeTab === 'favorite_albums' && styles.tabItemTextActive,
                    ]}
                  >
                    Album yêu thích
                  </Text>
                  {activeTab === 'favorite_albums' && (
                    <View style={styles.tabIndicator} />
                  )}
                </Pressable>
              </ScrollView>
            </View>

            {/* TAB CONTENT: Playlist đã tạo */}
            {activeTab === 'created' && (
              <View style={styles.tabContentSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    Playlist đã tạo ({data?.created_playlists.length ?? 0})
                  </Text>

                  <View style={styles.sectionActionsRight}>
                    {/* Nút Tạo Playlist mới (+) */}
                    <Pressable
                      accessibilityLabel="Tạo playlist mới"
                      onPress={() => setCreateModalOpen(true)}
                      style={styles.actionCircleBtn}
                    >
                      <AppIcon name="plus" color="#334155" size={18} />
                    </Pressable>

                    {/* Nút Tìm kiếm trong playlist */}
                    <Pressable
                      accessibilityLabel="Tìm playlist"
                      onPress={() => setSearchOpen((prev) => !prev)}
                      style={styles.actionCircleBtn}
                    >
                      <AppIcon name="search" color="#334155" size={17} />
                    </Pressable>
                  </View>
                </View>

                {/* Inline Search Bar */}
                {searchOpen && (
                  <View style={styles.searchBarBox}>
                    <AppIcon name="search" color="#94A3B8" size={16} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Tìm kiếm trong playlist đã tạo..."
                      placeholderTextColor="#94A3B8"
                      style={styles.searchBarInput}
                    />
                    {searchQuery ? (
                      <Pressable onPress={() => setSearchQuery('')}>
                        <AppIcon name="close" color="#94A3B8" size={16} />
                      </Pressable>
                    ) : null}
                  </View>
                )}

                {/* Danh sách Playlist đã tạo thật */}
                {loading && !data ? (
                  <ActivityIndicator color="#00B5AD" style={{ marginTop: 20 }} />
                ) : displayCreatedPlaylists.length > 0 ? (
                  displayCreatedPlaylists.map((pl) => (
                    <Pressable
                      key={pl.id}
                      onPress={() =>
                        router.push(('/playlist/' + (pl.slug || pl.id)) as never)
                      }
                      style={styles.playlistRowItem}
                    >
                      <View style={styles.playlistCoverBox}>
                        {pl.cover_url ? (
                          <Image
                            source={{ uri: pl.cover_url }}
                            style={styles.playlistCoverImg}
                          />
                        ) : (
                          <View style={styles.playlistFallbackCover}>
                            <AppIcon name="music" color="#00B5AD" size={20} />
                          </View>
                        )}
                      </View>
                      <View style={styles.rowItemInfo}>
                        <Text numberOfLines={1} style={styles.rowItemTitle}>
                          {pl.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.rowItemSubtitle}>
                          {pl.song_count} bài hát
                        </Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>Bạn chưa tạo playlist nào</Text>
                    <Text style={styles.emptyDesc}>
                      Hãy nhấn nút (+) ở góc trên để tạo playlist đầu tiên của bạn.
                    </Text>
                    <Pressable
                      onPress={() => setCreateModalOpen(true)}
                      style={styles.emptyCreateBtn}
                    >
                      <Text style={styles.emptyCreateBtnText}>+ Tạo playlist mới</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* TAB CONTENT: Playlist yêu thích */}
            {activeTab === 'favorite_playlists' && (
              <View style={styles.tabContentSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    Playlist yêu thích ({data?.favorite_playlists.length ?? 0})
                  </Text>
                </View>

                {data?.favorite_playlists.length ? (
                  data.favorite_playlists.map((pl) => (
                    <Pressable
                      key={pl.id}
                      onPress={() =>
                        router.push(('/playlist/' + (pl.slug || pl.id)) as never)
                      }
                      style={styles.playlistRowItem}
                    >
                      <View style={styles.playlistCoverBox}>
                        {pl.cover_url ? (
                          <Image
                            source={{ uri: pl.cover_url }}
                            style={styles.playlistCoverImg}
                          />
                        ) : (
                          <View style={styles.playlistFallbackCover}>
                            <AppIcon name="music" color="#00B5AD" size={20} />
                          </View>
                        )}
                      </View>
                      <View style={styles.rowItemInfo}>
                        <Text numberOfLines={1} style={styles.rowItemTitle}>
                          {pl.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.rowItemSubtitle}>
                          {pl.song_count} bài hát
                        </Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>Chưa có playlist yêu thích</Text>
                    <Text style={styles.emptyDesc}>
                      Khám phá các playlist và bấm biểu tượng trái tim để lưu lại.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* TAB CONTENT: Album yêu thích */}
            {activeTab === 'favorite_albums' && (
              <View style={styles.tabContentSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    Album yêu thích ({data?.favorite_albums.length ?? 0})
                  </Text>
                </View>

                {data?.favorite_albums.length ? (
                  data.favorite_albums.map((al) => (
                    <Pressable
                      key={al.id}
                      onPress={() =>
                        router.push(('/album/' + (al.slug || al.id)) as never)
                      }
                      style={styles.playlistRowItem}
                    >
                      <View style={styles.playlistCoverBox}>
                        {al.cover_url ? (
                          <Image
                            source={{ uri: al.cover_url }}
                            style={styles.playlistCoverImg}
                          />
                        ) : (
                          <View style={styles.playlistFallbackCover}>
                            <AppIcon name="disc" color="#00B5AD" size={20} />
                          </View>
                        )}
                      </View>
                      <View style={styles.rowItemInfo}>
                        <Text numberOfLines={1} style={styles.rowItemTitle}>
                          {al.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.rowItemSubtitle}>
                          Album đã lưu
                        </Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>Chưa có album yêu thích</Text>
                    <Text style={styles.emptyDesc}>
                      Lưu những album bạn yêu thích để dễ dàng nghe lại.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          /* GUEST (CHƯA ĐĂNG NHẬP) */
          <View style={styles.guestContainer}>
            <View style={styles.guestAvatarCircle}>
              <AppIcon name="user" color="#00B5AD" size={42} />
            </View>
            <Text style={styles.guestTitle}>Của Tui</Text>
            <Text style={styles.guestDesc}>
              Đăng nhập Melodify để đồng bộ danh sách bài hát yêu thích, quản lý
              playlist cá nhân và gói VIP của bạn.
            </Text>
            <Pressable
              onPress={() => router.push('/login' as never)}
              style={styles.guestLoginBtn}
            >
              <Text style={styles.guestLoginBtnText}>Đăng nhập ngay</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* CREATE PLAYLIST MODAL */}
      <Modal
        visible={createModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tạo playlist mới</Text>
            <TextInput
              autoFocus
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="Nhập tên playlist của bạn..."
              placeholderTextColor="#94A3B8"
              style={styles.modalInput}
            />
            <View style={styles.modalButtonsRow}>
              <Pressable
                onPress={() => setCreateModalOpen(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                disabled={creatingBusy || !newPlaylistName.trim()}
                onPress={() => void handleCreatePlaylist()}
                style={[
                  styles.modalSubmitBtn,
                  (!newPlaylistName.trim() || creatingBusy) && styles.btnDisabled,
                ]}
              >
                {creatingBusy ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Tạo</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* SETTINGS / LOGOUT SHEET MODAL */}
      <Modal
        visible={settingsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setSettingsOpen(false)}
          />
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, 16) + 10 },
            ]}
          >
            <View style={styles.sheetGrabHandle} />
            <Text style={styles.sheetTitle}>Cài đặt tài khoản</Text>

            {user ? (
              <View style={styles.sheetUserBox}>
                <Text style={styles.sheetUserName}>
                  {user.name} ({user.username ? '@' + user.username : 'Melodify'})
                </Text>
                <Text style={styles.sheetUserBadge}>
                  {user.is_premium ? '👑 Thành viên VIP' : 'Tài khoản miễn phí'}
                </Text>
              </View>
            ) : null}

            <View style={styles.sheetMenu}>
              <Pressable
                onPress={() => {
                  setSettingsOpen(false);
                  router.push('/vip' as never);
                }}
                style={styles.sheetMenuItem}
              >
                <AppIcon name="crown" color="#D97706" size={20} />
                <Text style={styles.sheetMenuText}>Nâng cấp tài khoản VIP</Text>
              </Pressable>

              {user ? (
                <Pressable
                  onPress={() => {
                    setSettingsOpen(false);
                    router.push(('/user/' + (user.username || user.id)) as never);
                  }}
                  style={styles.sheetMenuItem}
                >
                  <AppIcon name="user" color="#0EA5E9" size={20} />
                  <Text style={styles.sheetMenuText}>Xem trang cá nhân công khai</Text>
                </Pressable>
              ) : null}

              {user ? (
                <Pressable
                  onPress={() => void handleLogout()}
                  style={[styles.sheetMenuItem, styles.sheetMenuLogout]}
                >
                  <AppIcon name="logout" color="#EF4444" size={20} />
                  <Text style={[styles.sheetMenuText, styles.sheetLogoutText]}>
                    Đăng xuất tài khoản
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    setSettingsOpen(false);
                    router.push('/login' as never);
                  }}
                  style={styles.sheetMenuItem}
                >
                  <AppIcon name="user" color="#00B5AD" size={20} />
                  <Text style={styles.sheetMenuText}>Đăng nhập</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={() => setSettingsOpen(false)}
              style={styles.sheetCancelBtn}
            >
              <Text style={styles.sheetCancelText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },
  loadingWrap: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Top Bar Header */
  topHeaderRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topHeaderLeft: {
    flex: 1,
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  /* User Profile Header */
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 4,
    paddingBottom: 4,
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    maxWidth: 160,
  },
  vipTag: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  vipTagText: {
    color: '#334155',
    fontSize: 10.5,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statCol: {
    gap: 1,
  },
  statNum: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  profileLinkText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Real Action Cards */
  actionCardsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    minHeight: 64,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  vipCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDE68A',
  },
  grayCard: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  cardIconBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextBox: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#64748B',
    fontSize: 11,
  },

  /* Full Width Favorite Card */
  favoriteFullCard: {
    minHeight: 74,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  favoriteHeartBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3D81',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  favoriteCopy: {
    flex: 1,
    gap: 3,
  },
  favoriteTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  favoriteSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },

  /* Horizontal Tabs */
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 20,
    paddingRight: 16,
  },
  tabItem: {
    paddingVertical: 8,
    position: 'relative',
  },
  tabItemText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  tabItemTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#00B5AD',
  },

  /* Tab Content */
  tabContentSection: {
    gap: 10,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
  },
  sectionActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },

  /* Playlist Row Item */
  playlistRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  playlistCoverBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  playlistCoverImg: {
    width: '100%',
    height: '100%',
  },
  playlistFallbackCover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6FAF7',
  },
  rowItemInfo: {
    flex: 1,
    gap: 3,
  },
  rowItemTitle: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '700',
  },
  rowItemSubtitle: {
    color: '#64748B',
    fontSize: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyDesc: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyCreateBtn: {
    marginTop: 8,
    backgroundColor: '#E6FAF7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  emptyCreateBtnText: {
    color: '#00B5AD',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Guest View */
  guestContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  guestAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6FAF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  guestTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
  },
  guestDesc: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  guestLoginBtn: {
    marginTop: 12,
    backgroundColor: '#00B5AD',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#00B5AD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  guestLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  modalInput: {
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: '#00B5AD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },

  /* Settings Sheet */
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  sheetGrabHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  sheetUserBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    alignItems: 'center',
  },
  sheetUserName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  sheetUserBadge: {
    color: '#00B5AD',
    fontSize: 12,
    fontWeight: '700',
  },
  sheetMenu: {
    gap: 6,
  },
  sheetMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  sheetMenuText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  sheetMenuLogout: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 6,
  },
  sheetLogoutText: {
    color: '#EF4444',
    fontWeight: '700',
  },
  sheetCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginTop: 4,
  },
  sheetCancelText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
});
