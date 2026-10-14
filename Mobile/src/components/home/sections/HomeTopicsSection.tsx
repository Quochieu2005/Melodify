import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const row1 = [
  {
    id: 't-tiktok',
    title: 'TikTok',
    isTikTok: true,
    bg: '#000000',
  },
  {
    id: 't-remix',
    title: 'Remix',
    bg: '#3B0764',
    imageUrl: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 't-bolero',
    title: 'Bolero',
    bg: '#701A75',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
  },
];

const row2 = [
  {
    id: 't-nhactre',
    title: 'Nhạc Trẻ',
    bg: '#0F766E',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 't-nhachoa',
    title: 'Nhạc Hoa',
    bg: '#92400E',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 't-kpop',
    title: 'K-Pop',
    bg: '#1E1B4B',
    imageUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=400&q=80',
  },
];

export function HomeTopicsSection() {
  return (
    <View style={styles.container}>
      {/* Heading Row */}
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Chủ Đề</Text>
        <Pressable hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.more}>Thêm</Text>
        </Pressable>
      </View>

      {/* 2 Rows of Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.gridColumn}>
          {/* Row 1: TikTok, Remix, Bolero */}
          <View style={styles.cardRow}>
            {row1.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: item.bg },
                  pressed && styles.pressed,
                ]}
              >
                {item.imageUrl && (
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
                )}
                <View style={styles.cardDimmer} />

                {/* Title */}
                <Text style={styles.cardTitle}>{item.title}</Text>

                {/* Official TikTok Icon with Chromatic Cyan/Pink Shift */}
                {item.isTikTok && (
                  <View style={styles.tiktokGraphicWrap}>
                    {/* Shadow / Red layer */}
                    <Text style={[styles.tiktokSymbol, styles.tiktokRed]}>♪</Text>
                    {/* Foreground / Cyan layer */}
                    <Text style={[styles.tiktokSymbol, styles.tiktokCyan]}>♪</Text>
                    {/* Core White layer */}
                    <Text style={[styles.tiktokSymbol, styles.tiktokWhite]}>♪</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Row 2: Nhạc Trẻ, Nhạc Hoa, K-Pop */}
          <View style={styles.cardRow}>
            {row2.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: item.bg },
                  pressed && styles.pressed,
                ]}
              >
                {item.imageUrl && (
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
                )}
                <View style={styles.cardDimmer} />
                <Text style={styles.cardTitle}>{item.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    gap: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  more: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingRight: 14,
  },
  gridColumn: {
    gap: 10,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    width: 154,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    padding: 10,
    justifyContent: 'flex-start',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardDimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 2,
  },
  tiktokGraphicWrap: {
    position: 'absolute',
    right: 12,
    bottom: 4,
    width: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tiktokSymbol: {
    position: 'absolute',
    fontSize: 48,
    fontWeight: '900',
  },
  tiktokRed: {
    color: '#FE2C55',
    top: 2,
    left: 4,
  },
  tiktokCyan: {
    color: '#25F4EE',
    top: -2,
    left: -4,
  },
  tiktokWhite: {
    color: '#FFFFFF',
    top: 0,
    left: 0,
  },
  pressed: {
    opacity: 0.85,
  },
});
