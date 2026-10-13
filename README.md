# Financial Payment Integration Dashboard

Dashboard untuk memantau dan mengelola integrasi pembayaran secara terpusat. Project ini dibuat untuk memberikan gambaran operasional mengenai status transaksi, ringkasan pembayaran, data customer, serta laporan harian dari sistem pembayaran yang terhubung ke API backend.

## Overview

Project ini adalah aplikasi dashboard berbasis Next.js yang dirancang untuk membantu tim operasional, finance, dan support dalam memantau performa pembayaran dari satu antarmuka. Dashboard ini menampilkan data seperti ringkasan transaksi per mata uang, status pembayaran, customer register, hingga laporan keuangan harian.

## Features

- Monitoring kesehatan API pembayaran
- Ringkasan transaksi lintas mata uang
- Daftar transaksi terbaru dengan status pembayaran
- Filter dan pencarian data transaksi
- Data customer dan pembuatan customer baru
- Laporan harian pembayaran
- General ledger overview
- Refresh data realtime melalui dashboard
- Form pembuatan pembayaran dan customer

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- REST API integration

## Project Structure

```bash
.
├── app/
│   ├── api/
│   │   └── dashboard/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── payment-dashboard.tsx
│   └── sales-workspace.tsx
├── lib/
│   └── api.ts
├── public/
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── next-env.d.ts
└── README.md
```

## Prerequisites

Pastikan perangkat Anda telah memiliki:

- Node.js 20+
- npm, pnpm, yarn, atau bun

## Getting Started

1. Clone repository

```bash
git clone <repository-url>
cd financial-payment-integration-dashboard
```

2. Install dependencies

```bash
npm install
```

3. Jalankan aplikasi dalam mode development

```bash
npm run dev
```

4. Buka browser ke URL berikut:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev     # start development server
npm run build   # build production app
npm run start   # run production build
npm run lint    # run ESLint
```

## Environment Configuration

Aplikasi ini menggunakan endpoint API default dari file `lib/api.ts`:

```ts
const API_BASE_URL =
  process.env.API_BASE_URL ??
  "https://financial-payment-integration-api.vercel.app";
```

Jika Anda ingin menggunakan backend lain, set variabel environment berikut:

```bash
export API_BASE_URL=https://your-payment-api-url
```

## API Integration

Dashboard ini berinteraksi dengan endpoint berikut:

- `/api/v1/payments`
- `/api/v1/customers`
- `/api/v1/products`
- `/api/v1/warehouses`
- `/api/v1/inventory`
- `/api/v1/inventory/movements`
- `/api/v1/sales-orders`
- `/api/v1/sales-orders/{id}`
- `/api/v1/sales-orders/{id}/confirm`
- `/api/v1/sales-orders/{id}/deliver`
- `/api/v1/reports/payment-summary`
- `/api/v1/reports/daily-payments`
- `/api/v1/reports/general-ledger`
- `/health`

Semua data diambil dan diproses melalui `lib/api.ts` agar koneksi backend tetap terpusat dan mudah dikelola.
Operasi persisten diteruskan melalui backend API yang terhubung ke database Neon; kredensial database tetap berada di backend dan tidak dikirim ke browser.

## Use Case

Project ini cocok digunakan untuk:

- dashboard monitoring pembayaran
- overview transaksi harian
- analisis status pembayaran dan settlement
- administrasi customer dan transaksi
- prototipe sistem keuangan yang terintegrasi dengan API eksternal

## Notes

Aplikasi ini dibuat sebagai dashboard frontend yang berfungsi dengan API backend payment integration. Jika backend tidak aktif atau endpoint tidak tersedia, beberapa bagian dashboard akan menampilkan status error dan pesan fallback secara aman.

## Contributing

Pull requests dan improvement sangat welcome. Jika Anda ingin menambahkan fitur baru atau memperbaiki UI, silakan buat branch baru dan kirimkan PR dengan deskripsi yang jelas.
