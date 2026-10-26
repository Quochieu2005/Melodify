"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useLoginModal } from "@/components/auth/LoginModalProvider";
import { ApiError, getVipPaymentStatus, type VipPaymentStatus } from "@/lib/api";

function formatMoney(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)} đồng`;
}

function isWaiting(status: string) {
  return status === "pending" || status === "processing";
}

function VipPaymentResultContent() {
  const searchParams = useSearchParams();
  const { openLogin, refreshUser } = useLoginModal();
  const paymentCode = searchParams.get("payment_code") ?? "";
  const [payment, setPayment] = useState<VipPaymentStatus | null>(null);
  const [error, setError] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!paymentCode) return;

    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    const poll = async () => {
      try {
        const response = await getVipPaymentStatus(paymentCode);
        if (cancelled) return;
        setPayment(response.data);
        if (["success", "paid", "completed"].includes(response.data.status)) {
          void refreshUser();
        }
        if (isWaiting(response.data.status) && attempts < 24) {
          attempts += 1;
          timer = window.setTimeout(() => void poll(), 2500);
        } else {
          setTimedOut(isWaiting(response.data.status));
        }
      } catch (cause) {
        if (cancelled) return;
        setError(
          cause instanceof ApiError && cause.status === 401
            ? "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi kiểm tra lịch sử giao dịch."
            : cause instanceof Error
              ? cause.message
              : "Chưa kiểm tra được trạng thái thanh toán.",
        );
        if (cause instanceof ApiError && cause.status === 401) {
          openLogin(`/mua-vip/ket-qua?payment_code=${encodeURIComponent(paymentCode)}`);
        }
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [openLogin, paymentCode, refreshUser, retry]);

  const successful = payment?.status === "success" || payment?.status === "paid" || payment?.status === "completed";
  const cancelled = payment?.status === "cancelled";
  const failed = payment?.status === "failed";
  const checking = Boolean(paymentCode) && !error && !timedOut && (!payment || isWaiting(payment.status));

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f7fa] px-4 py-12 text-[#17232b]">
      <section className="w-full max-w-xl rounded-2xl border border-black/5 bg-white p-6 shadow-xl sm:p-9" aria-live="polite">
        <div className={`mx-auto grid size-16 place-items-center rounded-full text-3xl font-bold ${successful ? "bg-emerald-100 text-emerald-700" : failed || cancelled ? "bg-red-100 text-red-600" : "bg-cyan-100 text-cyan-700"}`}>
          {successful ? "✓" : failed || cancelled ? "×" : "…"}
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold">
          {successful ? "Thanh toán thành công" : cancelled ? "Bạn đã hủy thanh toán" : failed ? "Thanh toán chưa thành công" : "Đang xác nhận thanh toán"}
        </h1>

        {!paymentCode ? (
          <p className="mt-3 text-center text-sm text-[#657681]">Không tìm thấy mã giao dịch trong đường dẫn.</p>
        ) : payment ? (
          <div className="mt-5 rounded-xl bg-[#f7f9fb] p-4 text-sm leading-6">
            <p>Mã đơn: <strong>{payment.payment_code}</strong></p>
            <p>Gói: <strong>{payment.plan_name}</strong></p>
            <p>Số tiền: <strong>{formatMoney(payment.amount)}</strong></p>
            {successful && payment.vip_expires_at ? (
              <p>VIP có hiệu lực đến: <strong>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(payment.vip_expires_at))}</strong></p>
            ) : null}
          </div>
        ) : null}

        {checking ? <p className="mt-4 text-center text-sm text-[#657681]">Đang đợi xác nhận bảo mật từ cổng thanh toán…</p> : null}
        {timedOut ? <p className="mt-4 text-center text-sm text-amber-800">Cổng thanh toán chưa gửi kết quả cuối cùng. Đơn vẫn đang chờ; bạn có thể kiểm tra lại hoặc xem lịch sử giao dịch.</p> : null}
        {error ? <p className="mt-4 text-center text-sm text-red-700" role="alert">{error}</p> : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!checking && paymentCode && !successful && !failed && !cancelled ? (
          <button type="button" onClick={() => { setError(""); setTimedOut(false); setRetry((value) => value + 1); }} className="rounded-lg bg-[#17232b] px-4 py-2.5 text-sm font-semibold text-white">
              Kiểm tra lại
            </button>
          ) : null}
          <Link href="/mua-vip/lich-su-giao-dich" className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-semibold">Lịch sử giao dịch</Link>
          <Link href="/mua-vip/thanh-toan" className="rounded-lg bg-[#12bed0] px-4 py-2.5 text-sm font-semibold text-[#06323a]">Quay lại gói VIP</Link>
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-[#87949c]">Melodify chỉ cập nhật quyền VIP sau khi Backend xác minh thông báo giao dịch có chữ ký hợp lệ.</p>
      </section>
    </main>
  );
}

export default function VipPaymentResultPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f5f7fa] text-sm text-[#657681]">Đang tải kết quả thanh toán…</main>}>
      <VipPaymentResultContent />
    </Suspense>
  );
}
