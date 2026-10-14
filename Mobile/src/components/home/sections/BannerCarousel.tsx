import { useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MOCK_BANNERS } from '@/constants/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;

export function BannerCarousel() {
  const [activeIndex, setActiveIndex] = useState(1); // 2nd dot cyan like in screenshot

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / BANNER_WIDTH);
    if (index >= 0 && index < MOCK_BANNERS.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      {/* Banner Horizontal Scroll */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={BANNER_WIDTH + 12}
        contentContainerStyle={styles.scrollContent}
      >
        {MOCK_BANNERS.map((banner, index) => (
          <Pressable
            key={banner.id}
            style={({ pressed }) => [styles.bannerCard, pressed && styles.pressed]}
          >
            {/* Banner Background Image */}
            <Image source={{ uri: banner.imageUrl }} style={styles.bannerImage} />

            {/* Dark Aesthetic Overlay */}
            <View style={styles.darkOverlay} />

            {/* Banner Text / Graphics */}
            <View style={styles.textWrap}>
              <Text style={styles.bannerTitle}>
                {index === 0 ? 'Nhạc Mới' : banner.title}
              </Text>
              <Text style={styles.bannerScript}>
                {index === 0 ? 'Triển Vọng' : banner.subtitle}
              </Text>
            </View>

            {/* Centered Pagination Dots inside banner (bottom) */}
            <View style={styles.dotsRow}>
              {MOCK_BANNERS.map((_, dotIndex) => (
                <View
                  key={dotIndex}
                  style={[
                    styles.dot,
                    dotIndex === activeIndex ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
  },
  scrollContent: {
    gap: 12,
  },
  bannerCard: {
    width: BANNER_WIDTH,
    height: 125,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 26, 0.45)',
  },
  textWrap: {
    position: 'absolute',
    top: 18,
    left: 20,
    zIndex: 2,
  },
  bannerTitle: {
    color: '#FACB8A',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bannerScript: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 3,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  activeDot: {
    width: 14,
    backgroundColor: '#00D3E5',
  },
  inactiveDot: {
    width: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  pressed: {
    opacity: 0.9,
  },
});
