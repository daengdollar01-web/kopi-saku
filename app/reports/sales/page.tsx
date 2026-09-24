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

type TransactionItem = {
  id: number
  transaction_id: number
  product_id: number
  product_name: string
  quantity: number
  price: number
  subtotal: number
}

type ProductSummary = {
  product_id: number
  product_name: string
  quantity: number
  omzet: number
}

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)

const getDate = (date: Date) =>
  date.toISOString().split("T")[0]

export default function SalesReportPage() {
  const today = new Date()

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    return getDate(d)
  })

  const [endDate, setEndDate] = useState(getDate(today))

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [items, setItems] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(false)

  async function loadReport() {
    setLoading(true)

    const { data: transactionData, error: transactionError } =
      await supabase
        .from("transactions")
        .select(
          "id, invoice_number, transaction_date, total, discount, payment_method, payment_status"
        )
        .gte("transaction_date", `${startDate}T00:00:00`)
        .lte("transaction_date", `${endDate}T23:59:59`)
        .neq("payment_status", "cancelled")
        .order("transaction_date", { ascending: false })

    if (transactionError) {
      console.error(transactionError)
      setTransactions([])
      setItems([])
      setLoading(false)
      return
    }

    const transactionIds = (transactionData || []).map(
      (transaction) => transaction.id
    )

    let itemData: TransactionItem[] = []

    if (transactionIds.length > 0) {
      const { data, error } = await supabase
        .from("transaction_items")
        .select(
          "id, transaction_id, product_id, product_name, quantity, price, subtotal"
        )
        .in("transaction_id", transactionIds)

      if (error) {
        console.error(error)
      } else {
        itemData = data || []
      }
    }

    setTransactions(transactionData || [])
    setItems(itemData)
    setLoading(false)
  }

  useEffect(() => {
    loadReport()
  }, [])

  const normalTransactions = transactions.filter(
    (transaction) => transaction.payment_status !== "bill"
  )

  const billTransactions = transactions.filter(
    (transaction) => transaction.payment_status === "bill"
  )

  const totalOmzet = normalTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.total || 0),
    0
  )

  const totalBill = billTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.total || 0),
    0
  )

  const totalDiskon = transactions.reduce(
    (sum, transaction) => sum + Number(transaction.discount || 0),
    0
  )

  const totalItem = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  )

  const totalCash = normalTransactions
    .filter((transaction) => transaction.payment_method === "cash")
    .reduce(
      (sum, transaction) => sum + Number(transaction.total || 0),
      0
    )

  const totalQris = normalTransactions
    .filter((transaction) => transaction.payment_method === "qris")
    .reduce(
      (sum, transaction) => sum + Number(transaction.total || 0),
      0
    )

  const averageTransaction =
    normalTransactions.length > 0
      ? totalOmzet / normalTransactions.length
      : 0

  const productMap = new Map<number, ProductSummary>()

  items.forEach((item) => {
    const productId = Number(item.product_id)

    const existing = productMap.get(productId)

    if (existing) {
      existing.quantity += Number(item.quantity || 0)
      existing.omzet += Number(item.subtotal || 0)
    } else {
      productMap.set(productId, {
        product_id: productId,
        product_name: item.product_name,
        quantity: Number(item.quantity || 0),
        omzet: Number(item.subtotal || 0),
      })
    }
  })

  const productSummary = Array.from(productMap.values()).sort(
    (a, b) => b.omzet - a.omzet
  )

  const topProduct =
    productSummary.length > 0
      ? productSummary[0]
      : null

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Laporan Penjualan
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Analisis penjualan berdasarkan periode dan produk
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
            />

            <span className="text-slate-400">
              sampai
            </span>

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
            />

            <button
              onClick={loadReport}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {loading ? "Memuat..." : "Tampilkan"}
            </button>

          </div>

        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Total Omzet
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {rupiah(totalOmzet)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Total Transaksi
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {normalTransactions.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Item Terjual
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totalItem}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Rata-rata Transaksi
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {rupiah(averageTransaction)}
            </p>
          </div>

        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Cash
            </p>

            <p className="mt-2 text-xl font-bold">
              {rupiah(totalCash)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              QRIS
            </p>

            <p className="mt-2 text-xl font-bold">
              {rupiah(totalQris)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Bill Gantung
            </p>

            <p className="mt-2 text-xl font-bold">
              {rupiah(totalBill)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Total Diskon
            </p>

            <p className="mt-2 text-xl font-bold">
              {rupiah(totalDiskon)}
            </p>
          </div>

        </div>

        {topProduct && (
          <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

            <p className="text-sm text-slate-500">
              Produk dengan omzet tertinggi
            </p>

            <div className="mt-2 flex flex-col md:flex-row md:items-end md:justify-between">

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {topProduct.product_name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {topProduct.quantity} item terjual
                </p>
              </div>

              <p className="mt-3 text-2xl font-bold text-slate-900 md:mt-0">
                {rupiah(topProduct.omzet)}
              </p>

            </div>

          </div>
        )}

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">

          <div className="border-b border-slate-200 p-5">

            <h2 className="text-lg font-bold text-slate-900">
              Penjualan Berdasarkan Produk
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Produk diurutkan berdasarkan omzet terbesar
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-50">

                <tr>
                  <th className="px-5 py-3 text-left">
                    #
                  </th>

                  <th className="px-5 py-3 text-left">
                    Produk
                  </th>

                  <th className="px-5 py-3 text-right">
                    Jumlah Terjual
                  </th>

                  <th className="px-5 py-3 text-right">
                    Omzet
                  </th>
                </tr>

              </thead>

              <tbody>

                {productSummary.map((product, index) => (

                  <tr
                    key={product.product_id}
                    className="border-t border-slate-100"
                  >

                    <td className="px-5 py-3 font-medium">
                      {index + 1}
                    </td>

                    <td className="px-5 py-3 font-medium">
                      {product.product_name}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {product.quantity}
                    </td>

                    <td className="px-5 py-3 text-right font-semibold">
                      {rupiah(product.omzet)}
                    </td>

                  </tr>

                ))}

                {productSummary.length === 0 && (

                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Belum ada penjualan produk pada periode ini.
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
