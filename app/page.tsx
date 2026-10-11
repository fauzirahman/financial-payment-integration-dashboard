import SalesWorkspace from "./sales-workspace";
import {
  getCustomers,
  getApiHealth,
  getDailyPaymentReport,
  getGeneralLedger,
  getPaymentSummary,
  getPayments,
  type Customer,
  type DailyPaymentReport,
  type Payment,
  type PaymentSummary,
} from "@/lib/api";

export const instant = false;

export default async function HomePage() {
  const [
    healthResult,
    summaryResult,
    paymentsResult,
    customersResult,
    reportResult,
    ledgerResult,
  ] = await Promise.allSettled([
      getApiHealth(),
      getPaymentSummary(),
      getPayments(),
      getCustomers(),
      getDailyPaymentReport(),
      getGeneralLedger(),
    ]);

  const isApiOnline = healthResult.status === "fulfilled" && healthResult.value;
  const summary: PaymentSummary[] =
    summaryResult.status === "fulfilled" ? summaryResult.value : [];
  const payments: Payment[] =
    paymentsResult.status === "fulfilled" ? paymentsResult.value : [];
  const customers: Customer[] =
    customersResult.status === "fulfilled" ? customersResult.value : [];
  const dailyReport: DailyPaymentReport[] =
    reportResult.status === "fulfilled" ? reportResult.value : [];
  const businessDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  return (
    <SalesWorkspace
      businessDate={businessDate}
      health={isApiOnline}
      summary={summary}
      payments={payments}
      customers={customers}
      dailyReport={dailyReport}
      ledger={ledgerResult.status === "fulfilled" ? ledgerResult.value : null}
      paymentError={
        paymentsResult.status === "rejected"
          ? "Gagal mengambil data transaksi dari API."
          : null
      }
      customerError={
        customersResult.status === "rejected"
          ? "Gagal mengambil data customer dari API."
          : null
      }
      reportError={
        reportResult.status === "rejected"
          ? "Laporan pembayaran belum dapat dimuat dari API."
          : null
      }
      ledgerError={
        ledgerResult.status === "rejected"
          ? "General ledger belum dapat dimuat dari API."
          : null
      }
    />
  );
}