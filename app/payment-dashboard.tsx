"use client";

import { useState, type FormEvent } from "react";
import type { Payment, PaymentSummary } from "@/lib/api";

interface DashboardData {
  health: boolean;
  summary: PaymentSummary[];
  payments: Payment[];
  paymentError: string | null;
}

interface PaymentDashboardProps {
  initialHealth: boolean;
  initialSummary: PaymentSummary[];
  initialPayments: Payment[];
  initialPaymentError: string | null;
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("id-ID")}`;
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const color = ["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID"].includes(
    normalized,
  )
    ? "bg-emerald-100 text-emerald-800"
    : ["PENDING", "PROCESSING", "WAITING"].includes(normalized)
      ? "bg-amber-100 text-amber-800"
      : ["FAILED", "ERROR", "CANCELLED", "CANCELED", "REJECTED"].includes(
            normalized,
          )
        ? "bg-rose-100 text-rose-800"
        : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {normalized}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="border-l-2 border-emerald-600 py-1 pl-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

export default function PaymentDashboard({
  initialHealth,
  initialSummary,
  initialPayments,
  initialPaymentError,
}: PaymentDashboardProps) {
  const [health, setHealth] = useState(initialHealth);
  const [summary, setSummary] = useState(initialSummary);
  const [payments, setPayments] = useState(initialPayments);
  const [paymentError, setPaymentError] = useState(initialPaymentError);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  const totalPayments = summary.reduce((total, item) => total + item.total_payments, 0);
  const successfulPayments = summary.reduce(
    (total, item) => total + item.successful_payments,
    0,
  );
  const pendingPayments = summary.reduce(
    (total, item) => total + item.pending_payments,
    0,
  );
  const failedPayments = summary.reduce(
    (total, item) => total + item.failed_payments,
    0,
  );
  const totalAmount = summary
    .map((item) => formatAmount(item.total_amount, item.currency))
    .join(" · ");

  const filteredPayments = [...payments]
    .sort(
      (first, second) =>
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime(),
    )
    .filter((payment) => {
      const matchesStatus =
        statusFilter === "ALL" || payment.status.toUpperCase() === statusFilter;
      const searchText = `${payment.reference} ${payment.id} ${payment.currency} ${payment.status}`;
      return matchesStatus && searchText.toLowerCase().includes(query.toLowerCase());
    });

  async function refreshDashboard(clearNotice = true): Promise<boolean> {
    setIsRefreshing(true);
    if (clearNotice) setNotice("");

    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const data = (await response.json()) as DashboardData;
      if (!response.ok) throw new Error("Gagal memuat ulang dashboard.");

      setHealth(data.health);
      setSummary(data.summary);
      setPayments(data.payments);
      setPaymentError(data.paymentError);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gagal memuat ulang dashboard.");
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCreatePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setFormError("");
    setNotice("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payment = {
      reference: String(formData.get("reference")).trim(),
      amount: Number(formData.get("amount")),
      currency: String(formData.get("currency")).trim().toUpperCase(),
    };

    try {
      const response = await fetch("/api/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(payment),
      });
      const result = (await response.json()) as Payment | { message?: string };
      if (!response.ok) {
        throw new Error(
          "message" in result ? result.message : "Pembayaran gagal dibuat.",
        );
      }

      form.reset();
      const refreshed = await refreshDashboard(false);
      if (refreshed) {
        setNotice(`Pembayaran ${"reference" in result ? result.reference : payment.reference} berhasil dibuat.`);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Pembayaran gagal dibuat.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6f3] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-emerald-800 text-sm font-bold text-white">
              FP
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-slate-950">
                FINANCIAL PAYMENT
              </h1>
              <p className="text-xs text-slate-500">Integration console</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${health ? "bg-emerald-600" : "bg-rose-600"}`} />
            <span className="font-medium text-slate-700">API {health ? "Terhubung" : "Tidak tersedia"}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <section className="flex flex-col justify-between gap-5 border-b border-slate-300 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              OPERASIONAL / PEMBAYARAN
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">Ringkasan transaksi</h2>
            <p className="mt-2 text-sm text-slate-600">
              Data langsung dari Financial Payment API
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshDashboard()}
            disabled={isRefreshing}
            className="h-10 border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-emerald-700 hover:text-emerald-800 disabled:cursor-wait disabled:opacity-60"
          >
            {isRefreshing ? "Memuat..." : "↻  Segarkan data"}
          </button>
        </section>

        {!health && (
          <div role="alert" className="mt-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            API belum dapat dijangkau. Periksa koneksi atau konfigurasi API_BASE_URL.
          </div>
        )}
        {notice && (
          <div role="status" className="mt-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {notice}
          </div>
        )}

        <section aria-label="Metrik pembayaran" className="grid grid-cols-2 gap-x-5 gap-y-7 border-b border-slate-300 py-7 sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Semua transaksi" value={totalPayments.toLocaleString("id-ID")} detail="Seluruh mata uang" />
          <Metric label="Berhasil" value={successfulPayments.toLocaleString("id-ID")} detail="Pembayaran sukses" />
          <Metric label="Menunggu" value={pendingPayments.toLocaleString("id-ID")} detail="Perlu dipantau" />
          <Metric label="Gagal" value={failedPayments.toLocaleString("id-ID")} detail="Pembayaran gagal" />
          <Metric label="Nilai transaksi" value={totalAmount || "-"} detail="Dikelompokkan per mata uang" />
        </section>

        <section className="mt-7 border border-slate-200 bg-white">
          <details className="group border-b border-slate-200">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-sm font-semibold text-slate-900">Buat pembayaran</span>
                <span className="mt-1 block text-xs text-slate-500">Kirim transaksi baru ke API</span>
              </span>
              <span aria-hidden="true" className="text-xl text-emerald-800 group-open:rotate-45">+</span>
            </summary>
            <form onSubmit={handleCreatePayment} className="grid gap-4 border-t border-slate-200 bg-[#fafbf9] p-5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
              <label className="text-xs font-semibold text-slate-700">
                Referensi
                <input name="reference" required maxLength={100} placeholder="PAY-2026-0001" className="mt-2 h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700" />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Nominal
                <input name="amount" type="number" required min={1} step={1} placeholder="150000" className="mt-2 h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700" />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Mata uang
                <input name="currency" required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" defaultValue="IDR" className="mt-2 h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal uppercase outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700" />
              </label>
              <button type="submit" disabled={isSubmitting} className="h-10 bg-emerald-800 px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60">
                {isSubmitting ? "Mengirim..." : "Buat pembayaran"}
              </button>
              {formError && <p role="alert" className="text-sm text-rose-700 sm:col-span-2 lg:col-span-4">{formError}</p>}
            </form>
          </details>

          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Daftar transaksi</h3>
              <p className="mt-1 text-xs text-slate-500">
                {filteredPayments.length.toLocaleString("id-ID")} dari {payments.length.toLocaleString("id-ID")} transaksi
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="payment-search">Cari transaksi</label>
              <input
                id="payment-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari referensi atau ID"
                className="h-10 min-w-56 border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              />
              <label className="sr-only" htmlFor="status-filter">Filter status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              >
                <option value="ALL">Semua status</option>
                <option value="SUCCESS">Berhasil</option>
                <option value="PENDING">Menunggu</option>
                <option value="FAILED">Gagal</option>
              </select>
            </div>
          </div>

          {paymentError ? (
            <div role="alert" className="px-5 py-12 text-center text-sm text-rose-700">{paymentError}</div>
          ) : filteredPayments.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">Tidak ada transaksi yang cocok dengan filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#f7f8f6] text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Referensi</th>
                    <th className="px-5 py-3 font-semibold">Nominal</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Dibuat</th>
                    <th className="px-5 py-3 font-semibold">ID transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="transition-colors hover:bg-emerald-50/40">
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-900">{payment.reference}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm tabular-nums text-slate-700">{formatAmount(payment.amount, payment.currency)}</td>
                      <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={payment.status} /></td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{formatDate(payment.created_at)}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-500">{payment.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="flex flex-col gap-2 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Financial Payment Integration Platform</p>
          <a href="https://financial-payment-integration-api.vercel.app/swagger" target="_blank" rel="noreferrer" className="w-fit underline decoration-slate-300 underline-offset-4 hover:text-emerald-800">
            Dokumentasi API
          </a>
        </footer>
      </div>
    </main>
  );
}