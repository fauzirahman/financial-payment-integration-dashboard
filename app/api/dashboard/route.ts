import { NextResponse } from "next/server";
import {
  ApiError,
  createCustomer,
  createInventoryMovement,
  createPayment,
  createProduct,
  createSalesOrder,
  createWarehouse,
  confirmSalesOrder,
  deliverSalesOrder,
  getCustomers,
  getApiHealth,
  getDailyPaymentReport,
  getInventory,
  getInventoryMovements,
  getGeneralLedger,
  getPaymentSummary,
  getPayments,
  getProducts,
  getSalesOrder,
  getSalesOrders,
  getWarehouses,
  type CreateCustomerInput,
  type CreateInventoryMovementInput,
  type CreatePaymentInput,
  type CreateProductInput,
  type CreateSalesOrderInput,
  type CreateWarehouseInput,
} from "@/lib/api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id");
  if (orderId) {
    try {
      return NextResponse.json(await getSalesOrder(orderId));
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 502;
      const message = error instanceof Error ? error.message : "Detail sales order gagal dimuat.";
      return NextResponse.json({ message }, { status });
    }
  }

  const [
    healthResult,
    summaryResult,
    paymentsResult,
    customersResult,
    reportResult,
    ledgerResult,
    productsResult,
    warehousesResult,
    inventoryResult,
    movementsResult,
    salesOrdersResult,
  ] = await Promise.allSettled([
      getApiHealth(),
      getPaymentSummary(),
      getPayments(),
      getCustomers(),
      getDailyPaymentReport(),
      getGeneralLedger({
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        account_code: url.searchParams.get("account_code") ?? undefined,
      }),
      getProducts(),
      getWarehouses(),
      getInventory(),
      getInventoryMovements(),
      getSalesOrders(),
    ]);

  return NextResponse.json({
    health: healthResult.status === "fulfilled" && healthResult.value,
    summary: summaryResult.status === "fulfilled" ? summaryResult.value : [],
    payments: paymentsResult.status === "fulfilled" ? paymentsResult.value : [],
    customers: customersResult.status === "fulfilled" ? customersResult.value : [],
    dailyReport: reportResult.status === "fulfilled" ? reportResult.value : [],
    ledger: ledgerResult.status === "fulfilled" ? ledgerResult.value : null,
    products: productsResult.status === "fulfilled" ? productsResult.value : [],
    warehouses: warehousesResult.status === "fulfilled" ? warehousesResult.value : [],
    inventory: inventoryResult.status === "fulfilled" ? inventoryResult.value : [],
    movements: movementsResult.status === "fulfilled" ? movementsResult.value : [],
    salesOrders: salesOrdersResult.status === "fulfilled" ? salesOrdersResult.value : [],
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
    productError: productsResult.status === "rejected" ? "Katalog produk gagal dimuat dari API." : null,
    warehouseError: warehousesResult.status === "rejected" ? "Data gudang gagal dimuat dari API." : null,
    inventoryError: inventoryResult.status === "rejected" ? "Saldo inventory gagal dimuat dari API." : null,
    movementError: movementsResult.status === "rejected" ? "Riwayat mutasi gagal dimuat dari API." : null,
    salesOrderError: salesOrdersResult.status === "rejected" ? "Sales order gagal dimuat dari API." : null,
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
    if (payload.entity === "product") {
      if (typeof payload.sku !== "string" || typeof payload.name !== "string" || typeof payload.unit !== "string") {
        return NextResponse.json({ message: "SKU, nama produk, dan unit wajib diisi." }, { status: 400 });
      }
      const product: CreateProductInput = {
        sku: payload.sku.trim(),
        name: payload.name.trim(),
        unit: payload.unit.trim(),
        ...(typeof payload.description === "string" ? { description: payload.description.trim() } : {}),
      };
      return NextResponse.json(await createProduct(product), { status: 201 });
    }

    if (payload.entity === "warehouse") {
      if (typeof payload.code !== "string" || typeof payload.name !== "string") {
        return NextResponse.json({ message: "Kode dan nama gudang wajib diisi." }, { status: 400 });
      }
      const warehouse: CreateWarehouseInput = {
        code: payload.code.trim(),
        name: payload.name.trim(),
        ...(payload.address && typeof payload.address === "object" && !Array.isArray(payload.address)
          ? { address: payload.address as Record<string, unknown> }
          : {}),
      };
      return NextResponse.json(await createWarehouse(warehouse), { status: 201 });
    }

    if (payload.entity === "inventoryMovement") {
      if (
        typeof payload.product_id !== "string" ||
        typeof payload.warehouse_id !== "string" ||
        typeof payload.quantity_delta !== "number" ||
        !Number.isFinite(payload.quantity_delta) ||
        typeof payload.reason !== "string" ||
        (payload.type !== "RECEIPT" && payload.type !== "ADJUSTMENT")
      ) {
        return NextResponse.json({ message: "Produk, gudang, jumlah, alasan, dan tipe mutasi wajib valid." }, { status: 400 });
      }
      const movement: CreateInventoryMovementInput = {
        product_id: payload.product_id,
        warehouse_id: payload.warehouse_id,
        quantity_delta: payload.quantity_delta,
        reason: payload.reason.trim(),
      };
      return NextResponse.json(await createInventoryMovement(movement, payload.type), { status: 201 });
    }

    if (payload.entity === "salesOrder") {
      if (
        typeof payload.customer_id !== "string" ||
        typeof payload.currency !== "string" ||
        !Array.isArray(payload.items) ||
        payload.items.length === 0
      ) {
        return NextResponse.json({ message: "Customer, mata uang, dan minimal satu item order wajib diisi." }, { status: 400 });
      }
      const order = payload as unknown as CreateSalesOrderInput;
      return NextResponse.json(await createSalesOrder(order), { status: 201 });
    }

    if (payload.entity === "salesOrderAction") {
      if (
        typeof payload.id !== "string" ||
        typeof payload.warehouse_id !== "string" ||
        (payload.action !== "confirm" && payload.action !== "deliver")
      ) {
        return NextResponse.json({ message: "Order, gudang, dan aksi yang valid wajib dipilih." }, { status: 400 });
      }
      const result = payload.action === "confirm"
        ? await confirmSalesOrder(payload.id, payload.warehouse_id)
        : await deliverSalesOrder(payload.id, payload.warehouse_id);
      return NextResponse.json(result, { status: payload.action === "deliver" ? 201 : 200 });
    }

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