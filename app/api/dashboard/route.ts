import { NextResponse } from "next/server";
import {
  ApiError,
  createCustomer,
  createPayment,
  getCustomers,
  getApiHealth,
  getDailyPaymentReport,
  getGeneralLedger,
  getPaymentSummary,
  getPayments,
  type CreateCustomerInput,
  type CreatePaymentInput,
} from "@/lib/api";

export async function GET() {
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

  return NextResponse.json({
    health: healthResult.status === "fulfilled" && healthResult.value,
    summary: summaryResult.status === "fulfilled" ? summaryResult.value : [],
    payments: paymentsResult.status === "fulfilled" ? paymentsResult.value : [],
    customers: customersResult.status === "fulfilled" ? customersResult.value : [],
    dailyReport: reportResult.status === "fulfilled" ? reportResult.value : [],
    ledger: ledgerResult.status === "fulfilled" ? ledgerResult.value : null,
    paymentError:
      paymentsResult.status === "rejected"
        ? "Gagal mengambil data transaksi dari API."
        : null,
    customerError:
      customersResult.status === "rejected"
        ? "Gagal mengambil data customer dari API."
        : null,
    reportError:
      reportResult.status === "rejected"
        ? "Laporan pembayaran belum dapat dimuat dari API."
        : null,
    ledgerError:
      ledgerResult.status === "rejected"
        ? "General ledger belum dapat dimuat dari API."
        : null,
  });
}

export async function POST(request: Request) {
  let payload: { entity?: string } & Record<string, unknown>;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Body harus berupa objek JSON.");
    }
    payload = body as { entity?: string } & Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Body JSON tidak valid." }, { status: 400 });
  }

  try {
    if (payload.entity === "customer") {
      if (
        typeof payload.customer_number !== "string" ||
        typeof payload.name !== "string" ||
        typeof payload.email !== "string"
      ) {
        return NextResponse.json(
          { message: "Nomor customer, nama, dan email wajib diisi." },
          { status: 400 },
        );
      }

      const customer: CreateCustomerInput = {
        customer_number: payload.customer_number,
        name: payload.name,
        email: payload.email,
        ...(typeof payload.phone === "string" ? { phone: payload.phone } : {}),
        status:
          payload.status === "INACTIVE" || payload.status === "SUSPENDED"
            ? payload.status
            : "ACTIVE",
      };
      const createdCustomer = await createCustomer(customer);
      return NextResponse.json(createdCustomer, { status: 201 });
    }

    if (
      typeof payload.reference !== "string" ||
      typeof payload.amount !== "number" ||
      typeof payload.currency !== "string"
    ) {
      return NextResponse.json(
        { message: "Referensi, nominal, dan mata uang wajib diisi." },
        { status: 400 },
      );
    }

    const idempotencyKey = request.headers.get("Idempotency-Key");
    const payment: CreatePaymentInput = {
      reference: payload.reference,
      amount: payload.amount,
      currency: payload.currency,
    };
    const createdPayment = await createPayment(
      payment,
      idempotencyKey ?? "",
    );
    return NextResponse.json(createdPayment, { status: 201 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502;
    const message =
      error instanceof Error ? error.message : "Gagal membuat pembayaran.";

    return NextResponse.json({ message }, { status });
  }
}