"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Transaction = {
  id: number
  transaction_date: string
  payment_status: string
}

type TransactionItem = {
  id: number
  transaction_id: number
  product_id: number
  product_name: string
  quantity: number
  subtotal: number
}

type ProductSummary = {
  product_id: number
  product_name: string
  quantity: number
  omzet: number
  transactions: number
}

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (date: Date) =>
  date.toISOString().split("T")[0]

export default function TopProductsPage() {
  const today = new Date()

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    return formatDate(d)
  })

  const [endDate, setEndDate] = useState(formatDate(today))

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [items, setItems] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(false)

  async function loadReport() {
    setLoading(true)

    const { data: transactionData, error: transactionError } =
      await supabase
        .from("transactions")
        .select(
          "id, transaction_date, payment_status"
        )
        .gte("transaction_date", `${startDate}T00:00:00`)
        .lte("transaction_date", `${endDate}T23:59:59`)
        .neq("payment_status", "cancelled")

    if (transactionError) {
      console.error(transactionError)
      setTransactions([])
      setItems([])
      setLoading(false)
      return
    }

    const validTransactions = (transactionData || []).filter(
      (transaction) =>
        transaction.payment_status !== "bill"
    )

    const transactionIds = validTransactions.map(
      (transaction) => transaction.id
    )

    let itemData: TransactionItem[] = []

    if (transactionIds.length > 0) {
      const { data, error } = await supabase
        .from("transaction_items")
        .select(
          "id, transaction_id, product_id, product_name, quantity, subtotal"
        )
        .in("transaction_id", transactionIds)

      if (error) {
        console.error(error)
      } else {
        itemData = data || []
      }
    }

    setTransactions(validTransactions)
    setItems(itemData)
    setLoading(false)
  }

  useEffect(() => {
    loadReport()
  }, [])

  const productMap = new Map<number, ProductSummary>()

  items.forEach((item) => {
    const productId = Number(item.product_id)
    const existing = productMap.get(productId)

    if (existing) {
      existing.quantity += Number(item.quantity || 0)
      existing.omzet += Number(item.subtotal || 0)

      if (!existing.transactions) {
        existing.transactions = 0
      }

      existing.transactions += 1
    } else {
      productMap.set(productId, {
        product_id: productId,
        product_name: item.product_name,
        quantity: Number(item.quantity || 0),
        omzet: Number(item.subtotal || 0),
        transactions: 1,
      })
    }
  })

  const products = Array.from(productMap.values()).sort(
    (a, b) => {
      if (b.quantity !== a.quantity) {
        return b.quantity - a.quantity
      }

      return b.omzet - a.omzet
    }
  )

  const totalItems = products.reduce(
    (sum, product) => sum + product.quantity,
    0
  )

  const totalOmzet = products.reduce(
    (sum, product) => sum + product.omzet,
    0
  )

  const topProduct = products[0] || null

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Produk Terlaris
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Ranking produk berdasarkan jumlah yang terjual
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
              Produk Terlaris
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {topProduct
                ? topProduct.product_name
                : "-"}
            </p>

            {topProduct && (
              <p className="mt-1 text-sm text-slate-500">
                {topProduct.quantity} item terjual
              </p>
            )}

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

            <p className="text-sm text-slate-500">
              Total Item Terjual
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totalItems}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

            <p className="text-sm text-slate-500">
              Jenis Produk Terjual
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {products.length}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

            <p className="text-sm text-slate-500">
              Total Omzet
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {rupiah(totalOmzet)}
            </p>

          </div>

        </div>

        {topProduct && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

              <div>
                <p className="text-sm font-medium text-slate-500">
                  #1 Produk Terlaris
                </p>

                <h2 className="mt-1 text-3xl font-bold text-slate-900">
                  {topProduct.product_name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {topProduct.quantity} item terjual dari{" "}
                  {topProduct.transactions} transaksi
                </p>
              </div>

              <div className="text-left md:text-right">

                <p className="text-sm text-slate-500">
                  Omzet Produk
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {rupiah(topProduct.omzet)}
                </p>

              </div>

            </div>

          </div>
        )}

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">

          <div className="border-b border-slate-200 p-5">

            <h2 className="text-lg font-bold text-slate-900">
              Ranking Produk
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Diurutkan berdasarkan jumlah item terjual
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-50">

                <tr>

                  <th className="px-5 py-3 text-left">
                    Ranking
                  </th>

                  <th className="px-5 py-3 text-left">
                    Produk
                  </th>

                  <th className="px-5 py-3 text-right">
                    Terjual
                  </th>

                  <th className="px-5 py-3 text-right">
                    Transaksi
                  </th>

                  <th className="px-5 py-3 text-right">
                    Omzet
                  </th>

                </tr>

              </thead>

              <tbody>

                {products.map((product, index) => (

                  <tr
                    key={product.product_id}
                    className="border-t border-slate-100"
                  >

                    <td className="px-5 py-4 font-bold">
                      #{index + 1}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      {product.product_name}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold">
                      {product.quantity}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {product.transactions}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold">
                      {rupiah(product.omzet)}
                    </td>

                  </tr>

                ))}

                {products.length === 0 && (

                  <tr>

                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Belum ada produk terjual pada periode ini.
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
