import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useMusicControls } from '@/components/music';
import { AppIcon } from '@/components/shared/AppIcon';
import { useAdaptiveStyles } from '@/hooks/use-adaptive-styles';
import { useTheme } from '@/hooks/use-theme';
import {
  getTopic,
  getVisitorId,
  listFavoriteSongs,
  listSongs,
  listTopics,
  type Song,
  type Topic,
} from '@/lib/api';
import { formatTime } from '@/lib/lyrics';
import { getRecentSongs, type RecentSong } from '@/lib/recent-history';

type QueueTab = 'queue' | 'related' | 'topics' | 'saved';

type QueueSelectorViewProps = {
  containerHeight?: number;
  onClose?: () => void;
};

const DEFAULT_TOPICS = [
  { id: 't-relax', name: 'Thư giãn', slug: 'thu-gian' },
  { id: 't-energy', name: 'Năng lượng', slug: 'nang-luong' },
  { id: 't-acoustic', name: 'Acoustic', slug: 'acoustic' },
  { id: 't-focus', name: 'Tập trung', slug: 'tap-trung' },
  { id: 't-love', name: 'Tình yêu', slug: 'tinh-yeu' },
  { id: 't-edm', name: 'EDM & Remix', slug: 'edm-remix' },
];

export function QueueSelectorView({ containerHeight = 440 }: QueueSelectorViewProps) {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  const {
    track,
    queue,
    currentIndex,
    isPlaying,
    playAt,
    playSong,
    addToQueue,
    removeFromQueue,
  } = useMusicControls();

  const [activeTab, setActiveTab] = useState<QueueTab>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Related songs state
  const [relatedSongs, setRelatedSongs] = useState<Song[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Topics state
  const [topics, setTopics] = useState<{ id: string; name: string; slug: string }[]>(DEFAULT_TOPICS);
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string>('thu-gian');
  const [topicSongs, setTopicSongs] = useState<Song[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Saved / Offline state
  const [savedSongs, setSavedSongs] = useState<Song[]>([]);
  const [savedFilter, setSavedFilter] = useState<'recent' | 'favorites'>('recent');
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Load related songs based on current track
  const loadRelated = useCallback(async () => {
    if (!track) return;
    setLoadingRelated(true);
    try {
      const query = track.artist?.name || track.artists?.[0]?.name || track.title;
      const res = await listSongs({ query, perPage: 12 });
      const filtered = (res.data || []).filter((s) => s.id !== track.id);
      setRelatedSongs(filtered);
    } catch {
      setRelatedSongs([]);
    } finally {
      setLoadingRelated(false);
    }
  }, [track]);

  // Load topics list and current topic songs
  const loadTopicSongs = useCallback(async (slug: string, name: string) => {
    setLoadingTopics(true);
    setSelectedTopicSlug(slug);
    try {
      const topicRes = await getTopic(slug).catch(() => null);
      if (topicRes?.data?.songs && topicRes.data.songs.length > 0) {
        setTopicSongs(topicRes.data.songs);
      } else {
        // Fallback to song search by topic name
        const searchRes = await listSongs({ query: name, perPage: 12 });
        setTopicSongs(searchRes.data || []);
      }
    } catch {
      setTopicSongs([]);
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  // Initial topics loading
  const loadInitialTopics = useCallback(async () => {
    try {
      const res = await listTopics({ perPage: 10 });
      if (res.data && res.data.length > 0) {
        const mapped = res.data.map((t: Topic) => ({
          id: t.id,
          name: t.name,
          slug: t.slug || t.id,
        }));
        setTopics(mapped);
        if (mapped[0]) {
          void loadTopicSongs(mapped[0].slug, mapped[0].name);
        }
      } else {
        void loadTopicSongs(DEFAULT_TOPICS[0].slug, DEFAULT_TOPICS[0].name);
      }
    } catch {
      void loadTopicSongs(DEFAULT_TOPICS[0].slug, DEFAULT_TOPICS[0].name);
    }
  }, [loadTopicSongs]);

  // Load saved (recent offline & favorites)
  const loadSaved = useCallback(async (filter: 'recent' | 'favorites') => {
    setLoadingSaved(true);
    try {
      if (filter === 'recent') {
        const recent: RecentSong[] = await getRecentSongs();
        const mapped: Song[] = recent.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          duration_seconds: r.duration_seconds,
          artist: r.artist,
          artists: r.artists,
          publisher: r.publisher,
          preview_url: r.preview_url,
          cover_url: r.cover_url,
          audio_url: r.audio_url,
          stream_url: r.stream_url,
          source_url: r.source_url,
          is_favorite: r.is_favorite,
        }));
        setSavedSongs(mapped);
      } else {
        const visitorId = await getVisitorId();
        const res = await listFavoriteSongs(visitorId);
        setSavedSongs(res.data || []);
      }
    } catch {
      setSavedSongs([]);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  // Switch tab and load data on user demand
  const handleTabChange = useCallback(
    (tab: QueueTab) => {
      setActiveTab(tab);
      if (tab === 'related') {
        void loadRelated();
      } else if (tab === 'topics' && topicSongs.length === 0) {
        void loadInitialTopics();
      } else if (tab === 'saved') {
        void loadSaved(savedFilter);
      }
    },
    [loadInitialTopics, loadRelated, loadSaved, savedFilter, topicSongs.length]
  );

  const handleAddToQueue = (song: Song) => {
    addToQueue(song);
    setAddedIds((prev) => ({ ...prev, [song.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [song.id]: false }));
    }, 2000);
  };

  const handlePlaySong = (song: Song, list?: Song[]) => {
    void playSong(song, list || [song]);
  };

  const handleTopicPress = (t: { id: string; name: string; slug: string }) => {
    void loadTopicSongs(t.slug, t.name);
  };

  const handleSavedFilterChange = (filter: 'recent' | 'favorites') => {
    setSavedFilter(filter);
    void loadSaved(filter);
  };

  // Filter songs by search query if typed
  const filterList = (items: Song[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist?.name.toLowerCase().includes(q) ||
        s.artists?.some((a) => a.name.toLowerCase().includes(q))
    );
  };

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {/* Category Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => handleTabChange('queue')}
          style={[styles.tabButton, activeTab === 'queue' && styles.tabButtonActive]}
        >
          <AppIcon
            name="queue"
            color={activeTab === 'queue' ? theme.primaryOn : theme.textMuted}
            size={16}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'queue' && styles.tabButtonTextActive]}
          >
            Đang phát ({queue.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleTabChange('related')}
          style={[styles.tabButton, activeTab === 'related' && styles.tabButtonActive]}
        >
          <AppIcon
            name="sparkles"
            color={activeTab === 'related' ? theme.primaryOn : theme.textMuted}
            size={15}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'related' && styles.tabButtonTextActive]}
          >
            Liên quan
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleTabChange('topics')}
          style={[styles.tabButton, activeTab === 'topics' && styles.tabButtonActive]}
        >
          <AppIcon
            name="music"
            color={activeTab === 'topics' ? theme.primaryOn : theme.textMuted}
            size={15}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'topics' && styles.tabButtonTextActive]}
          >
            Chủ đề
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleTabChange('saved')}
          style={[styles.tabButton, activeTab === 'saved' && styles.tabButtonActive]}
        >
          <AppIcon
            name="heart"
            color={activeTab === 'saved' ? theme.primaryOn : theme.textMuted}
            size={15}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'saved' && styles.tabButtonTextActive]}
          >
            Đã tải / Lưu
          </Text>
        </Pressable>
      </View>

      {/* Quick Filter Search Bar */}
      <View style={styles.searchRow}>
        <AppIcon name="search" color={theme.textMuted} size={16} />
        <TextInput
          placeholder="Lọc trong danh sách này..."
          placeholderTextColor="#6B7973"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* TAB 1: CURRENT QUEUE */}
      {activeTab === 'queue' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollList}
        >
          {/* Currently Playing Card */}
          {track && (
            <View style={styles.currentSongCard}>
              <View style={styles.nowPlayingBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.nowPlayingLabel}>
                  {isPlaying ? 'ĐANG PHÁT' : 'ĐANG DỪNG'}
                </Text>
              </View>

              <View style={styles.songRow}>
                {track.cover_url ? (
                  <Image source={{ uri: track.cover_url }} style={styles.coverThumbActive} />
                ) : (
                  <View style={[styles.coverThumbActive, styles.coverFallback]}>
                    <AppIcon name="music" color={theme.primary} size={20} />
                  </View>
                )}

                <View style={styles.songInfo}>
                  <Text numberOfLines={1} style={styles.currentTitle}>
                    {track.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.currentArtist}>
                    {track.artists?.map((a) => a.name).join(', ') ||
                      track.artist?.name ||
                      'Melodify'}
                  </Text>
                </View>

                <View style={styles.currentIndicatorBox}>
                  <AppIcon name="waveform" color={theme.primary} size={18} />
                </View>
              </View>
            </View>
          )}

          {/* Up Next Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Tiếp theo ({Math.max(0, queue.length - currentIndex - 1)} bài)
            </Text>
            {queue.length > 1 && (
              <Text style={styles.sectionSubtext}>Chạm bài bất kỳ để nghe</Text>
            )}
          </View>

          {/* Upcoming list */}
          {queue.length <= 1 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Chưa có bài phát tiếp theo</Text>
              <Text style={styles.emptySub}>
                Chuyển qua tab &quot;Liên quan&quot; hoặc &quot;Chủ đề&quot; để chọn thêm bài hát yêu thích của bạn!
              </Text>
              <Pressable
                onPress={() => handleTabChange('related')}
                style={styles.emptyActionBtn}
              >
                <AppIcon name="sparkles" color={theme.primaryOn} size={15} />
                <Text style={styles.emptyActionText}>Khám phá bài liên quan</Text>
              </Pressable>
            </View>
          ) : (
            filterList(queue).map((song, qIdx) => {
              // Real index in the original queue array
              const originalIdx = queue.findIndex((item) => item.id === song.id);
              const isCurrent = originalIdx === currentIndex;
              const isPast = originalIdx < currentIndex;

              return (
                <Pressable
                  key={`${song.id}-${qIdx}`}
                  onPress={() => playAt(originalIdx)}
                  style={[
                    styles.queueItem,
                    isCurrent && styles.queueItemActive,
                    isPast && styles.queueItemPast,
                  ]}
                >
                  <Text
                    style={[
                      styles.queueIndexText,
                      isCurrent && styles.queueIndexTextActive,
                    ]}
                  >
                    {isCurrent ? '▶' : originalIdx + 1}
                  </Text>

                  {song.cover_url ? (
                    <Image source={{ uri: song.cover_url }} style={styles.songThumb} />
                  ) : (
                    <View style={[styles.songThumb, styles.coverFallback]}>
                      <AppIcon name="music" color={theme.textMuted} size={16} />
                    </View>
                  )}

                  <View style={styles.songInfo}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.songTitle,
                        isCurrent && styles.songTitleActive,
                        isPast && styles.songTitlePast,
                      ]}
                    >
                      {song.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.songArtist}>
                      {song.artists?.map((a) => a.name).join(', ') ||
                        song.artist?.name ||
                        'Melodify'}
                    </Text>
                  </View>

                  {song.duration_seconds ? (
                    <Text style={styles.songDuration}>
                      {formatTime(song.duration_seconds)}
                    </Text>
                  ) : null}

                  {!isCurrent && queue.length > 1 && (
                    <Pressable
                      accessibilityLabel="Xóa khỏi danh sách"
                      onPress={(e) => {
                        e.stopPropagation();
                        removeFromQueue(originalIdx);
                      }}
                      style={styles.itemActionBtn}
                    >
                      <AppIcon name="trash" color={theme.textMuted} size={15} />
                    </Pressable>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {/* TAB 2: RELATED SONGS */}
      {activeTab === 'related' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollList}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Gợi ý theo nghệ sĩ & thể loại
            </Text>
            <Pressable onPress={() => void loadRelated()} style={styles.refreshBtn}>
              <Text style={styles.refreshBtnText}>Làm mới</Text>
            </Pressable>
          </View>

          {loadingRelated ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.primary} size="small" />
              <Text style={styles.loadingText}>Đang tìm bài hát liên quan...</Text>
            </View>
          ) : filterList(relatedSongs).length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Chưa có gợi ý liên quan</Text>
              <Text style={styles.emptySub}>
                Thử chọn các thể loại từ tab &quot;Chủ đề&quot; hoặc tìm kiếm bên trên!
              </Text>
            </View>
          ) : (
            filterList(relatedSongs).map((song) => {
              const isAdded = Boolean(addedIds[song.id]);
              return (
                <View key={song.id} style={styles.songRowCard}>
                  <Pressable
                    onPress={() => handlePlaySong(song, [song, ...relatedSongs])}
                    style={styles.songMainTap}
                  >
                    {song.cover_url ? (
                      <Image source={{ uri: song.cover_url }} style={styles.songThumb} />
                    ) : (
                      <View style={[styles.songThumb, styles.coverFallback]}>
                        <AppIcon name="music" color={theme.textMuted} size={16} />
                      </View>
                    )}

                    <View style={styles.songInfo}>
                      <Text numberOfLines={1} style={styles.songTitle}>
                        {song.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.songArtist}>
                        {song.artists?.map((a) => a.name).join(', ') ||
                          song.artist?.name ||
                          'Melodify'}
                      </Text>
                    </View>
                  </Pressable>

                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => handleAddToQueue(song)}
                      style={[
                        styles.addQueueBtn,
                        isAdded && styles.addQueueBtnSuccess,
                      ]}
                    >
                      <AppIcon
                        name={isAdded ? 'check' : 'plus'}
                        color={isAdded ? theme.primaryOn : theme.primary}
                        size={14}
                      />
                      <Text
                        style={[
                          styles.addQueueBtnText,
                          isAdded && styles.addQueueBtnTextSuccess,
                        ]}
                      >
                        {isAdded ? 'Đã thêm' : 'Thêm'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handlePlaySong(song, [song, ...relatedSongs])}
                      style={styles.playNowIconBtn}
                    >
                      <AppIcon name="play" color={theme.primaryOn} size={13} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* TAB 3: TOPICS & PLAYLISTS */}
      {activeTab === 'topics' && (
        <View style={styles.tabContentFlex}>
          {/* Horizontal Topic Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicPillsBar}
          >
            {topics.map((t) => {
              const isSelected = t.slug === selectedTopicSlug;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => handleTopicPress(t)}
                  style={[
                    styles.topicPill,
                    isSelected && styles.topicPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.topicPillText,
                      isSelected && styles.topicPillTextActive,
                    ]}
                  >
                    {t.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollList}
          >
            {loadingTopics ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={theme.primary} size="small" />
                <Text style={styles.loadingText}>Đang tải nhạc theo chủ đề...</Text>
              </View>
            ) : filterList(topicSongs).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Chưa có bài hát trong chủ đề này</Text>
                <Text style={styles.emptySub}>
                  Chọn chủ đề khác phía trên để khám phá kho nhạc!
                </Text>
              </View>
            ) : (
              filterList(topicSongs).map((song) => {
                const isAdded = Boolean(addedIds[song.id]);
                return (
                  <View key={song.id} style={styles.songRowCard}>
                    <Pressable
                      onPress={() => handlePlaySong(song, topicSongs)}
                      style={styles.songMainTap}
                    >
                      {song.cover_url ? (
                        <Image source={{ uri: song.cover_url }} style={styles.songThumb} />
                      ) : (
                        <View style={[styles.songThumb, styles.coverFallback]}>
                          <AppIcon name="music" color={theme.textMuted} size={16} />
                        </View>
                      )}

                      <View style={styles.songInfo}>
                        <Text numberOfLines={1} style={styles.songTitle}>
                          {song.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.songArtist}>
                          {song.artists?.map((a) => a.name).join(', ') ||
                            song.artist?.name ||
                            'Melodify'}
                        </Text>
                      </View>
                    </Pressable>

                    <View style={styles.rowActions}>
                      <Pressable
                        onPress={() => handleAddToQueue(song)}
                        style={[
                          styles.addQueueBtn,
                          isAdded && styles.addQueueBtnSuccess,
                        ]}
                      >
                        <AppIcon
                          name={isAdded ? 'check' : 'plus'}
                          color={isAdded ? theme.primaryOn : theme.primary}
                          size={14}
                        />
                        <Text
                          style={[
                            styles.addQueueBtnText,
                            isAdded && styles.addQueueBtnTextSuccess,
                          ]}
                        >
                          {isAdded ? 'Đã thêm' : 'Thêm'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handlePlaySong(song, topicSongs)}
                        style={styles.playNowIconBtn}
                      >
                        <AppIcon name="play" color={theme.primaryOn} size={13} />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* TAB 4: SAVED & OFFLINE & FAVORITES */}
      {activeTab === 'saved' && (
        <View style={styles.tabContentFlex}>
          {/* Subfilter Pills */}
          <View style={styles.savedFilterRow}>
            <Pressable
              onPress={() => handleSavedFilterChange('recent')}
              style={[
                styles.savedFilterBtn,
                savedFilter === 'recent' && styles.savedFilterBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.savedFilterText,
                  savedFilter === 'recent' && styles.savedFilterTextActive,
                ]}
              >
                Đã nghe / Đã lưu offline
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSavedFilterChange('favorites')}
              style={[
                styles.savedFilterBtn,
                savedFilter === 'favorites' && styles.savedFilterBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.savedFilterText,
                  savedFilter === 'favorites' && styles.savedFilterTextActive,
                ]}
              >
                Bài hát yêu thích ♡
              </Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollList}
          >
            {loadingSaved ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={theme.primary} size="small" />
                <Text style={styles.loadingText}>Đang tải danh sách đã lưu...</Text>
              </View>
            ) : filterList(savedSongs).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  {savedFilter === 'recent'
                    ? 'Chưa có bài hát đã lưu trên thiết bị'
                    : 'Chưa có bài hát yêu thích'}
                </Text>
                <Text style={styles.emptySub}>
                  {savedFilter === 'recent'
                    ? 'Các bài hát bạn nghe sẽ tự động được lưu offline vào bộ nhớ tạm của máy!'
                    : 'Bấm biểu tượng trái tim khi đang nghe để lưu bài hát vào đây.'}
                </Text>
              </View>
            ) : (
              filterList(savedSongs).map((song) => {
                const isAdded = Boolean(addedIds[song.id]);
                return (
                  <View key={song.id} style={styles.songRowCard}>
                    <Pressable
                      onPress={() => handlePlaySong(song, savedSongs)}
                      style={styles.songMainTap}
                    >
                      {song.cover_url ? (
                        <Image source={{ uri: song.cover_url }} style={styles.songThumb} />
                      ) : (
                        <View style={[styles.songThumb, styles.coverFallback]}>
                          <AppIcon name="music" color={theme.textMuted} size={16} />
                        </View>
                      )}

                      <View style={styles.songInfo}>
                        <Text numberOfLines={1} style={styles.songTitle}>
                          {song.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.songArtist}>
                          {song.artists?.map((a) => a.name).join(', ') ||
                            song.artist?.name ||
                            'Melodify'}
                        </Text>
                      </View>
                    </Pressable>

                    <View style={styles.rowActions}>
                      <Pressable
                        onPress={() => handleAddToQueue(song)}
                        style={[
                          styles.addQueueBtn,
                          isAdded && styles.addQueueBtnSuccess,
                        ]}
                      >
                        <AppIcon
                          name={isAdded ? 'check' : 'plus'}
                          color={isAdded ? theme.primaryOn : theme.primary}
                          size={14}
                        />
                        <Text
                          style={[
                            styles.addQueueBtnText,
                            isAdded && styles.addQueueBtnTextSuccess,
                          ]}
                        >
                          {isAdded ? 'Đã thêm' : 'Thêm'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handlePlaySong(song, savedSongs)}
                        style={styles.playNowIconBtn}
                      >
                        <AppIcon name="play" color={theme.primaryOn} size={13} />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#151D1A',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#26342F',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E2824',
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabButtonActive: {
    backgroundColor: '#00D3E5',
  },
  tabButtonText: {
    color: '#8F9994',
    fontSize: 11,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#082326',
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B2421',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 6,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F5F7F6',
    fontSize: 12,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: '#8B9893',
    fontSize: 12,
  },
  tabContentFlex: {
    flex: 1,
  },
  scrollList: {
    paddingVertical: 6,
    gap: 8,
  },
  currentSongCard: {
    backgroundColor: '#1C2925',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 211, 229, 0.35)',
    marginBottom: 4,
  },
  nowPlayingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00D3E5',
  },
  nowPlayingLabel: {
    color: '#00D3E5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coverThumbActive: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  currentTitle: {
    color: '#F5F7F6',
    fontSize: 13,
    fontWeight: '800',
  },
  currentArtist: {
    color: '#93A49E',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  currentIndicatorBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 211, 229, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 2,
  },
  sectionTitle: {
    color: '#B6C4BF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionSubtext: {
    color: '#6F7E78',
    fontSize: 10,
  },
  refreshBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#202C27',
  },
  refreshBtnText: {
    color: '#00D3E5',
    fontSize: 10,
    fontWeight: '700',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#19221F',
    gap: 8,
  },
  queueItemActive: {
    backgroundColor: 'rgba(0, 211, 229, 0.12)',
    borderWidth: 1,
    borderColor: '#00D3E5',
  },
  queueItemPast: {
    opacity: 0.5,
  },
  queueIndexText: {
    color: '#6F7E78',
    fontSize: 11,
    fontWeight: '700',
    width: 18,
    textAlign: 'center',
  },
  queueIndexTextActive: {
    color: '#00D3E5',
    fontWeight: '900',
  },
  songThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
  },
  coverFallback: {
    backgroundColor: '#24302C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  songInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  songTitle: {
    color: '#F5F7F6',
    fontSize: 12,
    fontWeight: '700',
  },
  songTitleActive: {
    color: '#00D3E5',
    fontWeight: '800',
  },
  songTitlePast: {
    color: '#8E9C96',
  },
  songArtist: {
    color: '#82918B',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  songDuration: {
    color: '#6F7E78',
    fontSize: 10,
  },
  itemActionBtn: {
    padding: 6,
  },
  songRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#19221F',
    gap: 8,
  },
  songMainTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addQueueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#22302B',
  },
  addQueueBtnSuccess: {
    backgroundColor: '#00D3E5',
  },
  addQueueBtnText: {
    color: '#00D3E5',
    fontSize: 10,
    fontWeight: '700',
  },
  addQueueBtnTextSuccess: {
    color: '#082326',
    fontWeight: '800',
  },
  playNowIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00D3E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicPillsBar: {
    paddingVertical: 6,
    gap: 6,
  },
  topicPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#1E2824',
    borderWidth: 1,
    borderColor: '#2A3732',
  },
  topicPillActive: {
    backgroundColor: '#00D3E5',
    borderColor: '#00D3E5',
  },
  topicPillText: {
    color: '#909F99',
    fontSize: 11,
    fontWeight: '700',
  },
  topicPillTextActive: {
    color: '#082326',
    fontWeight: '800',
  },
  savedFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  savedFilterBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1E2824',
  },
  savedFilterBtnActive: {
    backgroundColor: '#293B34',
    borderWidth: 1,
    borderColor: '#00D3E5',
  },
  savedFilterText: {
    color: '#7F8E88',
    fontSize: 10.5,
    fontWeight: '700',
  },
  savedFilterTextActive: {
    color: '#00D3E5',
    fontWeight: '800',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    color: '#7F8E88',
    fontSize: 11,
  },
  emptyCard: {
    backgroundColor: '#1B2421',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    marginVertical: 12,
  },
  emptyTitle: {
    color: '#F5F7F6',
    fontSize: 12,
    fontWeight: '700',
  },
  emptySub: {
    color: '#7D8C86',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00D3E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 6,
  },
  emptyActionText: {
    color: '#082326',
    fontSize: 11,
    fontWeight: '800',
  },
});
