const PAGE_MAX_WIDTH = 980;
const PAGE_HORIZONTAL_PADDING = 32;
const ALBUM_GAP = 12;

export function getAlbumRailCardWidth(screenWidth: number): number {
  const contentWidth = Math.max(
    0,
    Math.min(screenWidth, PAGE_MAX_WIDTH) - PAGE_HORIZONTAL_PADDING,
  );

  const visibleCards =
    screenWidth >= 1440 ? 7
      : screenWidth >= 1024 ? 6
        : screenWidth >= 680 ? 5
          : screenWidth >= 540 ? 4
            : screenWidth >= 400 ? 3
              : 2;

  return Math.max(0, (contentWidth - ALBUM_GAP * (visibleCards - 1)) / visibleCards);
}
