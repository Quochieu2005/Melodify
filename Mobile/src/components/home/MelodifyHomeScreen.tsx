import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BannerCarousel,
  HomeHeader,
  HomeTabBar,
  HomeTopicsSection,
  NowPlayingBar,
  RankingSection,
} from '@/components/home/sections';
import { DEFAULT_CURRENT_TRACK, SongItem } from '@/constants/mockData';

export default function MelodifyHomeScreen() {
  const [currentTrack, setCurrentTrack] = useState<SongItem>(DEFAULT_CURRENT_TRACK);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlaySong = (song: SongItem) => {
    setCurrentTrack(song);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  return (
    <View style={styles.root}>
      {/* Small Sky Blue Gradient at top header only */}
      <LinearGradient
        colors={['#BAE6FD', '#E0F2FE', '#FFFFFF']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.skyBlueHeaderGradient}
      />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Scrollable Feed */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: NCT Brand & 2 Circle Buttons */}
          <HomeHeader />

          {/* Banner: Nhạc Mới Triển Vọng & 4 Dots */}
          <BannerCarousel />

          {/* Chủ Đề: TikTok, Remix, Nhạc Trẻ, Nhạc Hoa */}
          <HomeTopicsSection />

          {/* Bảng Xếp Hạng: Top 50 Bài Hát Thịnh Hành */}
          <RankingSection
            onPlaySong={handlePlaySong}
            activeSongId={currentTrack?.id}
          />

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Floating Now Playing Pill Dock */}
        <NowPlayingBar
          track={currentTrack}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
        />

        {/* Bottom Tab Bar (Dành cho bạn, Khám Phá, Của Tui) */}
        <HomeTabBar />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skyBlueHeaderGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 20,
  },
  bottomSpacer: {
    height: 16,
  },
});
