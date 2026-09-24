"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Transaction = {
  id: number
  invoice_number: string
  transaction_date: string
  subtotal: number
  discount: number
  total: number
  payment_method: string
  payment_status: string
  notes: string | null
}

type TransactionItem = {
  id: number
  product_name: string
  quantity: number
  price: number
  subtotal: number
}

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [items, setItems] = useState<TransactionItem[]>([])
  const [search, setSearch] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value)

  const formatDate = (value: string) =>
    new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    })

  const loadTransactions = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false })

    if (error) {
      console.error(error)
      alert("Gagal mengambil riwayat transaksi.")
      setLoading(false)
      return
    }

    setTransactions((data || []) as Transaction[])
    setLoading(false)
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  const openDetail = async (transaction: Transaction) => {
    setSelected(transaction)
    setItems([])
    setDetailLoading(true)

    const { data, error } = await supabase
      .from("transaction_items")
      .select("*")
      .eq("transaction_id", transaction.id)
      .order("id", { ascending: true })

    if (error) {
      console.error(error)
      alert("Gagal mengambil detail transaksi.")
    } else {
      setItems((data || []) as TransactionItem[])
    }

    setDetailLoading(false)
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const matchSearch = transaction.invoice_number
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchPayment =
      paymentFilter === "all" ||
      transaction.payment_method === paymentFilter

    return matchSearch && matchPayment
  })

  const paymentLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      qris: "QRIS",
      debit: "Debit",
      transfer: "Transfer",
      ewallet: "E-Wallet",
      bill: "Bill Gantung",
    }

    return labels[method] || method
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Riwayat Transaksi
          </h1>
          <p className="mt-1 text-gray-500">
            Lihat dan periksa seluruh transaksi KOPI SAKU.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Transaksi</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {filteredTransactions.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Penjualan</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatRupiah(
                filteredTransactions.reduce(
                  (sum, transaction) => sum + Number(transaction.total),
                  0
                )
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Transaksi Hari Ini</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {
                transactions.filter((transaction) => {
                  const date = new Date(transaction.transaction_date)
                  const today = new Date()

                  return (
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear()
                  )
                }).length
              }
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row">
          <input
            type="text"
            placeholder="Cari nomor invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-400"
          />

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-3 outline-none"
          >
            <option value="all">Semua Pembayaran</option>
            <option value="cash">Cash</option>
            <option value="qris">QRIS</option>
            <option value="debit">Debit</option>
            <option value="transfer">Transfer</option>
            <option value="ewallet">E-Wallet</option>
            <option value="bill">Bill Gantung</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-semibold">
                    Invoice
                  </th>
                  <th className="px-5 py-4 text-left text-sm font-semibold">
                    Tanggal
                  </th>
                  <th className="px-5 py-4 text-left text-sm font-semibold">
                    Pembayaran
                  </th>
                  <th className="px-5 py-4 text-right text-sm font-semibold">
                    Total
                  </th>
                  <th className="px-5 py-4 text-center text-sm font-semibold">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-500">
                      Memuat transaksi...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-500">
                      Belum ada transaksi.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-semibold">
                        {transaction.invoice_number}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatDate(transaction.transaction_date)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                          {paymentLabel(transaction.payment_method)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {formatRupiah(Number(transaction.total))}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => openDetail(transaction)}
                          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">

              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    Detail Transaksi
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {selected.invoice_number}
                  </p>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="text-2xl text-gray-400 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <div className="mb-5 rounded-xl bg-gray-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span>Tanggal</span>
                  <span className="font-medium">
                    {formatDate(selected.transaction_date)}
                  </span>
                </div>

                <div className="mt-2 flex justify-between">
                  <span>Pembayaran</span>
                  <span className="font-medium">
                    {paymentLabel(selected.payment_method)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {detailLoading ? (
                  <p className="py-5 text-center text-gray-500">
                    Memuat detail...
                  </p>
                ) : items.length === 0 ? (
                  <p className="py-5 text-center text-gray-500">
                    Tidak ada item transaksi.
                  </p>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between border-b border-gray-100 pb-3"
                    >
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-gray-500">
                          {item.quantity} × {formatRupiah(Number(item.price))}
                        </p>
                      </div>

                      <p className="font-semibold">
                        {formatRupiah(Number(item.subtotal))}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 space-y-2 border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatRupiah(Number(selected.subtotal))}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Diskon</span>
                  <span>{formatRupiah(Number(selected.discount))}</span>
                </div>

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatRupiah(Number(selected.total))}</span>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="mt-6 w-full rounded-xl bg-black py-3 font-semibold text-white hover:bg-gray-800"
              >
                Cetak Struk
              </button>

            </div>
          </div>
        )}

      </div>
    </main>
  )
}
