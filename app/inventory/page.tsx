"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Item = {
  id: number
  name: string
  unit: string
  current_stock: number
  minimum_stock: number
  purchase_price: number
  supplier: string | null
  is_active: boolean
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)

  const [name, setName] = useState("")
  const [unit, setUnit] = useState("")
  const [minimumStock, setMinimumStock] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [supplier, setSupplier] = useState("")

  async function loadItems() {
    setLoading(true)

    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name")

    if (!error) {
      setItems(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadItems()
  }, [])

  function openAdd() {
    setEditing(null)
    setName("")
    setUnit("")
    setMinimumStock("")
    setPurchasePrice("")
    setSupplier("")
    setShowModal(true)
  }

  function openEdit(item: Item) {
    setEditing(item)
    setName(item.name)
    setUnit(item.unit)
    setMinimumStock(String(item.minimum_stock))
    setPurchasePrice(String(item.purchase_price))
    setSupplier(item.supplier || "")
    setShowModal(true)
  }

  async function saveItem() {
    if (!name || !unit) {
      alert("Nama bahan dan satuan wajib diisi.")
      return
    }

    const payload = {
      name,
      unit,
      minimum_stock: Number(minimumStock) || 0,
      purchase_price: Number(purchasePrice) || 0,
      supplier: supplier || null,
    }

    if (editing) {
      const { error } = await supabase
        .from("inventory_items")
        .update(payload)
        .eq("id", editing.id)

      if (error) {
        alert(error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from("inventory_items")
        .insert({
          ...payload,
          current_stock: 0,
          is_active: true,
        })

      if (error) {
        alert(error.message)
        return
      }
    }

    setShowModal(false)
    loadItems()
  }

  async function toggleStatus(item: Item) {
    const { error } = await supabase
      .from("inventory_items")
      .update({ is_active: !item.is_active })
      .eq("id", item.id)

    if (error) {
      alert(error.message)
      return
    }

    loadItems()
  }

  function formatRupiah(value: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Bahan Baku
            </h1>
            <p className="text-sm text-slate-500">
              Kelola bahan baku dan persediaan KOPI SAKU
            </p>
          </div>

          <button
            onClick={openAdd}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            + Tambah Bahan
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Bahan</p>
            <p className="mt-2 text-3xl font-bold">{items.length}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Bahan Aktif</p>
            <p className="mt-2 text-3xl font-bold">
              {items.filter(x => x.is_active).length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Stok Menipis</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {
                items.filter(
                  x =>
                    x.is_active &&
                    Number(x.current_stock) <= Number(x.minimum_stock)
                ).length
              }
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left">Bahan</th>
                  <th className="px-5 py-4 text-left">Stok</th>
                  <th className="px-5 py-4 text-left">Minimum</th>
                  <th className="px-5 py-4 text-left">Harga Beli</th>
                  <th className="px-5 py-4 text-left">Supplier</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center">
                      Memuat data...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      Belum ada bahan baku.
                    </td>
                  </tr>
                ) : (
                  items.map(item => {
                    const low =
                      item.is_active &&
                      Number(item.current_stock) <= Number(item.minimum_stock)

                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-5 py-4 font-semibold">
                          {item.name}
                        </td>

                        <td className="px-5 py-4">
                          <span className={low ? "font-bold text-red-600" : ""}>
                            {item.current_stock} {item.unit}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {item.minimum_stock} {item.unit}
                        </td>

                        <td className="px-5 py-4">
                          {formatRupiah(item.purchase_price)}
                        </td>

                        <td className="px-5 py-4">
                          {item.supplier || "-"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => openEdit(item)}
                            className="mr-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => toggleStatus(item)}
                            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold"
                          >
                            {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </td>
                      </tr>
                    )
                  })
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
                {editing ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
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
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nama bahan"
                className="w-full rounded-xl border px-4 py-3"
              />

              <input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="Satuan, contoh: kg, liter, pcs"
                className="w-full rounded-xl border px-4 py-3"
              />

              <input
                type="number"
                value={minimumStock}
                onChange={e => setMinimumStock(e.target.value)}
                placeholder="Minimum stok"
                className="w-full rounded-xl border px-4 py-3"
              />

              <input
                type="number"
                value={purchasePrice}
                onChange={e => setPurchasePrice(e.target.value)}
                placeholder="Harga beli"
                className="w-full rounded-xl border px-4 py-3"
              />

              <input
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder="Supplier"
                className="w-full rounded-xl border px-4 py-3"
              />

              <button
                onClick={saveItem}
                className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
