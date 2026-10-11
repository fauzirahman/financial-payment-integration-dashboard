const API_BASE_URL =
  process.env.API_BASE_URL ??
  "https://financial-payment-integration-api.vercel.app";

export interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentSummary {
  currency: string;
  total_payments: number;
  pending_payments: number;
  successful_payments: number;
  failed_payments: number;
  total_amount: number;
  successful_amount: number;
}

export interface Customer {
  id: string;
  customer_number: string;
  name: string;
  email: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  customer_number: string;
  name: string;
  email: string;
  phone?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface DailyPaymentReport {
  date: string;
  currency: string;
  total_payments: number;
  successful_payments: number;
  failed_payments: number;
  total_amount: number;
  successful_amount: number;
}

export interface CreatePaymentInput {
  reference: string;
  amount: number;
  currency: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body === "object" && "message" in body
        ? String(body.message)
        : body && typeof body === "object" && "error" in body
          ? String(body.error)
          : `${response.status} ${response.statusText}`;

    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export async function getPayments(): Promise<Payment[]> {
  return fetchApi<Payment[]>("/api/v1/payments");
}

export async function getCustomers(): Promise<Customer[]> {
  return fetchApi<Customer[]>("/api/v1/customers");
}

export async function createCustomer(
  customer: CreateCustomerInput,
): Promise<Customer> {
  return fetchApi<Customer>("/api/v1/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
}

export async function getPaymentSummary(): Promise<PaymentSummary[]> {
  return fetchApi<PaymentSummary[]>("/api/v1/reports/payment-summary");
}

export async function getDailyPaymentReport(): Promise<DailyPaymentReport[]> {
  return fetchApi<DailyPaymentReport[]>("/api/v1/reports/daily-payments");
}

export async function getGeneralLedger(): Promise<unknown> {
  return fetchApi<unknown>("/api/v1/reports/general-ledger");
}

export async function createPayment(
  payment: CreatePaymentInput,
  idempotencyKey: string,
): Promise<Payment> {
  return fetchApi<Payment>("/api/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payment),
  });
}

export async function getApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

