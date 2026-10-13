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

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  unit: string;
  is_stocked?: boolean;
  is_active?: boolean;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: Record<string, unknown> | null;
  is_active?: boolean;
}

export interface InventoryStock {
  product_id: string;
  sku: string;
  product_name: string;
  warehouse_id: string;
  warehouse: string;
  on_hand: number;
  reserved: number;
  available: number;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  warehouse_id: string;
  warehouse: string;
  movement_type: string;
  quantity_delta: number;
  reference_type?: string | null;
  reference_id?: string | null;
  occurred_at: string;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  unit: string;
}

export interface CreateWarehouseInput {
  code: string;
  name: string;
  address?: Record<string, unknown>;
}

export interface CreateInventoryMovementInput {
  product_id: string;
  warehouse_id: string;
  quantity_delta: number;
  reason: string;
}

export interface SalesOrderItem {
  id?: string;
  product_id: string;
  sku?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate?: number;
  line_total?: number;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  currency: string;
  subtotal: number;
  tax_total: number;
  total: number;
  payment_terms?: string | null;
  delivery_address?: Record<string, unknown> | null;
  items: SalesOrderItem[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSalesOrderInput {
  customer_id: string;
  currency: string;
  payment_terms?: string;
  delivery_address?: Record<string, unknown>;
  items: Omit<SalesOrderItem, "id" | "line_total">[];
}

export interface GeneralLedgerEntry {
  id?: string;
  entry_date?: string;
  date?: string;
  account_code?: string;
  account_name?: string;
  description?: string;
  reference?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  currency?: string;
  [field: string]: unknown;
}

export type GeneralLedgerResponse =
  | GeneralLedgerEntry[]
  | { entries?: GeneralLedgerEntry[]; data?: GeneralLedgerEntry[] };

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

export async function getGeneralLedger(filters: {
  from?: string;
  to?: string;
  account_code?: string;
} = {}): Promise<GeneralLedgerResponse> {
  const query = new URLSearchParams({ format: "json" });
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.account_code) query.set("account_code", filters.account_code);
  return fetchApi<GeneralLedgerResponse>(`/api/v1/reports/general-ledger?${query}`);
}

export async function getProducts(): Promise<Product[]> {
  return fetchApi<Product[]>("/api/v1/products");
}

export async function createProduct(product: CreateProductInput): Promise<Product> {
  return fetchApi<Product>("/api/v1/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
}

export async function getWarehouses(): Promise<Warehouse[]> {
  return fetchApi<Warehouse[]>("/api/v1/warehouses");
}

export async function createWarehouse(warehouse: CreateWarehouseInput): Promise<Warehouse> {
  return fetchApi<Warehouse>("/api/v1/warehouses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(warehouse),
  });
}

export async function getInventory(): Promise<InventoryStock[]> {
  return fetchApi<InventoryStock[]>("/api/v1/inventory");
}

export async function getInventoryMovements(limit = 50): Promise<InventoryMovement[]> {
  return fetchApi<InventoryMovement[]>(`/api/v1/inventory/movements?limit=${limit}`);
}

export async function createInventoryMovement(
  movement: CreateInventoryMovementInput,
  type: "RECEIPT" | "ADJUSTMENT",
): Promise<InventoryMovement> {
  return fetchApi<InventoryMovement>(`/api/v1/inventory/movements?type=${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(movement),
  });
}

export async function getSalesOrders(): Promise<SalesOrder[]> {
  return fetchApi<SalesOrder[]>("/api/v1/sales-orders");
}

export async function getSalesOrder(id: string): Promise<SalesOrder> {
  return fetchApi<SalesOrder>(`/api/v1/sales-orders/${encodeURIComponent(id)}`);
}

export async function createSalesOrder(order: CreateSalesOrderInput): Promise<SalesOrder> {
  return fetchApi<SalesOrder>("/api/v1/sales-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
}

export async function confirmSalesOrder(id: string, warehouse_id: string): Promise<SalesOrder> {
  return fetchApi<SalesOrder>(`/api/v1/sales-orders/${encodeURIComponent(id)}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ warehouse_id }),
  });
}

export async function deliverSalesOrder(id: string, warehouse_id: string): Promise<unknown> {
  return fetchApi<unknown>(`/api/v1/sales-orders/${encodeURIComponent(id)}/deliver`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ warehouse_id }),
  });
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

