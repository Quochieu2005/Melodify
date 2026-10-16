"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLoginModal } from "@/components/auth/LoginModalProvider";
import { ApiError, getVipTransactionHistory, type VipTransactionHistory } from "@/lib/api";

const paymentLogos = ["f_jcb.png", "f_visa.png", "f_master.png", "f_vnpay.png", "f_zalopay.png", "f_momo.png", "f_shopeepay.png", "f_atm.png"];

const methodNames: Record<string, string> = {
  card: "Thẻ tín dụng / Thẻ ghi nợ", shopeepay: "ShopeePay", atm: "Thẻ ATM", momo: "MoMo", zalopay: "ZaloPay", vnpay: "VNPAY", viettelpay: "Viettel Money",
};

function money(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đồng`;
}

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function VipTransactionHistoryPage() {
  const { user, authReady, openLogin } = useLoginModal();
  const [history, setHistory] = useState<VipTransactionHistory | null>(null);
  const [tab, setTab] = useState<"vip" | "xu">("vip");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      openLogin("/mua-vip/lich-su-giao-dich");
      return;
    }
    let cancelled = false;
    getVipTransactionHistory()
      .then((data) => { if (!cancelled) setHistory(data); })
      .catch((cause) => {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 401) openLogin("/mua-vip/lich-su-giao-dich");
        else setError(cause instanceof Error ? cause.message : "Không tải được lịch sử giao dịch.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authReady, user, openLogin]);

  if (authReady && !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fafafa] px-5 text-center text-[#18232b]">
        <section className="max-w-md rounded-lg border border-black/10 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold">Đăng nhập để xem lịch sử</h1>
          <p className="mt-3 text-sm leading-6 text-[#71808b]">Lịch sử giao dịch VIP chỉ hiển thị sau khi bạn đăng nhập.</p>
          <button type="button" onClick={() => openLogin("/mua-vip/lich-su-giao-dich")} className="mt-6 rounded-full bg-[#249be8] px-6 py-3 text-sm font-bold text-white hover:bg-[#168bd8]">Đăng nhập</button>
          <Link href="/mua-vip" className="mt-4 block text-sm font-semibold text-[#249be8]">Quay lại trang VIP</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#18232b]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white">
        <div className="mx-auto flex h-[58px] max-w-[1280px] items-center justify-between px-5">
          <Link href="/mua-vip" aria-label="Melodify VIP" className="flex items-center">
            <Image src="/vip/logo_nct.png" alt="NCT" width={70} height={38} className="h-9 w-auto object-contain" />
          </Link>
          <nav aria-label="Điều hướng VIP" className="flex h-full items-center text-xs font-bold sm:text-sm">
            <Link href="/mua-vip" className="flex h-full items-center px-3 text-[#52616a] sm:px-8">Mua VIP</Link>
            <span aria-current="page" className="flex h-full items-center border-b-2 border-[#249be8] px-3 sm:px-8">Lịch Sử Giao Dịch</span>
          </nav>
          <span className="max-w-[190px] truncate text-xs font-semibold sm:text-sm">{history?.user.username || user?.name || "Tài khoản"}</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-6">
        <div className="relative mt-5 overflow-hidden bg-[#e3f2fa] px-5 py-5 sm:px-10">
          <div className="vip-pattern pointer-events-none absolute inset-0 opacity-50" />
          <h1 className="relative text-center text-lg font-extrabold tracking-wide sm:text-2xl">Thông tin thanh toán</h1>
        </div>

        <div className="mx-auto mt-8 grid max-w-[920px] gap-6 md:grid-cols-[292px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="overflow-hidden rounded border border-black/10 bg-white">
              <h2 className="border-b border-black/10 px-5 py-4 text-sm font-bold">Thông tin cá nhân</h2>
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="grid size-14 shrink-0 place-items-center rounded bg-[#95756a] text-2xl text-white">{(history?.user.name || user?.name || "M").slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0"><p className="truncate text-sm font-bold">{history?.user.username || user?.username || user?.name || "Melodify user"}</p><p className="mt-1 text-xs text-[#85929a]">ID: {history?.user.id || user?.id || "—"}</p></div>
              </div>
              <dl className="divide-y divide-black/10 px-5 text-xs text-[#77858e]">
                <div className="flex gap-2 py-3"><dt>Tên hiển thị:</dt><dd className="truncate text-[#28343a]">{history?.user.name || user?.name || "—"}</dd></div>
                <div className="flex gap-2 py-3"><dt>Email:</dt><dd className="truncate text-[#28343a]">{history?.user.email || user?.email || "Chưa cập nhật"}</dd></div>
                <div className="flex gap-2 py-3"><dt>Điện thoại:</dt><dd className="text-[#28343a]">{history?.user.phone || user?.phone || "Chưa có số điện thoại"}</dd></div>
              </dl>
              <div className="border-t border-black/10 px-5 py-4 text-xs text-[#77858e]">Trạng thái tài khoản <span className="float-right font-semibold text-emerald-600">Đang hoạt động</span></div>
            </section>
            <section className="overflow-hidden rounded border border-black/10 bg-white">
              <h2 className="border-b border-black/10 px-5 py-4 text-sm font-bold">Thẻ đã giao dịch gần nhất</h2>
              <p className="px-5 py-7 text-xs text-[#94a0a8]">Chưa có thẻ giao dịch.</p>
            </section>
          </aside>

          <section className="min-w-0">
            <div role="tablist" aria-label="Loại giao dịch" className="flex justify-center rounded border border-black/10 bg-white">
              <button role="tab" aria-selected={tab === "vip"} onClick={() => setTab("vip")} className={`border-b-2 px-5 py-3 text-xs font-bold sm:px-8 ${tab === "vip" ? "border-[#249be8] text-[#17232b]" : "border-transparent text-[#73808a]"}`}>Giao dịch VIP</button>
              <button role="tab" aria-selected={tab === "xu"} onClick={() => setTab("xu")} className={`border-b-2 px-5 py-3 text-xs font-bold sm:px-8 ${tab === "xu" ? "border-[#249be8] text-[#17232b]" : "border-transparent text-[#73808a]"}`}>Giao dịch xu</button>
            </div>
            <div className="mt-2 overflow-hidden rounded border border-black/10 bg-white">
              <h2 className="border-b border-black/10 px-5 py-4 text-sm font-bold">10 lịch sử giao dịch gần nhất</h2>
              {tab === "vip" ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="bg-[#f7f7f7] font-bold"><tr><th className="px-5 py-3">Mã đơn</th><th className="px-3 py-3">Thời gian</th><th className="px-3 py-3">Kênh thanh toán</th><th className="px-3 py-3">Gói cước</th><th className="px-5 py-3 text-right">Số tiền</th></tr></thead>
                    <tbody className="divide-y divide-black/5">
                      {loading ? <tr><td colSpan={5} className="px-5 py-6 text-center text-[#87949c]">Đang tải lịch sử…</td></tr> : error ? <tr><td colSpan={5} className="px-5 py-6 text-center text-red-600">{error}</td></tr> : !history?.data.length ? <tr><td colSpan={5} className="px-5 py-6 text-[#9aa4aa]">Chưa có giao dịch</td></tr> : history.data.map((item) => <tr key={item.id}><td className="px-5 py-4 font-semibold">{item.payment_code || "—"}<span className="mt-1 block font-normal text-[#8b969d]">{item.status}</span></td><td className="px-3 py-4">{dateTime(item.created_at)}</td><td className="px-3 py-4">{methodNames[item.method] || item.method || "—"}</td><td className="px-3 py-4">{item.plan_name}</td><td className="px-5 py-4 text-right font-semibold">{money(item.amount)}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              ) : <p className="px-5 py-6 text-xs text-[#9aa4aa]">Chưa có giao dịch xu.</p>}
            </div>
          </section>
        </div>
      </div>

      <footer className="mt-8 bg-[#eee] px-4 py-4"><div className="mx-auto flex max-w-[920px] flex-wrap items-center justify-center gap-6">{paymentLogos.map((file) => <Image key={file} src={`/vip/${file}`} alt="" width={64} height={34} className="h-8 w-auto object-contain" />)}</div><p className="mt-4 text-center text-[11px] text-[#7e8a91]">Melodify VIP · Hỗ trợ · Thỏa thuận sử dụng</p></footer>
    </main>
  );
}
