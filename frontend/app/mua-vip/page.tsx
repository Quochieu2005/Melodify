"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLoginModal } from "@/components/auth/LoginModalProvider";
import { getSubscriptionPlans, type SubscriptionPlanRecord } from "@/lib/api";

const features = [
  [
    "Không quảng cáo",
    "Tận hưởng không gian âm nhạc mà không bị quảng cáo làm phiền",
  ],
  ["Nhạc chất lượng cao", "Thưởng thức âm nhạc với chất lượng vượt trội"],
  [
    "Tải nhạc không giới hạn",
    "Tải các bài hát yêu thích và nghe khi không có kết nối mạng",
  ],
  [
    "Sử dụng trên nhiều thiết bị",
    "Đồng bộ kho nhạc trên ứng dụng, website và Tivi",
  ],
];

const benefits = [
  ["Trải nghiệm âm thanh, hình ảnh tiêu chuẩn", true, true],
  ["Nghe nhạc, xem video chất lượng cao", false, true],
  ["Tải nhạc không giới hạn", false, true],
  ["Không bị làm phiền bởi quảng cáo", false, true],
  ["Thời gian kiểm duyệt nội dung đăng tải trong vòng 12 giờ", false, true],
  ["Trải nghiệm âm nhạc đẳng cấp", false, true],
] as const;

function Logo() {
  return (
    <Link
      href="/home"
      aria-label="Melodify — về trang chủ"
      className="flex shrink-0 items-center gap-2 text-[#1c1e20] outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-xl text-white shadow-[0_5px_14px_rgba(124,92,255,0.24)]">
        ♫
      </span>
      <span className="text-lg font-bold tracking-[-0.04em] sm:text-xl">
        Melodify
      </span>
    </Link>
  );
}

function Crown() {
  return (
    <span className="grid size-9 place-items-center rounded-full bg-[#ffc40e] text-white shadow-sm">
      <svg
        viewBox="0 0 24 24"
        className="size-5 fill-current"
        aria-hidden="true"
      >
        <path d="m3 6 4.5 4L12 4l4.5 6L21 6l-1.5 12h-15L3 6Zm3.2 10h11.6l.4-3.2-2.6 2.2L12 9.8l-3.6 5.2-2.6-2.2.4 3.2Z" />
      </svg>
    </span>
  );
}

function Check({ active }: { active: boolean }) {
  return active ? (
    <span className="text-2xl font-bold text-[#ffc40e]" aria-label="Có">
      ✓
    </span>
  ) : (
    <span className="text-2xl font-light text-[#f44336]" aria-label="Không">
      ×
    </span>
  );
}

export default function MuaVipPage() {
  const router = useRouter();
  const { user, openLogin, logout } = useLoginModal();
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  const monthlyPrice = useMemo(
    () => plans.find((plan) => plan.billing_cycle === "monthly")?.price ?? null,
    [plans],
  );

  async function loadPlans() {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await getSubscriptionPlans();
      setPlans(response.data);
    } catch {
      setLoadError("Chưa tải được danh sách gói VIP. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    getSubscriptionPlans()
      .then((response) => {
        if (!cancelled) setPlans(response.data);
      })
      .catch(() => {
        if (!cancelled)
          setLoadError("Chưa tải được danh sách gói VIP. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function redeemCode() {
    setMessage(
      code.trim()
        ? "Tính năng đổi mã VIP chưa được cấu hình."
        : "Vui lòng nhập mã VIP CODE.",
    );
  }

  const money = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(amount);

  return (
    <main className="min-h-screen bg-[#fff] font-sans text-[#1c1e20]">
      <header className="sticky top-0 z-30 h-[57px] border-b border-black/5 bg-white">
        <div className="mx-auto flex h-full max-w-[1334px] items-center px-6">
          <Logo />
          <nav
            className="absolute left-1/2 top-0 flex h-[57px] -translate-x-1/2"
            aria-label="VIP navigation"
          >
            <Link
              href="/mua-vip"
              className="flex w-[72px] items-center justify-center border-b-2 border-[#2daaed] text-[10px] font-bold sm:w-40 sm:text-sm"
            >
              Mua VIP
            </Link>
            <button
              type="button"
              onClick={() => user ? router.push('/mua-vip/lich-su-giao-dich') : openLogin('/mua-vip/lich-su-giao-dich')}
              className="flex w-[72px] items-center justify-center text-[10px] font-semibold text-black/75 hover:border-b-2 hover:border-[#2daaed] sm:w-40 sm:text-sm"
            >
              <span className="sm:hidden">Lịch sử</span>
              <span className="hidden sm:inline">Lịch Sử Giao Dịch</span>
            </button>
          </nav>
          {user ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="ml-auto flex max-w-[190px] items-center gap-2 truncate text-sm text-black/65 hover:text-black"
              title="Đăng xuất"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-black/45 text-lg">
                {user.name?.charAt(0)?.toUpperCase() || "♙"}
              </span>
              <span className="truncate">
                {user.name || "Tài khoản"} · Đăng xuất
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openLogin('/mua-vip')}
              className="ml-auto flex items-center gap-2 text-sm text-black/65 hover:text-black"
            >
              <span className="grid size-8 place-items-center rounded-full border-2 border-black/45 text-lg">
                ♙
              </span>
              <span className="hidden sm:inline">Đăng nhập</span>
            </button>
          )}
        </div>
      </header>

      <section className="relative overflow-hidden pb-24 pt-20">
        <div className="vip-pattern absolute inset-x-0 top-0 h-[480px] opacity-90" />
        <div className="relative mx-auto max-w-[1170px] px-5">
          <div className="text-center">
            <div className="flex justify-center">
              <Crown />
            </div>
            <h1 className="mt-4 text-3xl font-black uppercase tracking-tight sm:text-[32px]">
              Nâng Cấp Tài Khoản NhacCuaTui VIP
            </h1>
            <p className="mt-3 text-base text-black/50">
              Không quảng cáo - Tải nhạc không giới hạn - Nhiều đặc quyền dành
              cho VIP
            </p>
          </div>

          <div className="mx-auto mt-14 grid w-full max-w-[740px] grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 sm:gap-8">
            {isLoading ? (
              <p
                className="col-span-full py-12 text-sm text-black/55"
                role="status"
              >
                Đang tải các gói VIP…
              </p>
            ) : null}
            {loadError ? (
              <div className="col-span-full text-center" role="alert">
                <p className="text-sm text-red-600">{loadError}</p>
                <button
                  type="button"
                  onClick={() => void loadPlans()}
                  className="mt-3 rounded-full border border-black/15 px-4 py-2 text-sm font-semibold hover:bg-black/5"
                >
                  Tải lại
                </button>
              </div>
            ) : null}
            {!isLoading && !loadError && plans.length === 0 ? (
              <p className="col-span-full py-12 text-sm text-black/55">
                Hiện chưa có gói VIP đang hoạt động.
              </p>
            ) : null}
            {plans.map((plan) => {
              const isYearly = plan.billing_cycle === "yearly";
              const regularPrice =
                isYearly && monthlyPrice
                  ? monthlyPrice * plan.billing_months
                  : null;
              const savings =
                regularPrice && regularPrice > plan.price
                  ? Math.round((1 - plan.price / regularPrice) * 100)
                  : 0;
              return (
                <Link
                  key={plan.id}
                  href={`/mua-vip/thanh-toan?plan=${encodeURIComponent(plan.id)}`}
                  aria-label={`Chọn ${plan.name}, ${money(plan.price)} đồng`}
                  className="vip-card group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2daaed]/40"
                >
                  <p className="absolute left-4 top-7 text-sm uppercase text-white">
                    Gói
                    <br />
                    <strong className="text-[22px] leading-8">
                      {plan.billing_months >= 12 &&
                      plan.billing_months % 12 === 0
                        ? `${plan.billing_months / 12} năm`
                        : plan.billing_months > 1
                          ? `${plan.billing_months} tháng`
                          : isYearly
                            ? "Năm"
                            : plan.billing_cycle === "monthly"
                              ? "Tháng"
                              : plan.name}
                    </strong>
                  </p>
                  <p className="absolute right-5 top-9 text-right text-base font-bold text-black/25">
                    {regularPrice && savings > 0 ? (
                      <>
                        <del className="text-xs">{money(regularPrice)} Đ</del>
                        <br />
                      </>
                    ) : null}
                    <strong className="text-[clamp(24px,4vw,32px)] text-black/90">
                      {money(plan.price)}
                    </strong>
                    <br />
                    Đồng
                  </p>
                  {isYearly && savings > 0 ? (
                    <span className="absolute right-1 top-1 rounded-bl-2xl bg-[#f44336] px-3 py-1 text-xs text-white">
                      Tiết kiệm {savings}%
                    </span>
                  ) : !isYearly ? (
                    <span className="absolute right-1 top-1 rounded-bl-2xl bg-gradient-to-r from-[#95d96d] to-[#2daaed] px-4 py-1 text-xs text-white">
                      Gói VIP
                    </span>
                  ) : null}
                  <span className="absolute bottom-1 right-1 rounded-tl-2xl bg-gradient-to-r from-[#f2af12] to-[#ffd200] px-4 py-1.5 text-xs text-white">
                    Chọn gói ›
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mx-auto mt-24 max-w-[430px] text-center">
            <h2 className="text-[23px] font-bold uppercase">
              Nhập mã code nhaccuatui VIP
            </h2>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Nhập VIP CODE tại đây"
              className="mt-10 h-12 w-full border border-black/10 px-4 text-sm outline-none focus:border-[#00d3e5]"
            />
            <button
              type="button"
              onClick={redeemCode}
              className="mt-10 h-16 w-full rounded bg-gradient-to-r from-[#f2af12] to-[#ffd200] text-base font-bold text-white transition hover:brightness-105"
            >
              Nâng cấp VIP
            </button>
            {message && (
              <p className="mt-3 text-sm text-[#f2af12]" role="status">
                {message}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#fafafa] px-5 py-20">
        <div className="mx-auto max-w-[1110px] text-center">
          <h2 className="text-[28px] font-bold">Tính năng NhacCuaTui VIP</h2>
          <p className="mt-3 text-base text-black/50">
            Trải nghiệm âm nhạc đẳng cấp mà không bị giới hạn
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(([title, description], index) => (
              <article key={title} className="px-4">
                <Image
                  src={`/vip/0${index + 1}.png`}
                  alt=""
                  width={120}
                  height={120}
                  className="mx-auto size-24 object-contain"
                />
                <h3 className="mt-5 text-sm font-bold uppercase">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-black/50">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-[#fafafa] px-5 pb-32 pt-16">
        <div className="mx-auto max-w-[1110px]">
          <div className="overflow-hidden rounded-md border border-black/10">
            <div className="grid grid-cols-[1fr_22%_22%] items-center border-b border-black/10 py-4 text-center">
              <strong className="px-5 text-left text-base uppercase">
                Tính năng
              </strong>
              <strong className="border-l border-black/10 text-3xl text-[#2daaed]">
                ♢
              </strong>
              <strong className="border-l border-black/10 text-3xl text-[#ffc40e]">
                ♢
              </strong>
            </div>
            {benefits.map(([title, free, vip]) => (
              <div
                key={title}
                className="grid min-h-16 grid-cols-[1fr_22%_22%] items-center border-b border-black/10 bg-white/90 last:border-0"
              >
                <span className="px-5 text-sm font-bold">{title}</span>
                <span className="flex h-full items-center justify-center border-l border-black/10">
                  <Check active={free} />
                </span>
                <span className="flex h-full items-center justify-center border-l border-black/10">
                  <Check active={vip} />
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-center pt-10">
            <button
              type="button"
              className="h-16 w-[325px] rounded bg-gradient-to-r from-[#f2af12] to-[#ffd200] text-base font-bold text-white"
            >
              Nâng cấp VIP
            </button>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#237bc1] to-[#0c9bc0] px-5 py-8">
        <div className="mx-auto flex max-w-[970px] flex-wrap items-center justify-center gap-7 rounded bg-white px-8 py-5 shadow-sm">
          {[
            "logo_nct.png",
            "f_visa.png",
            "f_master.png",
            "f_vnpay.png",
            "f_zalopay.png",
            "f_momo.png",
            "f_shopeepay.png",
            "f_atm.png",
            "f_vcoin.png",
            "f_viettelpay_20210927.png",
            "f_jcb.png",
          ].map((file) => (
            <Image
              key={file}
              src={`/vip/${file}`}
              alt=""
              width={80}
              height={38}
              className="h-8 w-auto object-contain"
            />
          ))}
        </div>
      </section>

      <footer className="bg-[#202020] px-5 py-10 text-center text-sm text-white/60">
        <p className="font-bold text-white">Melodify · NhacCuaTui VIP</p>
        <p className="mt-3">
          © 2026 Melodify. Trải nghiệm âm nhạc chất lượng cao.
        </p>
      </footer>
    </main>
  );
}
