"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Expense = {
  id: number
  expense_number: string
  category: string
  description: string
  amount: number
  payment_method: string
  expense_date: string
  created_at: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  )

  async function loadExpenses() {
    setLoading(true)

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })

    if (error) {
      alert(error.message)
    } else {
      setExpenses(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  function rupiah(value: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  async function saveExpense() {
    if (!category || !description || Number(amount) <= 0) {
      alert("Kategori, keterangan dan nominal wajib diisi.")
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const expenseNumber =
      "KS-EXP-" +
      Date.now()

    const { error } = await supabase
      .from("expenses")
      .insert({
        expense_number: expenseNumber,
        category,
        description,
        amount: Number(amount),
        payment_method: paymentMethod,
        expense_date: expenseDate,
        created_by: userData.user?.id || null,
      })

    if (error) {
      alert(error.message)
      return
    }

    setCategory("")
    setDescription("")
    setAmount("")
    setPaymentMethod("cash")
    setExpenseDate(new Date().toISOString().split("T")[0])
    setShowModal(false)

    loadExpenses()
  }

  const total = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  )

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Pengeluaran
            </h1>
            <p className="text-sm text-slate-500">
              Catat dan pantau seluruh pengeluaran KOPI SAKU
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            + Tambah Pengeluaran
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Pengeluaran
            </p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {rupiah(total)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Jumlah Pengeluaran
            </p>
            <p className="mt-2 text-2xl font-bold">
              {expenses.length}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left">Nomor</th>
                  <th className="px-5 py-4 text-left">Tanggal</th>
                  <th className="px-5 py-4 text-left">Kategori</th>
                  <th className="px-5 py-4 text-left">Keterangan</th>
                  <th className="px-5 py-4 text-left">Pembayaran</th>
                  <th className="px-5 py-4 text-right">Nominal</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center">
                      Memuat data...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                      Belum ada pengeluaran.
                    </td>
                  </tr>
                ) : (
                  expenses.map(item => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-5 py-4 font-semibold">
                        {item.expense_number}
                      </td>

                      <td className="px-5 py-4">
                        {new Date(item.expense_date).toLocaleDateString("id-ID")}
                      </td>

                      <td className="px-5 py-4">
                        {item.category}
                      </td>

                      <td className="px-5 py-4">
                        {item.description}
                      </td>

                      <td className="px-5 py-4">
                        {item.payment_method}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-red-600">
                        {rupiah(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Tambah Pengeluaran
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="text-xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">

              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Kategori, contoh: Operasional"
                className="w-full rounded-xl border px-4 py-3"
              />

              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Keterangan"
                className="w-full rounded-xl border px-4 py-3"
              />

              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Nominal"
                className="w-full rounded-xl border px-4 py-3"
              />

              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="cash">Cash</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer</option>
                <option value="debit">Debit</option>
                <option value="ewallet">E-Wallet</option>
              </select>

              <input
                type="date"
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />

              <button
                onClick={saveExpense}
                className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white"
              >
                Simpan Pengeluaran
              </button>

            </div>
          </div>
        </div>
      )}
    </main>
  )
}
