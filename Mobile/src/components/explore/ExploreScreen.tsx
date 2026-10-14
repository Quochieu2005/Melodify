import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MOCK_PLAYLISTS, MOCK_TOPICS, PlaylistItem } from '@/constants/mockData';

const categories = ['Tất cả', 'V-Pop', 'Remix', 'Acoustic', 'Hip-hop', 'K-Pop', 'C-Pop'];

export function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');

  const filteredPlaylists = useMemo(() => {
    return (MOCK_PLAYLISTS ?? []).filter((item) =>
      `${item.title} ${item.subtitle}`.toLowerCase().includes(query.toLowerCase()),
    );
  }, [query]);

  const filteredTopics = useMemo(() => {
    if (activeCategory === 'Tất cả') return MOCK_TOPICS ?? [];
    return (MOCK_TOPICS ?? []).filter((t) =>
      (t.category ?? '').toLowerCase().includes(activeCategory.toLowerCase()),
    );
  }, [activeCategory]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.kicker}>MELODIFY EXPLORE</Text>
          <Text style={styles.title}>Khám Phá Âm Nhạc</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            accessibilityLabel="Tìm kiếm bài hát, chủ đề hoặc playlist"
            onChangeText={setQuery}
            placeholder="Tìm bài hát, nghệ sĩ, playlist..."
            placeholderTextColor="#8C968F"
            style={styles.input}
            value={query}
            returnKeyType="search"
          />
        </View>

        {/* Category Filter Pills */}
        <ScrollView
          contentContainerStyle={styles.categoryList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {categories.map((item) => {
            const isSelected = activeCategory === item;
            return (
              <Pressable
                key={item}
                onPress={() => setActiveCategory(item)}
                style={[styles.category, isSelected && styles.categoryActive]}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Chủ Đề Âm Nhạc Grid */}
        <View style={styles.sectionHeading}>
          <View style={styles.titleWithBar}>
            <View style={styles.accentBar} />
            <Text style={styles.heading}>Chủ Đề & Thể Loại</Text>
          </View>
        </View>

        <View style={styles.topicsGrid}>
          {filteredTopics.map((topic) => (
            <Pressable
              key={topic.id}
              style={({ pressed }) => [styles.topicCard, pressed && styles.pressed]}
            >
              <Image source={{ uri: topic.imageUrl }} style={styles.topicImage} />
              <View style={styles.topicOverlay} />
              <View style={styles.topicContent}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{topic.category}</Text>
                </View>
                <Text numberOfLines={2} style={styles.topicTitle}>
                  {topic.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Playlist Tuyển Chọn */}
        <View style={styles.sectionHeading}>
          <View style={styles.titleWithBar}>
            <View style={styles.accentBar} />
            <Text style={styles.heading}>Playlist Nổi Bật</Text>
          </View>
          <Text style={styles.more}>Xem tất cả ›</Text>
        </View>

        <View style={styles.playlistsGrid}>
          {filteredPlaylists.map((item: PlaylistItem) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.playlistCard, pressed && styles.pressed]}
            >
              <View style={styles.playlistCoverWrap}>
                <Image source={{ uri: item.coverUrl }} style={styles.playlistCover} />
                <View style={styles.playlistPlayBtn}>
                  <Text style={styles.playlistPlayIcon}>▶</Text>
                </View>
              </View>
              <Text numberOfLines={1} style={styles.playlistTitle}>
                {item.title}
              </Text>
              <Text numberOfLines={2} style={styles.playlistSubtitle}>
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>

        {filteredPlaylists.length === 0 && (
          <Text style={styles.empty}>Không tìm thấy playlist phù hợp với từ khóa.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#202A28',
    flex: 1,
  },
  content: {
    gap: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 44,
  },
  header: {
    gap: 4,
  },
  kicker: {
    color: '#00D3E5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16201E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
    opacity: 0.7,
  },
  input: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 14,
  },
  categoryList: {
    gap: 8,
  },
  category: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#16201E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryActive: {
    backgroundColor: 'rgba(0, 211, 229, 0.2)',
    borderColor: '#00D3E5',
  },
  categoryText: {
    color: '#8C968F',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#00D3E5',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  titleWithBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#00D3E5',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  more: {
    color: '#BDBDBD',
    fontSize: 13,
    fontWeight: '600',
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  topicCard: {
    width: '48%',
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#16201E',
  },
  topicImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  topicOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 21, 0.65)',
  },
  topicContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 211, 229, 0.25)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    color: '#00D3E5',
    fontSize: 8.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  topicTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  playlistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  playlistCard: {
    width: '47.5%',
  },
  playlistCoverWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#16201E',
  },
  playlistCover: {
    width: '100%',
    height: '100%',
  },
  playlistPlayBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00D3E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  playlistPlayIcon: {
    color: '#072E31',
    fontSize: 11,
    marginLeft: 2,
  },
  playlistTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  playlistSubtitle: {
    color: '#8C968F',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  empty: {
    color: '#8C968F',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  pressed: {
    opacity: 0.75,
  },
});
