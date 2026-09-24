"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Transaction = {
  id: number;
  invoice_number: string;
  transaction_date: string;
  total: number;
  discount: number;
  payment_method: string;
  payment_status: string;
};

type TransactionItem = {
  transaction_id: number;
  product_name: string;
  quantity: number;
  subtotal: number;
};

type Expense = {
  id: number;
  description: string;
  amount: number;
  expense_date: string;
};

type Bill = {
  id: number;
  owner_name: string;
  total_amount: number;
  paid_amount: number;
  status: string;
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const today = new Date().toISOString().slice(0, 10);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const startSevenDays = sevenDaysAgo.toISOString().slice(0, 10);

    const [
      { data: transactionData },
      { data: itemData },
      { data: expenseData },
      { data: billData },
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, invoice_number, transaction_date, total, discount, payment_method, payment_status"
        )
        .gte("transaction_date", `${startSevenDays}T00:00:00`)
        .order("transaction_date", { ascending: false }),

      supabase
        .from("transaction_items")
        .select("transaction_id, product_name, quantity, subtotal"),

      supabase
        .from("expenses")
        .select("id, description, amount, expense_date")
        .gte("expense_date", startSevenDays)
        .order("expense_date", { ascending: false }),

      supabase
        .from("bills")
        .select("id, owner_name, total_amount, paid_amount, status")
        .in("owner_name", ["Reza", "Thato"])
        .neq("status", "paid")
        .neq("status", "cancelled"),
    ]);

    setTransactions((transactionData || []) as Transaction[]);
    setItems((itemData || []) as TransactionItem[]);
    setExpenses((expenseData || []) as Expense[]);
    setBills((billData || []) as Bill[]);

    setLoading(false);
  }

  const today = new Date().toISOString().slice(0, 10);

  const todayTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        transaction.transaction_date.startsWith(today)
      ),
    [transactions, today]
  );

  const todayNormalTransactions = useMemo(
    () =>
      todayTransactions.filter(
        (transaction) =>
          transaction.payment_status !== "bill" &&
          transaction.payment_status !== "cancelled"
      ),
    [todayTransactions]
  );

  const omzetHariIni = useMemo(
    () =>
      todayNormalTransactions.reduce(
        (sum, transaction) => sum + Number(transaction.total || 0),
        0
      ),
    [todayNormalTransactions]
  );

  const transaksiHariIni = todayNormalTransactions.length;

  const pengeluaranHariIni = useMemo(
    () =>
      expenses
        .filter((expense) => expense.expense_date === today)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses, today]
  );

  const cashHariIni = useMemo(
    () =>
      todayNormalTransactions
        .filter((transaction) => transaction.payment_method === "cash")
        .reduce((sum, transaction) => sum + Number(transaction.total || 0), 0),
    [todayNormalTransactions]
  );

  const qrisHariIni = useMemo(
    () =>
      todayNormalTransactions
        .filter((transaction) => transaction.payment_method === "qris")
        .reduce((sum, transaction) => sum + Number(transaction.total || 0), 0),
    [todayNormalTransactions]
  );

  const billBelumLunas = useMemo(
    () =>
      bills.reduce(
        (sum, bill) =>
          sum +
          Math.max(
            0,
            Number(bill.total_amount || 0) -
              Number(bill.paid_amount || 0)
          ),
        0
      ),
    [bills]
  );

  const labaSementara = omzetHariIni - pengeluaranHariIni;

  const topProducts = useMemo(() => {
    const todayIds = new Set(
      todayNormalTransactions.map((transaction) => transaction.id)
    );

    const map = new Map<
      string,
      {
        name: string;
        quantity: number;
        sales: number;
      }
    >();

    items.forEach((item) => {
      if (!todayIds.has(item.transaction_id)) return;

      const current = map.get(item.product_name) || {
        name: item.product_name,
        quantity: 0,
        sales: 0,
      };

      current.quantity += Number(item.quantity || 0);
      current.sales += Number(item.subtotal || 0);

      map.set(item.product_name, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [items, todayNormalTransactions]);

  const recentTransactions = todayTransactions.slice(0, 8);

  const lastSevenDays = useMemo(() => {
    const days: {
      date: string;
      label: string;
      sales: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const dateString = date.toISOString().slice(0, 10);

      const sales = transactions
        .filter(
          (transaction) =>
            transaction.transaction_date.startsWith(dateString) &&
            transaction.payment_status !== "bill" &&
            transaction.payment_status !== "cancelled"
        )
        .reduce(
          (sum, transaction) => sum + Number(transaction.total || 0),
          0
        );

      days.push({
        date: dateString,
        label: date.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "2-digit",
        }),
        sales,
      });
    }

    return days;
  }, [transactions]);

  const maxSales = Math.max(
    ...lastSevenDays.map((day) => day.sales),
    1
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Ringkasan operasional KOPI SAKU hari ini.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Refresh Data
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm">
            Memuat dashboard...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Omzet Hari Ini
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {rupiah(omzetHariIni)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {transaksiHariIni} transaksi
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Pengeluaran Hari Ini
                </p>
                <p className="mt-2 text-2xl font-bold text-red-600">
                  {rupiah(pengeluaranHariIni)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Laba Sementara
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {rupiah(labaSementara)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  omzet − pengeluaran
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Bill Gantung
                </p>
                <p className="mt-2 text-2xl font-bold text-orange-600">
                  {rupiah(billBelumLunas)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  belum lunas
                </p>
              </div>

            </div>

            <div className="grid gap-4 md:grid-cols-3">

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Penjualan Cash
                </p>
                <p className="mt-2 text-xl font-bold">
                  {rupiah(cashHariIni)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Penjualan QRIS
                </p>
                <p className="mt-2 text-xl font-bold">
                  {rupiah(qrisHariIni)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total Bill Gantung
                </p>
                <p className="mt-2 text-xl font-bold text-orange-600">
                  {rupiah(billBelumLunas)}
                </p>
              </div>

            </div>

            <div className="grid gap-6 lg:grid-cols-2">

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Penjualan 7 Hari
                    </h2>
                    <p className="text-xs text-slate-400">
                      Pergerakan omzet
                    </p>
                  </div>

                  <Link
                    href="/reports/weekly"
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Lihat laporan
                  </Link>
                </div>

                <div className="mt-6 space-y-4">
                  {lastSevenDays.map((day) => (
                    <div key={day.date}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-slate-500">
                          {day.label}
                        </span>
                        <span className="font-semibold">
                          {rupiah(day.sales)}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-900"
                          style={{
                            width: `${Math.max(
                              3,
                              (day.sales / maxSales) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Produk Terlaris Hari Ini
                    </h2>
                    <p className="text-xs text-slate-400">
                      Berdasarkan jumlah terjual
                    </p>
                  </div>

                  <Link
                    href="/reports/top-products"
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Lihat semua
                  </Link>
                </div>

                <div className="mt-5 space-y-3">
                  {topProducts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">
                      Belum ada penjualan hari ini.
                    </p>
                  ) : (
                    topProducts.map((product, index) => (
                      <div
                        key={product.name}
                        className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                            {index + 1}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {product.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {product.quantity} terjual
                            </p>
                          </div>
                        </div>

                        <p className="text-sm font-semibold">
                          {rupiah(product.sales)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            <div className="rounded-2xl bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Transaksi Terbaru
                  </h2>
                  <p className="text-xs text-slate-400">
                    Aktivitas transaksi hari ini
                  </p>
                </div>

                <Link
                  href="/transactions/history"
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  Lihat semua
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-5 py-4">Invoice</th>
                      <th className="px-5 py-4">Waktu</th>
                      <th className="px-5 py-4">Pembayaran</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentTransactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-slate-400"
                        >
                          Belum ada transaksi hari ini.
                        </td>
                      </tr>
                    ) : (
                      recentTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-5 py-4 font-semibold">
                            {transaction.invoice_number}
                          </td>

                          <td className="px-5 py-4 text-slate-500">
                            {formatDateTime(
                              transaction.transaction_date
                            )}
                          </td>

                          <td className="px-5 py-4 uppercase">
                            {transaction.payment_method}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                              {transaction.payment_status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right font-semibold">
                            {rupiah(transaction.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">

              <Link
                href="/transactions"
                className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm transition hover:bg-slate-800"
              >
                <p className="text-lg font-bold">Kasir</p>
                <p className="mt-1 text-sm text-slate-300">
                  Buat transaksi baru
                </p>
              </Link>

              <Link
                href="/products"
                className="rounded-2xl bg-white p-5 shadow-sm transition hover:bg-slate-50"
              >
                <p className="text-lg font-bold">Menu</p>
                <p className="mt-1 text-sm text-slate-500">
                  Kelola produk KOPI SAKU
                </p>
              </Link>

              <Link
                href="/inventory"
                className="rounded-2xl bg-white p-5 shadow-sm transition hover:bg-slate-50"
              >
                <p className="text-lg font-bold">Bahan & Stok</p>
                <p className="mt-1 text-sm text-slate-500">
                  Pantau persediaan
                </p>
              </Link>

              <Link
                href="/finance/expenses"
                className="rounded-2xl bg-white p-5 shadow-sm transition hover:bg-slate-50"
              >
                <p className="text-lg font-bold">Pengeluaran</p>
                <p className="mt-1 text-sm text-slate-500">
                  Catat pengeluaran operasional
                </p>
              </Link>

            </div>
          </>
        )}
      </div>
    </main>
  );
}
