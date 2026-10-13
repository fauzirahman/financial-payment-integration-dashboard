import SalesWorkspace from "./sales-workspace";
import {
  getCustomers,
  getApiHealth,
  getDailyPaymentReport,
  getGeneralLedger,
  getInventory,
  getInventoryMovements,
  getPaymentSummary,
  getPayments,
  getProducts,
  getSalesOrders,
  getWarehouses,
  type Customer,
  type DailyPaymentReport,
  type InventoryMovement,
  type InventoryStock,
  type Payment,
  type PaymentSummary,
  type Product,
  type SalesOrder,
  type Warehouse,
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
      getGeneralLedger(),
      getProducts(),
      getWarehouses(),
      getInventory(),
      getInventoryMovements(),
      getSalesOrders(),
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
  const products: Product[] = productsResult.status === "fulfilled" ? productsResult.value : [];
  const warehouses: Warehouse[] = warehousesResult.status === "fulfilled" ? warehousesResult.value : [];
  const inventory: InventoryStock[] = inventoryResult.status === "fulfilled" ? inventoryResult.value : [];
  const movements: InventoryMovement[] = movementsResult.status === "fulfilled" ? movementsResult.value : [];
  const salesOrders: SalesOrder[] = salesOrdersResult.status === "fulfilled" ? salesOrdersResult.value : [];
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
      products={products}
      warehouses={warehouses}
      inventory={inventory}
      movements={movements}
      salesOrders={salesOrders}
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
      productError={productsResult.status === "rejected" ? "Katalog produk gagal dimuat dari API." : null}
      warehouseError={warehousesResult.status === "rejected" ? "Data gudang gagal dimuat dari API." : null}
      inventoryError={inventoryResult.status === "rejected" ? "Saldo inventory gagal dimuat dari API." : null}
      movementError={movementsResult.status === "rejected" ? "Riwayat mutasi gagal dimuat dari API." : null}
      salesOrderError={salesOrdersResult.status === "rejected" ? "Sales order gagal dimuat dari API." : null}
    />
  );
}