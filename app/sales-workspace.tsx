"use client";

import { useState, type FormEvent } from "react";
import type {
  Customer,
  DailyPaymentReport,
  Payment,
  PaymentSummary,
} from "@/lib/api";

type WorkspaceSection = "overview" | "customers" | "orders" | "inventory" | "finance";

interface WorkspaceData {
  health: boolean;
  summary: PaymentSummary[];
  payments: Payment[];
  customers: Customer[];
  dailyReport: DailyPaymentReport[];
  ledger: unknown;
  paymentError: string | null;
  customerError: string | null;
  reportError: string | null;
  ledgerError: string | null;
}

type SalesWorkspaceProps = WorkspaceData & { businessDate: string };

const navigation: { id: WorkspaceSection; label: string; code: string }[] = [
  { id: "overview", label: "Overview", code: "OV" },
  { id: "customers", label: "Customers", code: "CU" },
  { id: "orders", label: "Sales orders", code: "SO" },
  { id: "inventory", label: "Inventory", code: "IN" },
  { id: "finance", label: "Finance", code: "FN" },
];

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("id-ID")}`;
  }
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function Status({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const tone = ["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID", "ACTIVE"].includes(normalized)
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : ["PENDING", "PROCESSING"].includes(normalized)
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : ["FAILED", "ERROR", "CANCELLED", "SUSPENDED"].includes(normalized)
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`inline-flex border px-2 py-1 text-[10px] font-bold tracking-wide ${tone}`}>{normalized}</span>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="min-w-0 border-t-2 border-emerald-700 bg-white px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-3 break-words text-lg font-semibold leading-tight tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function EmptyIntegration({ title, description }: { title: string; description: string }) {
  return (
    <section className="border border-dashed border-slate-300 bg-white px-6 py-12 sm:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Backend connection required</p>
      <h3 className="mt-3 text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
        <span className="border border-slate-200 px-3 py-2">API contract</span>
        <span className="border border-slate-200 px-3 py-2">Persistent data</span>
        <span className="border border-slate-200 px-3 py-2">Audit history</span>
      </div>
    </section>
  );
}

export default function SalesWorkspace({ businessDate, ...initialData }: SalesWorkspaceProps) {
  const [section, setSection] = useState<WorkspaceSection>("overview");
  const [data, setData] = useState<WorkspaceData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const totalPayments = data.summary.reduce((sum, item) => sum + item.total_payments, 0);
  const pendingPayments = data.summary.reduce((sum, item) => sum + item.pending_payments, 0);
  const successfulPayments = data.summary.reduce((sum, item) => sum + item.successful_payments, 0);
  const totalCustomers = data.customers.length;
  const sectionTitle = navigation.find((item) => item.id === section)?.label ?? "Overview";

  async function refreshWorkspace(clearNotice = true) {
    setIsRefreshing(true);
    if (clearNotice) setNotice("");
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const result = (await response.json()) as WorkspaceData;
      if (!response.ok) throw new Error("Workspace gagal diperbarui.");
      setData(result);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Workspace gagal diperbarui.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function submitRecord(
    event: FormEvent<HTMLFormElement>,
    entity: "customer" | "payment",
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setFormError("");
    setNotice("");
    setIsSubmitting(true);

    const payload = entity === "customer"
      ? {
          entity,
          customer_number: String(formData.get("customer_number")).trim(),
          name: String(formData.get("name")).trim(),
          email: String(formData.get("email")).trim(),
          phone: String(formData.get("phone")).trim(),
          status: "ACTIVE",
        }
      : {
          entity,
          reference: String(formData.get("reference")).trim(),
          amount: Number(formData.get("amount")),
          currency: String(formData.get("currency")).trim().toUpperCase(),
        };

    try {
      const response = await fetch("/api/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(entity === "payment" ? { "Idempotency-Key": crypto.randomUUID() } : {}),
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string; [key: string]: unknown };
      if (!response.ok) throw new Error(result.message ?? "Gagal menyimpan data.");
      form.reset();
      setNotice(entity === "customer" ? "Customer berhasil dibuat." : "Pembayaran berhasil dibuat.");
      await refreshWorkspace(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const sortedPayments = [...data.payments].sort(
    (first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime(),
  );

  return (
    <main className="min-h-screen bg-[#f1f4f0] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-slate-800 bg-[#15221e] text-white lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
            <div className="grid h-9 w-9 place-items-center bg-[#d8e76b] text-xs font-black text-[#15221e]">N</div>
            <div>
              <p className="text-sm font-bold tracking-wide">NORTHSTAR</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-100/60">Commercial OS</p>
            </div>
          </div>
          <div className="hidden px-5 py-5 lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/45">Workspace</p>
            <p className="mt-2 text-sm font-medium">B2B workspace</p>
          </div>
          <nav aria-label="Navigasi utama" className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:px-3 lg:py-1">
            {navigation.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setSection(item.id); setFormError(""); setNotice(""); }}
                aria-current={section === item.id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 px-3 py-2.5 text-left text-sm transition ${section === item.id ? "bg-[#d8e76b] font-semibold text-[#15221e]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
              >
                <span aria-hidden="true" className={`grid h-6 w-7 place-items-center text-[9px] font-bold ${section === item.id ? "bg-[#15221e] text-[#d8e76b]" : "border border-white/20 text-white/65"}`}>{item.code}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto hidden border-t border-white/10 px-5 py-4 lg:block">
            <div className="flex items-center gap-2 text-xs text-white/75">
              <span className={`h-2 w-2 ${data.health ? "bg-[#d8e76b]" : "bg-rose-400"}`} />
              Payment API {data.health ? "connected" : "unavailable"}
            </div>
            <a href="https://financial-payment-integration-api.vercel.app/swagger" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-white/50 underline underline-offset-4 hover:text-white">API documentation</a>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3.5 sm:px-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Sales &amp; order management</p>
              <h1 className="mt-0.5 text-sm font-semibold text-slate-900">{sectionTitle}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><span className={`h-2 w-2 ${data.health ? "bg-emerald-600" : "bg-rose-600"}`} />{data.health ? "API online" : "API offline"}</span>
              <button type="button" onClick={() => void refreshWorkspace()} disabled={isRefreshing} aria-label="Refresh workspace" title="Refresh workspace" className="grid h-9 w-9 place-items-center border border-slate-300 text-lg text-slate-700 hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-50">↻</button>
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8">
            {notice && <div role="status" className="mb-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div>}

            {section === "overview" && (
              <>
                <section className="flex flex-col justify-between gap-5 border-b border-slate-300 pb-6 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-800">{businessDate} | Jakarta</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Good morning, Sales.</h2>
                    <p className="mt-2 max-w-xl text-sm text-slate-600">A single view of customer relationships, order flow, fulfillment, and cash collection.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSection("customers")} className="h-10 border border-slate-300 bg-white px-4 text-sm font-semibold hover:border-slate-500">Add customer</button>
                    <button type="button" onClick={() => setSection("finance")} className="h-10 bg-[#176b50] px-4 text-sm font-semibold text-white hover:bg-[#10543e]">Create payment <span aria-hidden="true">+</span></button>
                  </div>
                </section>

                <section aria-label="Sales and finance metrics" className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <Metric label="Customers" value={totalCustomers.toLocaleString("id-ID")} detail={data.customerError ? "Could not sync" : "Accounts in customer register"} />
                  <Metric label="Payments" value={totalPayments.toLocaleString("id-ID")} detail="All recorded transactions" />
                  <Metric label="Awaiting settlement" value={pendingPayments.toLocaleString("id-ID")} detail="Pending payment status" />
                  <Metric label="Collected" value={successfulPayments.toLocaleString("id-ID")} detail="Successful payments" />
                </section>

                <section className="mt-8 border-y border-slate-300 py-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Order-to-cash</p><h3 className="mt-1 text-base font-semibold">Sales workflow</h3></div>
                    <p className="text-xs text-amber-800">Order, inventory, and shipment stages need backend support</p>
                  </div>
                  <ol className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    {["Lead", "Quotation", "Sales order", "Reserve & pick", "Ship & collect"].map((step, index) => (
                      <li key={step} className="flex min-h-16 items-center gap-3 border border-slate-200 bg-white px-3 py-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center border border-slate-300 font-mono text-xs text-slate-500">0{index + 1}</span>
                        <span className="text-sm font-medium text-slate-800">{step}</span>
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-slate-400">Pending API</span>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[1.5fr_1fr]">
                  <div>
                    <div className="flex items-end justify-between border-b border-slate-300 pb-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Finance</p><h3 className="mt-1 text-base font-semibold">Recent payment activity</h3></div><button type="button" onClick={() => setSection("finance")} className="text-xs font-semibold text-emerald-800 underline underline-offset-4">View finance</button></div>
                    {data.paymentError ? <p role="alert" className="py-8 text-sm text-rose-700">{data.paymentError}</p> : sortedPayments.length === 0 ? <p className="py-8 text-sm text-slate-500">No payment activity yet.</p> : (
                      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-500"><th className="py-3 font-semibold">Reference</th><th className="py-3 font-semibold">Amount</th><th className="py-3 font-semibold">Status</th><th className="py-3 font-semibold">Created</th></tr></thead><tbody className="divide-y divide-slate-200">{sortedPayments.slice(0, 5).map((payment) => <tr key={payment.id}><td className="py-3 pr-4 text-sm font-semibold">{payment.reference}</td><td className="py-3 pr-4 text-sm tabular-nums">{formatAmount(payment.amount, payment.currency)}</td><td className="py-3 pr-4"><Status value={payment.status} /></td><td className="whitespace-nowrap py-3 text-xs text-slate-500">{formatDate(payment.created_at)}</td></tr>)}</tbody></table></div>
                    )}
                  </div>
                  <div>
                    <div className="border-b border-slate-300 pb-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Customer register</p><h3 className="mt-1 text-base font-semibold">Recently added</h3></div>
                    {data.customerError ? <p role="alert" className="py-8 text-sm text-rose-700">{data.customerError}</p> : data.customers.length === 0 ? <p className="py-8 text-sm text-slate-500">No customer records yet.</p> : <ul className="divide-y divide-slate-200">{data.customers.slice(0, 5).map((customer) => <li key={customer.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{customer.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{customer.customer_number} · {customer.email}</p></div><Status value={customer.status} /></li>)}</ul>}
                    <button type="button" onClick={() => setSection("customers")} className="mt-3 text-xs font-semibold text-emerald-800 underline underline-offset-4">Open customer register</button>
                  </div>
                </section>
              </>
            )}

            {section === "customers" && (
              <>
                <section className="mb-6 border-b border-slate-300 pb-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">Accounts &amp; relationships</p><h2 className="mt-2 text-2xl font-semibold">Customer register</h2><p className="mt-1 text-sm text-slate-600">Customer records are managed through the connected Financial Payment API.</p></section>
                <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    <div className="flex items-end justify-between border-b border-slate-300 pb-3"><div><h3 className="text-base font-semibold">All customers</h3><p className="mt-1 text-xs text-slate-500">{data.customers.length.toLocaleString("id-ID")} records</p></div></div>
                    {data.customerError ? <p role="alert" className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{data.customerError}</p> : data.customers.length === 0 ? <p className="py-10 text-sm text-slate-500">No customers returned by API.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-500"><th className="py-3 font-semibold">Customer</th><th className="py-3 font-semibold">Contact</th><th className="py-3 font-semibold">Status</th><th className="py-3 font-semibold">Added</th></tr></thead><tbody className="divide-y divide-slate-200">{data.customers.map((customer) => <tr key={customer.id}><td className="py-3 pr-4"><p className="text-sm font-semibold">{customer.name}</p><p className="mt-0.5 font-mono text-[10px] text-slate-500">{customer.customer_number}</p></td><td className="py-3 pr-4 text-xs text-slate-600">{customer.email}<br />{customer.phone || "No phone"}</td><td className="py-3 pr-4"><Status value={customer.status} /></td><td className="whitespace-nowrap py-3 text-xs text-slate-500">{formatDate(customer.created_at)}</td></tr>)}</tbody></table></div>}
                  </div>
                  <form onSubmit={(event) => void submitRecord(event, "customer")} className="h-fit border border-slate-200 bg-white p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">New account</p><h3 className="mt-1 text-base font-semibold">Add customer</h3>
                    <label className="mt-5 block text-xs font-semibold text-slate-700">Customer number<input name="customer_number" required maxLength={30} pattern="[A-Za-z0-9_-]+" placeholder="CUST-0001" className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm font-normal outline-none focus:border-emerald-700" /></label>
                    <label className="mt-3 block text-xs font-semibold text-slate-700">Company or contact name<input name="name" required maxLength={150} placeholder="PT Contoh Indonesia" className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm font-normal outline-none focus:border-emerald-700" /></label>
                    <label className="mt-3 block text-xs font-semibold text-slate-700">Email<input name="email" type="email" required maxLength={150} placeholder="finance@company.co.id" className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm font-normal outline-none focus:border-emerald-700" /></label>
                    <label className="mt-3 block text-xs font-semibold text-slate-700">Phone <span className="font-normal text-slate-400">Optional</span><input name="phone" maxLength={30} placeholder="+62 812 0000 0000" className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm font-normal outline-none focus:border-emerald-700" /></label>
                    {formError && section === "customers" && <p role="alert" className="mt-3 text-xs text-rose-700">{formError}</p>}
                    <button type="submit" disabled={isSubmitting} className="mt-5 h-10 w-full bg-[#176b50] px-4 text-sm font-semibold text-white hover:bg-[#10543e] disabled:opacity-60">{isSubmitting ? "Saving..." : "Create customer"}</button>
                  </form>
                </section>
              </>
            )}

            {section === "orders" && <><section className="mb-6 border-b border-slate-300 pb-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">Pipeline · quote to cash</p><h2 className="mt-2 text-2xl font-semibold">Sales orders</h2></section><EmptyIntegration title="Order management is not connected yet" description="The connected API currently has no lead, quotation, sales order, order-line, or fulfillment endpoints. Connect those resources before creating order records so every status change and document has a persistent transaction number and audit trail." /></>}

            {section === "inventory" && <><section className="mb-6 border-b border-slate-300 pb-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">Stock control · fulfillment</p><h2 className="mt-2 text-2xl font-semibold">Inventory</h2></section><EmptyIntegration title="Inventory is not connected yet" description="There are no product, warehouse, stock balance, reservation, or movement endpoints in the connected API. The sales workflow should only promise available stock after an inventory service can reserve and release quantities against a sales order." /></>}

            {section === "finance" && (
              <>
                <section className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-300 pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">Receivables · payment reporting</p><h2 className="mt-2 text-2xl font-semibold">Finance</h2><p className="mt-1 text-sm text-slate-600">Payments and reports available from the connected finance API.</p></div></section>
                <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="Transactions" value={totalPayments.toLocaleString("id-ID")} detail="All currencies" /><Metric label="Successful" value={successfulPayments.toLocaleString("id-ID")} detail="Collected payments" /><Metric label="Pending" value={pendingPayments.toLocaleString("id-ID")} detail="Awaiting settlement" /><Metric label="Payment volume" value={data.summary.map((item) => formatAmount(item.total_amount, item.currency)).join(" · ") || "-"} detail="Grouped by currency" /></section>
                <section className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div>
                    <div className="border-b border-slate-300 pb-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Reconciliation</p><h3 className="mt-1 text-base font-semibold">Daily payment report</h3></div>
                    {data.reportError ? <p role="alert" className="mt-3 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{data.reportError}</p> : data.dailyReport.length === 0 ? <p className="py-8 text-sm text-slate-500">No daily report rows returned.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-500"><th className="py-3 font-semibold">Date</th><th className="py-3 font-semibold">Currency</th><th className="py-3 font-semibold">Transactions</th><th className="py-3 font-semibold">Successful</th><th className="py-3 font-semibold">Volume</th></tr></thead><tbody className="divide-y divide-slate-200">{data.dailyReport.map((row) => <tr key={`${row.date}-${row.currency}`}><td className="py-3 text-sm">{row.date}</td><td className="py-3 text-sm font-semibold">{row.currency}</td><td className="py-3 text-sm tabular-nums">{row.total_payments}</td><td className="py-3 text-sm tabular-nums">{row.successful_payments}</td><td className="py-3 text-sm tabular-nums">{formatAmount(row.total_amount, row.currency)}</td></tr>)}</tbody></table></div>}
                    <div className="mt-8 border-b border-slate-300 pb-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Accounting</p><h3 className="mt-1 text-base font-semibold">General ledger</h3></div>
                    {data.ledgerError ? <p role="alert" className="mt-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{data.ledgerError} Endpoint tercantum di API, tetapi belum berhasil merespons.</p> : data.ledger == null ? <p className="py-6 text-sm text-slate-500">No ledger data returned.</p> : <pre className="mt-3 max-h-72 overflow-auto border border-slate-200 bg-white p-4 text-xs text-slate-700">{JSON.stringify(data.ledger, null, 2)}</pre>}
                  </div>
                  <form onSubmit={(event) => void submitRecord(event, "payment")} className="h-fit border border-slate-200 bg-white p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">Cash collection</p><h3 className="mt-1 text-base font-semibold">Create payment</h3>
                    <label className="mt-5 block text-xs font-semibold text-slate-700">Payment reference<input name="reference" required maxLength={100} placeholder="PAY-2026-0001" className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm font-normal outline-none focus:border-emerald-700" /></label>
                    <label className="mt-3 block text-xs font-semibold text-slate-700">Amount<input name="amount" type="number" required min={1} step={1} placeholder="150000" className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm font-normal outline-none focus:border-emerald-700" /></label>
                    <label className="mt-3 block text-xs font-semibold text-slate-700">Currency<input name="currency" required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" defaultValue="IDR" className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm font-normal uppercase outline-none focus:border-emerald-700" /></label>
                    {formError && section === "finance" && <p role="alert" className="mt-3 text-xs text-rose-700">{formError}</p>}
                    <button type="submit" disabled={isSubmitting} className="mt-5 h-10 w-full bg-[#176b50] px-4 text-sm font-semibold text-white hover:bg-[#10543e] disabled:opacity-60">{isSubmitting ? "Submitting..." : "Create payment"}</button>
                    <p className="mt-3 text-xs leading-5 text-slate-500">The payment API accepts a reference and amount. Customer and sales-order linking needs backend support.</p>
                  </form>
                </section>
                <section className="mt-8"><div className="border-b border-slate-300 pb-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Transactions</p><h3 className="mt-1 text-base font-semibold">Payment register</h3></div>{data.paymentError ? <p role="alert" className="py-8 text-sm text-rose-700">{data.paymentError}</p> : sortedPayments.length === 0 ? <p className="py-8 text-sm text-slate-500">No payment records returned.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-500"><th className="py-3 font-semibold">Reference</th><th className="py-3 font-semibold">Amount</th><th className="py-3 font-semibold">Status</th><th className="py-3 font-semibold">Created</th><th className="py-3 font-semibold">Payment ID</th></tr></thead><tbody className="divide-y divide-slate-200">{sortedPayments.map((payment) => <tr key={payment.id}><td className="py-3 pr-4 text-sm font-semibold">{payment.reference}</td><td className="py-3 pr-4 text-sm tabular-nums">{formatAmount(payment.amount, payment.currency)}</td><td className="py-3 pr-4"><Status value={payment.status} /></td><td className="whitespace-nowrap py-3 pr-4 text-xs text-slate-500">{formatDate(payment.created_at)}</td><td className="py-3 font-mono text-[10px] text-slate-500">{payment.id}</td></tr>)}</tbody></table></div>}</section>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}