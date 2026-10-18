"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useLoginModal } from "@/components/auth/LoginModalProvider";
import {
  ApiError,
  createVipCheckout,
  getSubscriptionPlans,
  type SubscriptionPlanRecord,
  type VipCheckoutOrder,
  type VipPaymentMethod,
} from "@/lib/api";

const paymentMethods: {
  id: VipPaymentMethod;
  label: string;
  logos: string[];
}[] = [
  {
    id: "card",
    label: "Thẻ tín dụng / Thẻ ghi nợ",
    logos: ["f_visa.png", "f_master.png"],
  },
  { id: "shopeepay", label: "Ví ShopeePay", logos: ["f_shopeepay.png"] },
  {
    id: "atm",
    label: "Thẻ ATM đã đăng ký Internet Banking",
    logos: ["f_atm.png"],
  },
  { id: "momo", label: "Ví MoMo", logos: ["f_momo.png"] },
  { id: "zalopay", label: "Ví ZaloPay", logos: ["f_zalopay.png"] },
  {
    id: "vnpay",
    label: "Thanh toán qua VNPAY QR Code",
    logos: ["f_vnpay.png"],
  },
  {
    id: "viettelpay",
    label: "Ví Viettel Money – VietQR",
    logos: ["f_viettelpay_20210927.png"],
  },
];

function formatMoney(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)} đồng`;
}

function VipLogo() {
  return (
    <Link
      href="/home"
      className="flex shrink-0 items-center gap-2 text-[#1c1e20] outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      aria-label="Melodify — về trang chủ"
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

export default function VipCheckoutPage() {
  const router = useRouter();
  const { user, openLogin } = useLoginModal();
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [method, setMethod] = useState<VipPaymentMethod>("card");
  const [planSelectOpen, setPlanSelectOpen] = useState(false);
  const [activePlanIndex, setActivePlanIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<VipCheckoutOrder | null>(null);
  const planSelectRef = useRef<HTMLDivElement>(null);
  const planSelectTriggerRef = useRef<HTMLButtonElement>(null);
  const planOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  async function loadPlans() {
    setLoading(true);
    setError("");
    try {
      const response = await getSubscriptionPlans();
      setPlans(response.data);
      const requestedPlan = new URLSearchParams(window.location.search).get(
        "plan",
      );
      setSelectedPlanId((current) =>
        response.data.some((plan) => plan.id === current)
          ? current
          : response.data.some((plan) => plan.id === requestedPlan)
            ? requestedPlan!
            : (response.data[0]?.id ?? ""),
      );
    } catch {
      setError("Chưa tải được thông tin gói VIP. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    getSubscriptionPlans()
      .then((response) => {
        if (cancelled) return;
        setPlans(response.data);
        const requestedPlan = new URLSearchParams(window.location.search).get(
          "plan",
        );
        setSelectedPlanId(
          response.data.some((plan) => plan.id === requestedPlan)
            ? requestedPlan!
            : (response.data[0]?.id ?? ""),
        );
      })
      .catch(() => {
        if (!cancelled)
          setError("Chưa tải được thông tin gói VIP. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (planSelectOpen) planOptionRefs.current[activePlanIndex]?.focus();
  }, [activePlanIndex, planSelectOpen]);

  useEffect(() => {
    if (!planSelectOpen) return;
    function closeWhenClickingOutside(event: PointerEvent) {
      if (!planSelectRef.current?.contains(event.target as Node)) {
        setPlanSelectOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeWhenClickingOutside);
    return () =>
      document.removeEventListener("pointerdown", closeWhenClickingOutside);
  }, [planSelectOpen]);

  function choosePlan(planId: string) {
    setSelectedPlanId(planId);
    setOrder(null);
    setPlanSelectOpen(false);
    window.requestAnimationFrame(() => planSelectTriggerRef.current?.focus());
  }

  async function submitCheckout() {
    if (!selectedPlan) return;
    setError("");
    setSubmitting(true);
    setOrder(null);
    try {
      const response = await createVipCheckout(selectedPlan.id, method);
      setOrder(response.data);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setError("Đăng nhập để tạo yêu cầu thanh toán.");
        openLogin("/mua-vip/thanh-toan");
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể tạo yêu cầu thanh toán.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f9fb] text-[#17232b]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6">
          <VipLogo />
          <nav
            className="flex h-full items-center gap-2 text-xs font-semibold sm:gap-10 sm:text-sm"
            aria-label="Điều hướng VIP"
          >
            <Link
              href="/mua-vip"
              className="flex h-full items-center border-b-2 border-[#249be8] px-2 text-[#15222a] sm:px-5"
            >
              Mua VIP
            </Link>
            <button type="button" onClick={() => user ? router.push('/mua-vip/lich-su-giao-dich') : openLogin('/mua-vip/lich-su-giao-dich')} className="flex h-full items-center px-2 text-[#71808b] hover:text-[#17232b] sm:px-5">
              Lịch sử giao dịch
            </button>
          </nav>
          {user ? (
            <span className="max-w-[150px] truncate text-xs font-semibold sm:text-sm">
              {user.name}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => openLogin('/mua-vip/thanh-toan')}
              className="flex items-center gap-2 text-xs text-[#586a78] sm:text-sm"
            >
              <span className="grid size-8 place-items-center rounded-full border border-[#aab3b9]">
                ♙
              </span>
              <span className="hidden sm:inline">Đăng nhập</span>
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-6">
        <div className="relative mt-5 overflow-hidden bg-[#e5f3fb] px-5 py-5 sm:px-10">
          <div className="vip-pattern pointer-events-none absolute inset-0 opacity-50" />
          <h1 className="relative text-center text-lg font-extrabold tracking-wide sm:text-2xl">
            Chọn hình thức thanh toán
          </h1>
        </div>

        {loading ? (
          <div
            className="mx-auto mt-8 max-w-[920px] rounded-xl border border-black/5 bg-white p-10 text-center text-sm text-[#657681]"
            role="status"
          >
            Đang tải gói VIP…
          </div>
        ) : null}
        {!loading && plans.length === 0 ? (
          <div className="mx-auto mt-8 max-w-[920px] rounded-xl border border-black/5 bg-white p-8 text-center">
            <p className="text-sm text-[#657681]">
              {error || "Hiện chưa có gói VIP đang hoạt động."}
            </p>
            <button
              type="button"
              onClick={() => void loadPlans()}
              className="mt-4 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5"
            >
              Tải lại
            </button>
          </div>
        ) : null}

        {!loading && plans.length > 0 ? (
          <div className="mx-auto mt-7 grid max-w-[920px] grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
            <section
              className="overflow-hidden rounded-xl border border-black/10 bg-white"
              aria-labelledby="payment-method-title"
            >
              <h2
                id="payment-method-title"
                className="border-b border-black/5 px-5 py-4 text-sm font-bold sm:px-7"
              >
                Chọn phương thức thanh toán
              </h2>
              <fieldset className="p-3 sm:p-5">
                <legend className="sr-only">Phương thức thanh toán</legend>
                {paymentMethods.map((item) => (
                  <label
                    key={item.id}
                    className={`flex min-h-[58px] cursor-pointer items-center gap-3 rounded-lg px-3 transition-colors hover:bg-[#f4f8fa] ${method === item.id ? "bg-[#f4f9fc]" : ""}`}
                  >
                    <input
                      type="radio"
                      name="vip-payment-method"
                      value={item.id}
                      checked={method === item.id}
                      onChange={() => {
                        setMethod(item.id);
                        setOrder(null);
                      }}
                      className="size-4 accent-[#249be8]"
                    />
                    <span className="flex w-[54px] shrink-0 items-center gap-1">
                      {item.logos.map((file) => (
                        <Image
                          key={file}
                          src={`/vip/${file}`}
                          alt=""
                          width={45}
                          height={26}
                          className="max-h-7 w-auto max-w-[52px] object-contain"
                        />
                      ))}
                    </span>
                    <span className="text-[13px] text-[#526574] sm:text-sm">
                      {item.label}
                    </span>
                  </label>
                ))}
              </fieldset>
            </section>

            <aside
              className="rounded-xl border border-black/10 bg-white"
              aria-labelledby="order-summary-title"
            >
              <h2
                id="order-summary-title"
                className="border-b border-black/5 px-5 py-4 text-sm font-bold"
              >
                Thông tin đơn hàng
              </h2>
              <div className="space-y-5 p-5">
                <p className="text-sm text-[#72818b]">
                  Bạn đang chọn gói VIP sau:
                </p>
                <label
                  id="vip-plan-label"
                  className="block text-xs text-[#71808b]"
                  htmlFor="vip-plan-select"
                >
                  Gói VIP
                </label>
                <div ref={planSelectRef} className="relative -mt-3">
                  <button
                    ref={planSelectTriggerRef}
                    id="vip-plan-select"
                    type="button"
                    role="combobox"
                    aria-labelledby="vip-plan-label"
                    aria-haspopup="listbox"
                    aria-expanded={planSelectOpen}
                    aria-controls={planSelectOpen ? "vip-plan-options" : undefined}
                    disabled={loading || plans.length === 0}
                    onClick={() => {
                      if (plans.length === 0) return;
                      const selectedIndex = plans.findIndex(
                        (plan) => plan.id === selectedPlanId,
                      );
                      setActivePlanIndex(selectedIndex >= 0 ? selectedIndex : 0);
                      setPlanSelectOpen((open) => !open);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                        event.preventDefault();
                        if (!planSelectOpen) {
                          const selectedIndex = plans.findIndex(
                            (plan) => plan.id === selectedPlanId,
                          );
                          setActivePlanIndex(selectedIndex >= 0 ? selectedIndex : 0);
                          setPlanSelectOpen(true);
                        }
                      } else if (event.key === "Escape") {
                        setPlanSelectOpen(false);
                      }
                    }}
                    className={`flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-[#f5f7f8] px-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249be8]/20 disabled:cursor-not-allowed disabled:opacity-60 ${
                      planSelectOpen
                        ? "border-[#249be8]"
                        : "border-black/10 hover:border-[#249be8]/60"
                    }`}
                  >
                    <span className="truncate">
                      {selectedPlan
                        ? `${selectedPlan.name} · ${selectedPlan.billing_months} tháng`
                        : loading
                          ? "Đang tải gói VIP…"
                          : "Chưa có gói VIP"}
                    </span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className={`size-4 shrink-0 text-[#667782] transition-transform ${
                        planSelectOpen ? "rotate-180" : ""
                      }`}
                    >
                      <path
                        d="m5.5 7.5 4.5 4.5 4.5-4.5"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {planSelectOpen ? (
                    <div
                      id="vip-plan-options"
                      role="listbox"
                      aria-labelledby="vip-plan-label"
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          setActivePlanIndex((index) =>
                            Math.min(index + 1, plans.length - 1),
                          );
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault();
                          setActivePlanIndex((index) => Math.max(index - 1, 0));
                        } else if (event.key === "Home") {
                          event.preventDefault();
                          setActivePlanIndex(0);
                        } else if (event.key === "End") {
                          event.preventDefault();
                          setActivePlanIndex(plans.length - 1);
                        } else if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          const plan = plans[activePlanIndex];
                          if (plan) choosePlan(plan.id);
                        } else if (event.key === "Escape") {
                          event.preventDefault();
                          setPlanSelectOpen(false);
                          planSelectTriggerRef.current?.focus();
                        }
                      }}
                      className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-lg border border-black/10 bg-white p-1 shadow-xl shadow-[#15232b]/15"
                    >
                      {plans.map((plan, index) => {
                        const selected = plan.id === selectedPlanId;
                        const active = index === activePlanIndex;
                        return (
                          <button
                            key={plan.id}
                            ref={(element) => {
                              planOptionRefs.current[index] = element;
                            }}
                            id={`vip-plan-option-${index}`}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            tabIndex={active ? 0 : -1}
                            onFocus={() => setActivePlanIndex(index)}
                            onClick={() => choosePlan(plan.id)}
                            className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                              selected
                                ? "bg-[#eaf5fd] font-semibold text-[#147cc2]"
                                : "text-[#24343d] hover:bg-[#f3f7f9]"
                            } ${active ? "ring-2 ring-inset ring-[#249be8]/30" : ""}`}
                          >
                            <span className="leading-5">
                              {plan.name} · {plan.billing_months} tháng
                            </span>
                            {selected ? (
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 20 20"
                                fill="none"
                                className="size-4 shrink-0 text-[#168ee0]"
                              >
                                <path
                                  d="m4.5 10 3.5 3.5 7.5-7.5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#71808b]">Số tiền</span>
                  <strong>
                    {selectedPlan ? formatMoney(selectedPlan.price) : "—"}
                  </strong>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-black/5 px-5 py-4">
                <span className="text-sm text-[#71808b]">Thành tiền</span>
                <strong className="text-lg text-[#168ee0]">
                  {selectedPlan ? formatMoney(selectedPlan.price) : "—"}
                </strong>
              </div>
              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={() => void submitCheckout()}
                  disabled={!selectedPlan || submitting}
                  className="h-12 w-full rounded-lg bg-gradient-to-r from-[#f4b20d] to-[#ffd20a] text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {submitting ? "Đang tạo yêu cầu…" : "Tạo yêu cầu thanh toán"}
                </button>
                <p className="mt-3 text-[11px] leading-5 text-[#77858d]">
                  Yêu cầu sẽ được ghi nhận ở trạng thái chờ xác nhận. Tài khoản
                  VIP chỉ được kích hoạt sau khi thanh toán được xác nhận.
                </p>
              </div>
            </aside>
          </div>
        ) : null}

        {error ? (
          <p
            className="mx-auto mt-4 max-w-[920px] rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {order ? (
          <div
            className="mx-auto mt-4 max-w-[920px] rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900"
            role="status"
          >
            <p className="font-bold">
              Đã tạo yêu cầu · Đang chờ xác nhận thanh toán
            </p>
            <p className="mt-1">
              Mã giao dịch: <strong>{order.payment_code}</strong> ·{" "}
              {formatMoney(order.amount)}. Hệ thống chưa kích hoạt VIP cho đến
              khi cổng thanh toán xác nhận giao dịch.
            </p>
          </div>
        ) : null}
      </div>

      <footer className="border-t border-black/5 bg-white px-4 py-5">
        <div className="mx-auto flex max-w-[970px] flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {[
            "f_visa.png",
            "f_master.png",
            "f_vnpay.png",
            "f_zalopay.png",
            "f_momo.png",
            "f_shopeepay.png",
            "f_atm.png",
            "f_vcoin.png",
          ].map((file) => (
            <Image
              key={file}
              src={`/vip/${file}`}
              alt=""
              width={76}
              height={34}
              className="h-8 w-auto object-contain"
            />
          ))}
        </div>
      </footer>
    </main>
  );
}
