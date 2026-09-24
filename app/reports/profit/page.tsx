"use client";

import { useEffect, useMemo, useState } from "react";
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

type Expense = {
  id: number;
  expense_number: string;
  description: string;
  amount: number;
  expense_date: string;
};

type TransactionItem = {
  transaction_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type Recipe = {
  product_id: number;
  inventory_item_id: number;
  quantity: number;
  inventory_items?: {
    purchase_price: number;
  }[] | null;
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function ProfitReportPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  async function loadData() {
    setLoading(true);

    const [{ data: transactionData }, { data: expenseData }, { data: itemData }, { data: recipeData }] =
      await Promise.all([
        supabase
          .from("transactions")
          .select(
            "id, invoice_number, transaction_date, total, discount, payment_method, payment_status"
          )
          .gte("transaction_date", `${startDate}T00:00:00`)
          .lte("transaction_date", `${endDate}T23:59:59`)
          .neq("payment_status", "cancelled")
          .order("transaction_date", { ascending: false }),

        supabase
          .from("expenses")
          .select("id, expense_number, description, amount, expense_date")
          .gte("expense_date", startDate)
          .lte("expense_date", endDate)
          .order("expense_date", { ascending: false }),

        supabase
          .from("transaction_items")
          .select(
            "transaction_id, product_id, product_name, quantity, price, subtotal"
          ),

        supabase
          .from("recipes")
          .select(`
            product_id,
            inventory_item_id,
            quantity,
            inventory_items(
              purchase_price
            )
          `),
      ]);

    setTransactions((transactionData || []) as Transaction[]);
    setExpenses((expenseData || []) as Expense[]);
    setItems((itemData || []) as TransactionItem[]);
    setRecipes((recipeData || []) as Recipe[]);

    setLoading(false);
  }

  const transactionIds = useMemo(
    () => new Set(transactions.map((transaction) => transaction.id)),
    [transactions]
  );

  const periodItems = useMemo(
    () =>
      items.filter((item) => transactionIds.has(item.transaction_id)),
    [items, transactionIds]
  );

  const summary = useMemo(() => {
    /*
      Bill Gantung tidak dihitung sebagai penjualan tunai langsung.
      Pembayaran Bill Gantung akan masuk ketika pembayaran bill dicatat.
    */
    const normalTransactions = transactions.filter(
      (transaction) => transaction.payment_status !== "bill"
    );

    const sales = normalTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.total || 0),
      0
    );

    const discount = normalTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.discount || 0),
      0
    );

    const expenseTotal = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    let hpp = 0;

    periodItems.forEach((item) => {
      const productRecipes = recipes.filter(
        (recipe) => recipe.product_id === item.product_id
      );

      const unitHpp = productRecipes.reduce((sum, recipe) => {
        const purchasePrice =
          Number(recipe.inventory_items?.[0]?.purchase_price || 0);

        return sum + Number(recipe.quantity || 0) * purchasePrice;
      }, 0);

      hpp += unitHpp * Number(item.quantity || 0);
    });

    const grossProfit = sales - hpp;
    const netProfit = grossProfit - expenseTotal;

    const cashSales = normalTransactions
      .filter((transaction) => transaction.payment_method === "cash")
      .reduce((sum, transaction) => sum + Number(transaction.total || 0), 0);

    const qrisSales = normalTransactions
      .filter((transaction) => transaction.payment_method === "qris")
      .reduce((sum, transaction) => sum + Number(transaction.total || 0), 0);

    return {
      sales,
      discount,
      hpp,
      grossProfit,
      expenseTotal,
      netProfit,
      cashSales,
      qrisSales,
      transactionCount: normalTransactions.length,
      itemCount: periodItems.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ),
    };
  }, [transactions, expenses, periodItems, recipes]);

  const productSummary = useMemo(() => {
    const map = new Map<
      number,
      {
        name: string;
        quantity: number;
        sales: number;
        hpp: number;
        profit: number;
      }
    >();

    periodItems.forEach((item) => {
      const transaction = transactions.find(
        (transaction) => transaction.id === item.transaction_id
      );

      if (!transaction || transaction.payment_status === "bill") return;

      const productRecipes = recipes.filter(
        (recipe) => recipe.product_id === item.product_id
      );

      const unitHpp = productRecipes.reduce((sum, recipe) => {
        const purchasePrice =
          Number(recipe.inventory_items?.[0]?.purchase_price || 0);

        return sum + Number(recipe.quantity || 0) * purchasePrice;
      }, 0);

      const current = map.get(item.product_id) || {
        name: item.product_name,
        quantity: 0,
        sales: 0,
        hpp: 0,
        profit: 0,
      };

      const quantity = Number(item.quantity || 0);
      const sales = Number(item.subtotal || 0);
      const hpp = unitHpp * quantity;

      current.quantity += quantity;
      current.sales += sales;
      current.hpp += hpp;
      current.profit += sales - hpp;

      map.set(item.product_id, current);
    });

    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [periodItems, recipes, transactions]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Laporan Laba
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan penjualan, HPP, pengeluaran, dan laba berdasarkan periode.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Dari
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Sampai
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={loadData}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Refresh Laporan
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Penjualan</p>
            <p className="mt-2 text-2xl font-bold">
              {rupiah(summary.sales)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">HPP</p>
            <p className="mt-2 text-2xl font-bold text-orange-600">
              {rupiah(summary.hpp)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Laba Kotor</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {rupiah(summary.grossProfit)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Laba Bersih</p>
            <p className="mt-2 text-2xl font-bold text-blue-600">
              {rupiah(summary.netProfit)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Transaksi</p>
            <p className="mt-2 text-xl font-bold">
              {summary.transactionCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Item Terjual</p>
            <p className="mt-2 text-xl font-bold">
              {summary.itemCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Cash</p>
            <p className="mt-2 text-lg font-bold">
              {rupiah(summary.cashSales)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">QRIS</p>
            <p className="mt-2 text-lg font-bold">
              {rupiah(summary.qrisSales)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pengeluaran</p>
            <p className="mt-2 text-lg font-bold text-red-600">
              {rupiah(summary.expenseTotal)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">
              Rincian Laba per Menu
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-5 py-4">No</th>
                  <th className="px-5 py-4">Menu</th>
                  <th className="px-5 py-4 text-right">Qty</th>
                  <th className="px-5 py-4 text-right">Penjualan</th>
                  <th className="px-5 py-4 text-right">HPP</th>
                  <th className="px-5 py-4 text-right">Laba</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Memuat data...
                    </td>
                  </tr>
                ) : productSummary.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Belum ada data penjualan.
                    </td>
                  </tr>
                ) : (
                  productSummary.map((product, index) => (
                    <tr
                      key={`${product.name}-${index}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-5 py-4">{index + 1}</td>
                      <td className="px-5 py-4 font-semibold">
                        {product.name}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {product.quantity}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {rupiah(product.sales)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {rupiah(product.hpp)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                        {rupiah(product.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <strong>Perhitungan:</strong> Laba Kotor = Penjualan − HPP.
          Laba Bersih = Laba Kotor − Pengeluaran.
        </div>
      </div>
    </main>
  );
}
