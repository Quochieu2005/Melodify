import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface HomeTabBarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function HomeTabBar({
  activeTab = 'kham-pha',
  onTabChange,
}: HomeTabBarProps) {
  const [selected, setSelected] = useState(activeTab);

  const handleSelect = (tabKey: string) => {
    setSelected(tabKey);
    onTabChange?.(tabKey);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {/* Tab 1: Dành cho bạn */}
        <Pressable
          onPress={() => handleSelect('danh-cho-ban')}
          style={styles.tabItem}
        >
          <View style={styles.customIconWrap}>
            <Text style={styles.barLines}>ııl</Text>
            <Text style={styles.miniHeart}>♥</Text>
          </View>
          <Text
            style={[
              styles.tabLabel,
              selected === 'danh-cho-ban' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Dành cho bạn
          </Text>
        </Pressable>

        {/* Tab 2: Khám Phá (Active by default) */}
        <Pressable
          onPress={() => handleSelect('kham-pha')}
          style={styles.tabItem}
        >
          <View style={styles.equalizerWrap}>
            <View style={[styles.eqBar, styles.eqBar1]} />
            <View style={[styles.eqBar, styles.eqBar2]} />
            <View style={[styles.eqBar, styles.eqBar3]} />
            <View style={[styles.eqBar, styles.eqBar4]} />
          </View>
          <Text
            style={[
              styles.tabLabel,
              selected === 'kham-pha' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Khám Phá
          </Text>
        </Pressable>

        {/* Tab 3: Của Tui */}
        <Pressable
          onPress={() => handleSelect('cua-tui')}
          style={styles.tabItem}
        >
          <View style={styles.userIconWrap}>
            <View style={styles.userHead} />
            <View style={styles.userBody} />
          </View>
          <Text
            style={[
              styles.tabLabel,
              selected === 'cua-tui' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Của Tui
          </Text>
        </Pressable>
      </View>

      {/* iOS Home Indicator Bar */}
      <View style={styles.homeIndicatorWrap}>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 6,
    paddingBottom: 4,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 80,
    paddingVertical: 2,
  },
  customIconWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 22,
    position: 'relative',
    paddingRight: 6,
  },
  barLines: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '900',
    letterSpacing: -1,
  },
  miniHeart: {
    position: 'absolute',
    top: 0,
    right: -2,
    fontSize: 11,
    color: '#9CA3AF',
  },
  equalizerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 22,
    gap: 3,
    paddingBottom: 2,
  },
  eqBar: {
    width: 3.2,
    backgroundColor: '#111827',
    borderRadius: 1.6,
  },
  eqBar1: {
    height: 10,
  },
  eqBar2: {
    height: 18,
  },
  eqBar3: {
    height: 14,
  },
  eqBar4: {
    height: 8,
  },
  userIconWrap: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    gap: 2,
  },
  userHead: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.8,
    borderColor: '#9CA3AF',
  },
  userBody: {
    width: 17,
    height: 7,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.8,
    borderBottomWidth: 0,
    borderColor: '#9CA3AF',
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: '#111827',
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  homeIndicatorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  homeIndicator: {
    width: 134,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#000000',
  },
});
