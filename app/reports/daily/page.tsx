"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Transaction = {
  id: number
  invoice_number: string
  transaction_date: string
  total: number
  discount: number
  payment_method: string
  payment_status: string
}

type Expense = {
  id: number
  expense_number: string
  description: string
  amount: number
  payment_method: string
  expense_date: string
}

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)

export default function DailyReportPage() {
  const today = new Date().toISOString().split("T")[0]

  const [date, setDate] = useState(today)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)

  async function loadReport(selectedDate = date) {
    setLoading(true)

    const [{ data: transactionData }, { data: expenseData }] =
      await Promise.all([
        supabase
          .from("transactions")
          .select(
            "id, invoice_number, transaction_date, total, discount, payment_method, payment_status"
          )
          .gte("transaction_date", `${selectedDate}T00:00:00`)
          .lte("transaction_date", `${selectedDate}T23:59:59`)
          .neq("payment_status", "cancelled")
          .order("transaction_date", { ascending: false }),

        supabase
          .from("expenses")
          .select(
            "id, expense_number, description, amount, payment_method, expense_date"
          )
          .eq("expense_date", selectedDate)
          .order("created_at", { ascending: false }),
      ])

    setTransactions(transactionData || [])
    setExpenses(expenseData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadReport()
  }, [])

  const totalPenjualan = transactions
    .filter((t) => t.payment_status !== "bill")
    .reduce((sum, t) => sum + Number(t.total || 0), 0)

  const totalBill = transactions
    .filter((t) => t.payment_status === "bill")
    .reduce((sum, t) => sum + Number(t.total || 0), 0)

  const totalDiskon = transactions.reduce(
    (sum, t) => sum + Number(t.discount || 0),
    0
  )

  const totalCash = transactions
    .filter(
      (t) =>
        t.payment_method === "cash" && t.payment_status !== "bill"
    )
    .reduce((sum, t) => sum + Number(t.total || 0), 0)

  const totalQris = transactions
    .filter(
      (t) =>
        t.payment_method === "qris" && t.payment_status !== "bill"
    )
    .reduce((sum, t) => sum + Number(t.total || 0), 0)

  const totalPengeluaran = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  )

  const kasBersih = totalCash + totalQris - totalPengeluaran

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Laporan Harian
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Ringkasan aktivitas KOPI SAKU berdasarkan tanggal
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none"
            />

            <button
              onClick={() => loadReport()}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {loading ? "Memuat..." : "Tampilkan"}
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Total Penjualan</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {rupiah(totalPenjualan)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Transaksi</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {transactions.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Bill Gantung</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {rupiah(totalBill)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Kas Bersih</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {rupiah(kasBersih)}
            </p>
          </div>

        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Cash</p>
            <p className="mt-2 text-xl font-bold">
              {rupiah(totalCash)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">QRIS</p>
            <p className="mt-2 text-xl font-bold">
              {rupiah(totalQris)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Diskon</p>
            <p className="mt-2 text-xl font-bold">
              {rupiah(totalDiskon)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Pengeluaran</p>
            <p className="mt-2 text-xl font-bold">
              {rupiah(totalPengeluaran)}
            </p>
          </div>

        </div>

        <div className="mb-6 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900">
              Transaksi Hari Ini
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left">Invoice</th>
                  <th className="px-5 py-3 text-left">Waktu</th>
                  <th className="px-5 py-3 text-left">Pembayaran</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-3 font-medium">
                      {transaction.invoice_number}
                    </td>

                    <td className="px-5 py-3 text-slate-500">
                      {new Date(
                        transaction.transaction_date
                      ).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="px-5 py-3 uppercase">
                      {transaction.payment_method}
                    </td>

                    <td className="px-5 py-3">
                      {transaction.payment_status}
                    </td>

                    <td className="px-5 py-3 text-right font-semibold">
                      {rupiah(Number(transaction.total))}
                    </td>
                  </tr>
                ))}

                {transactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Tidak ada transaksi pada tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900">
              Pengeluaran
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left">Nomor</th>
                  <th className="px-5 py-3 text-left">Keterangan</th>
                  <th className="px-5 py-3 text-left">Pembayaran</th>
                  <th className="px-5 py-3 text-right">Jumlah</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-3 font-medium">
                      {expense.expense_number}
                    </td>

                    <td className="px-5 py-3">
                      {expense.description}
                    </td>

                    <td className="px-5 py-3 uppercase">
                      {expense.payment_method}
                    </td>

                    <td className="px-5 py-3 text-right font-semibold">
                      {rupiah(Number(expense.amount))}
                    </td>
                  </tr>
                ))}

                {expenses.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Tidak ada pengeluaran pada tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  )
}
