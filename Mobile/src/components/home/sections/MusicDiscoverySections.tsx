import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ArtistItem,
  MOCK_ARTISTS,
  MOCK_PLAYLISTS,
  PlaylistItem,
} from '@/constants/mockData';

interface MusicDiscoverySectionsProps {
  onPlaylistPress?: (playlist: PlaylistItem) => void;
  onArtistPress?: (artist: ArtistItem) => void;
}

export function MusicDiscoverySections({
  onPlaylistPress,
  onArtistPress,
}: MusicDiscoverySectionsProps) {
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({
    'art-1': true,
    'art-4': true,
    'art-5': true,
  });

  const toggleFollow = (artistId: string) => {
    setFollowedMap((prev) => ({
      ...prev,
      [artistId]: !prev[artistId],
    }));
  };

  return (
    <View style={styles.container}>
      {/* 1. Curated Playlists Section */}
      <View style={styles.sectionBlock}>
        <View style={styles.headingRow}>
          <View style={styles.titleWithBar}>
            <View style={styles.accentBar} />
            <Text style={styles.heading}>Playlist Tuyển Chọn</Text>
          </View>
          <Pressable hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.more}>Thêm ›</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {MOCK_PLAYLISTS.map((playlist) => (
            <Pressable
              key={playlist.id}
              onPress={() => onPlaylistPress?.(playlist)}
              style={({ pressed }) => [styles.playlistCard, pressed && styles.pressed]}
            >
              <View style={styles.playlistCoverWrap}>
                <Image source={{ uri: playlist.coverUrl }} style={styles.playlistCover} />
                <View style={styles.playlistBadge}>
                  <Text style={styles.playlistBadgeText}>{playlist.songCount} bài hát</Text>
                </View>
                <View style={styles.playlistPlayBtn}>
                  <Text style={styles.playlistPlayIcon}>▶</Text>
                </View>
              </View>
              <Text numberOfLines={1} style={styles.playlistTitle}>
                {playlist.title}
              </Text>
              <Text numberOfLines={1} style={styles.playlistSubtitle}>
                {playlist.subtitle}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 2. Trending Artists Section */}
      <View style={styles.sectionBlock}>
        <View style={styles.headingRow}>
          <View style={styles.titleWithBar}>
            <View style={styles.accentBar} />
            <Text style={styles.heading}>Nghệ Sĩ Được Quan Tâm</Text>
          </View>
          <Pressable hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.more}>Xem tất cả ›</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {MOCK_ARTISTS.map((artist) => {
            const isFollowed = followedMap[artist.id];

            return (
              <Pressable
                key={artist.id}
                onPress={() => onArtistPress?.(artist)}
                style={({ pressed }) => [styles.artistCard, pressed && styles.pressed]}
              >
                <View style={styles.artistAvatarWrap}>
                  <Image source={{ uri: artist.avatarUrl }} style={styles.artistAvatar} />
                  <View style={styles.artistVerifyBadge}>
                    <Text style={styles.artistVerifyText}>✓</Text>
                  </View>
                </View>

                <Text numberOfLines={1} style={styles.artistName}>
                  {artist.name}
                </Text>
                <Text numberOfLines={1} style={styles.artistFollowers}>
                  {artist.followers}
                </Text>

                <Pressable
                  onPress={() => toggleFollow(artist.id)}
                  style={[styles.followButton, isFollowed && styles.followButtonActive]}
                >
                  <Text style={[styles.followText, isFollowed && styles.followTextActive]}>
                    {isFollowed ? 'Đang theo dõi' : '+ Theo dõi'}
                  </Text>
                </Pressable>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Music Partners Footer */}
      <View style={styles.partnersBlock}>
        <Text style={styles.partnersHeading}>ĐỐI TÁC ÂM NHẠC CHÍNH THỨC</Text>
        <View style={styles.partnersRow}>
          {['SONY MUSIC', 'UNIVERSAL', 'WARNER', 'BELIEVE', 'THE ORCHARD'].map((partner) => (
            <View key={partner} style={styles.partnerBadge}>
              <Text style={styles.partnerText}>{partner}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  sectionBlock: {
    gap: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  more: {
    color: '#BDBDBD',
    fontSize: 13,
    fontWeight: '600',
  },
  horizontalList: {
    gap: 14,
    paddingRight: 6,
  },
  playlistCard: {
    width: 148,
  },
  playlistCoverWrap: {
    width: 148,
    height: 148,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#16201E',
  },
  playlistCover: {
    width: '100%',
    height: '100%',
  },
  playlistBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playlistBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  playlistPlayBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 12,
    marginLeft: 2,
  },
  playlistTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  playlistSubtitle: {
    color: '#BDBDBD',
    fontSize: 11,
    marginTop: 2,
  },
  artistCard: {
    width: 130,
    alignItems: 'center',
    backgroundColor: '#16201E',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  artistAvatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#263230',
  },
  artistAvatar: {
    width: '100%',
    height: '100%',
  },
  artistVerifyBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#00D3E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#16201E',
  },
  artistVerifyText: {
    color: '#072E31',
    fontSize: 9,
    fontWeight: '900',
  },
  artistName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  artistFollowers: {
    color: '#8C968F',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  followButton: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  followButtonActive: {
    borderColor: '#00D3E5',
    backgroundColor: 'rgba(0, 211, 229, 0.15)',
  },
  followText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  followTextActive: {
    color: '#00D3E5',
  },
  partnersBlock: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  partnersHeading: {
    color: '#8C968F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  partnersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  partnerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  partnerText: {
    color: '#BDBDBD',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
