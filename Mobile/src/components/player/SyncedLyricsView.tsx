import { useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ParsedLyricLine } from '@/lib/lyrics';
import { useAdaptiveStyles } from '@/hooks/use-adaptive-styles';

type SyncedLyricsViewProps = {
  lyrics: ParsedLyricLine[];
  plainText?: string | null;
  activeLyricIndex: number;
  onSeekToLine: (seconds: number) => void;
  containerHeight?: number;
};

const APPROX_LINE_HEIGHT = 52;

export function SyncedLyricsView({
  lyrics,
  plainText,
  activeLyricIndex,
  onSeekToLine,
  containerHeight = 440,
}: SyncedLyricsViewProps) {
  const styles = useAdaptiveStyles(baseStyles);
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);
  const lineOffsets = useRef<{ [index: number]: number }>({});

  // Auto-scroll so the active line is pinned down by 1 sentence (Ảnh 3):
  // 1 previous sentence sits at the top (faded), and active line is at sentence #2 (white bold)
  useEffect(() => {
    if (activeLyricIndex >= 0 && scrollViewRef.current && lyrics.length > 0) {
      if (activeLyricIndex === 0) {
        // Line 0 sits at the second line position naturally due to paddingTop: 52
        scrollViewRef.current.scrollTo({
          y: 0,
          animated: true,
        });
      } else {
        // Line activeLyricIndex - 1 scrolls to y=0 (top edge),
        // placing activeLyricIndex at the second line position
        const prevIndex = activeLyricIndex - 1;
        const targetY =
          lineOffsets.current[prevIndex] ?? (prevIndex * APPROX_LINE_HEIGHT + 52);

        scrollViewRef.current.scrollTo({
          y: Math.max(0, targetY),
          animated: true,
        });
      }
    }
  }, [activeLyricIndex, lyrics.length]);

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {lyrics.length > 0 ? (
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {lyrics.map((line, index) => {
            const isActive = index === activeLyricIndex;

            return (
              <Pressable
                key={line.id}
                onLayout={(e) => {
                  lineOffsets.current[index] = e.nativeEvent.layout.y;
                }}
                onPress={() => onSeekToLine(line.time)}
                style={styles.linePressable}
              >
                <Text
                  style={[
                    styles.lineText,
                    isActive && styles.activeLineText,
                  ]}
                >
                  {line.text}
                </Text>
              </Pressable>
            );
          })}

          <Text style={styles.providerCredit}>
            Cung cấp bởi NCT Sound2Words
          </Text>
        </ScrollView>
      ) : plainText && plainText.trim() ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.plainScrollContent}
        >
          <Text style={styles.plainLyrics}>{plainText.trim()}</Text>
          <Text style={styles.providerCredit}>
            Cung cấp bởi NCT Sound2Words
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có lời cho bài hát này</Text>
          <Text style={styles.emptySubText}>
            Hãy cùng thưởng thức giai điệu tuyệt vời nhé!
          </Text>
        </View>
      )}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    width: '100%',
  },
  scrollContent: {
    paddingTop: 52, // Offsets the first line by 1 sentence so it aligns with sentence #2
    paddingBottom: 450,
    paddingHorizontal: 24,
    gap: 10,
  },
  linePressable: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  lineText: {
    color: 'rgba(255, 255, 255, 0.42)',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 30,
    textAlign: 'left',
  },
  activeLineText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 36,
  },
  providerCredit: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 40,
    marginBottom: 20,
  },
  plainScrollContent: {
    paddingTop: 30,
    paddingBottom: 160,
    paddingHorizontal: 24,
  },
  plainLyrics: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'left',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
});
