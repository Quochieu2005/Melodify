/** Shown under a song list the API cut short (album and artist pages return at most 500 songs). */
export function SongListLimitNotice({ truncated, shown, total }: { truncated?: boolean; shown: number; total?: number }) {
  if (!truncated) return null;

  return (
    <p role="status" className="mt-5 rounded-lg bg-white/[0.06] px-4 py-3 text-[13px] text-white/70">
      {total && total > shown
        ? `Đang hiển thị ${shown.toLocaleString('vi-VN')} bài đầu tiên trong tổng số ${total.toLocaleString('vi-VN')} bài.`
        : `Đang hiển thị ${shown.toLocaleString('vi-VN')} bài đầu tiên; nghệ sĩ còn nhiều bài hơn.`}
    </p>
  );
}
