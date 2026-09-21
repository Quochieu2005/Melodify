import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContinueListeningSection } from '@/components/home/sections/ContinueListeningSection';
import { FeaturedMixSection } from '@/components/home/sections/FeaturedMixSection';
import { HomeHeader } from '@/components/home/sections/HomeHeader';
import { NowPlayingBar } from '@/components/home/sections/NowPlayingBar';
import { RecommendedSongsSection } from '@/components/home/sections/RecommendedSongsSection';

export default function MelodifyHomeScreen() {
  const [playingTitle, setPlayingTitle] = useState('Chưa có bài hát');

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HomeHeader />
        <View style={styles.intro}>
          <Text style={styles.greeting}>Chào buổi tối, Hiếu</Text>
          <Text style={styles.prompt}>Bật một giai điệu và để ngày trôi nhẹ hơn.</Text>
        </View>
        <FeaturedMixSection onPlay={setPlayingTitle} />
        <ContinueListeningSection onPlay={setPlayingTitle} />
        <RecommendedSongsSection onPlay={setPlayingTitle} />
        <View style={styles.footerSpace} />
      </ScrollView>
      {playingTitle !== 'Chưa có bài hát' && <NowPlayingBar title={playingTitle} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#0F120F', flex: 1 },
  content: { gap: 28, paddingHorizontal: 20, paddingTop: 14 },
  intro: { gap: 7, marginTop: 4 },
  greeting: { color: '#F5F6F0', fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  prompt: { color: '#8F988A', fontSize: 14, lineHeight: 20, maxWidth: 290 },
  footerSpace: { height: 22 },
});
