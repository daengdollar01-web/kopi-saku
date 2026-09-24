"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type InventoryItem = {
  id: number
  name: string
  unit: string
  current_stock: number
  minimum_stock: number
  purchase_price: number
  supplier: string | null
  is_active: boolean
}

type Movement = {
  inventory_item_id: number
  movement_type: string
  quantity: number
}

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)

export default function StockReportPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  async function loadReport() {
    setLoading(true)

    const [{ data: inventoryData, error: inventoryError }, { data: movementData, error: movementError }] =
      await Promise.all([
        supabase
          .from("inventory_items")
          .select(
            "id, name, unit, current_stock, minimum_stock, purchase_price, supplier, is_active"
          )
          .order("name"),

        supabase
          .from("inventory_movements")
          .select(
            "inventory_item_id, movement_type, quantity"
          ),
      ])

    if (inventoryError) {
      console.error(inventoryError)
      setItems([])
    } else {
      setItems(inventoryData || [])
    }

    if (movementError) {
      console.error(movementError)
      setMovements([])
    } else {
      setMovements(movementData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadReport()
  }, [])

  const activeItems = items.filter(
    (item) => item.is_active
  )

  const totalBahan = activeItems.length

  const stokHabis = activeItems.filter(
    (item) => Number(item.current_stock) <= 0
  )

  const stokMenipis = activeItems.filter(
    (item) =>
      Number(item.current_stock) > 0 &&
      Number(item.current_stock) <= Number(item.minimum_stock)
  )

  const stokAman = activeItems.filter(
    (item) =>
      Number(item.current_stock) >
      Number(item.minimum_stock)
  )

  const nilaiPersediaan = activeItems.reduce(
    (sum, item) =>
      sum +
      Number(item.current_stock || 0) *
        Number(item.purchase_price || 0),
    0
  )

  const totalStokMasuk = movements
    .filter((movement) => movement.movement_type === "in")
    .reduce(
      (sum, movement) =>
        sum + Number(movement.quantity || 0),
      0
    )

  const totalStokKeluar = movements
    .filter((movement) => movement.movement_type === "out")
    .reduce(
      (sum, movement) =>
        sum + Number(movement.quantity || 0),
      0
    )

  const filteredItems = activeItems.filter((item) =>
    item.name
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const getStatus = (item: InventoryItem) => {
    const stock = Number(item.current_stock)
    const minimum = Number(item.minimum_stock)

    if (stock <= 0) {
      return {
        label: "Habis",
        className:
          "bg-red-100 text-red-700",
      }
    }

    if (stock <= minimum) {
      return {
        label: "Menipis",
        className:
          "bg-yellow-100 text-yellow-700",
      }
    }

    return {
      label: "Aman",
      className:
        "bg-green-100 text-green-700",
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Laporan Stok
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Monitoring kondisi dan nilai persediaan bahan baku
            </p>
          </div>

          <div className="flex items-center gap-2">

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Cari bahan..."
              className="w-64 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none"
            />

            <button
              onClick={loadReport}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {loading ? "Memuat..." : "Refresh"}
            </button>

          </div>

        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

            <p className="text-sm text-slate-500">
              Total Bahan
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totalBahan}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

            <p className="text-sm text-slate-500">
              Stok Aman
            </p>

            <p className="mt-2 text-2xl font-bold text-green-600">
              {stokAman.length}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

            <p className="text-sm text-slate-500">
              Stok Menipis
            </p>

            <p className="mt-2 text-2xl font-bold text-yellow-600">
              {stokMenipis.length}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

            <p className="text-sm text-slate-500">
              Stok Habis
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {stokHabis.length}
            </p>

          </div>

        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

            <p className="text-sm text-slate-500">
              Nilai Persediaan
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {rupiah(nilaiPersediaan)}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

            <p className="text-sm text-slate-500">
              Total Stok Masuk
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {totalStokMasuk}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

            <p className="text-sm text-slate-500">
              Total Stok Keluar
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {totalStokKeluar}
            </p>

          </div>

        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">

          <div className="border-b border-slate-200 p-5">

            <h2 className="text-lg font-bold text-slate-900">
              Detail Persediaan
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Kondisi stok seluruh bahan baku aktif
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
                    Bahan
                  </th>

                  <th className="px-5 py-3 text-right">
                    Stok
                  </th>

                  <th className="px-5 py-3 text-right">
                    Minimum
                  </th>

                  <th className="px-5 py-3 text-right">
                    Harga Beli
                  </th>

                  <th className="px-5 py-3 text-right">
                    Nilai Stok
                  </th>

                  <th className="px-5 py-3 text-left">
                    Supplier
                  </th>

                  <th className="px-5 py-3 text-center">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredItems.map((item, index) => {

                  const status = getStatus(item)

                  const stockValue =
                    Number(item.current_stock || 0) *
                    Number(item.purchase_price || 0)

                  return (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100"
                    >

                      <td className="px-5 py-4">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {item.name}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {item.current_stock} {item.unit}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {item.minimum_stock} {item.unit}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {rupiah(
                          Number(item.purchase_price || 0)
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {rupiah(stockValue)}
                      </td>

                      <td className="px-5 py-4">
                        {item.supplier || "-"}
                      </td>

                      <td className="px-5 py-4 text-center">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>

                      </td>

                    </tr>
                  )
                })}

                {filteredItems.length === 0 && (

                  <tr>

                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Tidak ada bahan baku ditemukan.
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
