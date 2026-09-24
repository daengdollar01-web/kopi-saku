"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Product = {
  id: number
  name: string
  price: number
}

type Promo = {
  id: number
  name: string
  description: string | null
  promo_type: string
  discount_value: number
  minimum_purchase: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  apply_scope: string
  fixed_price: number | null
  buy_quantity: number | null
  get_quantity: number | null
  buy_product_id: number | null
  get_product_id: number | null
}

const promoTypes = [
  {
    value: "percentage",
    label: "Diskon Persentase",
    description: "Contoh: diskon 10%"
  },
  {
    value: "nominal",
    label: "Diskon Nominal",
    description: "Contoh: potongan Rp5.000"
  },
  {
    value: "fixed_price",
    label: "Harga Khusus",
    description: "Contoh: semua menu menjadi Rp15.000"
  },
  {
    value: "buy_one_get_one",
    label: "Beli 1 Gratis 1",
    description: "Contoh: beli 1 Coffee Latte gratis 1"
  },
  {
    value: "buy_x_get_y",
    label: "Beli X Dapat Y",
    description: "Contoh: beli 2 Coffee Saku dapat 1 Americano"
  }
]

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value || 0)
}

export default function PromoPage() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [role, setRole] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Promo | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [promoType, setPromoType] = useState("percentage")
  const [discountValue, setDiscountValue] = useState("")
  const [fixedPrice, setFixedPrice] = useState("")
  const [minimumPurchase, setMinimumPurchase] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [applyScope, setApplyScope] = useState("all")
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [buyQuantity, setBuyQuantity] = useState("1")
  const [getQuantity, setGetQuantity] = useState("1")
  const [buyProductId, setBuyProductId] = useState("")
  const [getProductId, setGetProductId] = useState("")

  const canManage = role === "owner" || role === "manager"

  async function loadData() {
    setLoading(true)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    setRole(profile?.role || "")

    const [{ data: promoData }, { data: productData }] = await Promise.all([
      supabase
        .from("promos")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("products")
        .select("id,name,price")
        .eq("is_available", true)
        .order("name")
    ])

    setPromos((promoData || []) as Promo[])
    setProducts((productData || []) as Product[])

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const selectedPromoType = useMemo(
    () => promoTypes.find((item) => item.value === promoType),
    [promoType]
  )

  function resetForm() {
    setEditing(null)
    setName("")
    setDescription("")
    setPromoType("percentage")
    setDiscountValue("")
    setFixedPrice("")
    setMinimumPurchase("")
    setStartDate("")
    setEndDate("")
    setApplyScope("all")
    setSelectedProducts([])
    setBuyQuantity("1")
    setGetQuantity("1")
    setBuyProductId("")
    setGetProductId("")
  }

  function openAdd() {
    resetForm()
    setShowModal(true)
  }

  async function openEdit(promo: Promo) {
    setEditing(promo)
    setName(promo.name)
    setDescription(promo.description || "")
    setPromoType(promo.promo_type)
    setDiscountValue(String(promo.discount_value || ""))
    setFixedPrice(
      promo.fixed_price !== null ? String(promo.fixed_price) : ""
    )
    setMinimumPurchase(String(promo.minimum_purchase || ""))
    setStartDate(promo.start_date || "")
    setEndDate(promo.end_date || "")
    setApplyScope(promo.apply_scope || "all")
    setBuyQuantity(String(promo.buy_quantity || "1"))
    setGetQuantity(String(promo.get_quantity || "1"))
    setBuyProductId(String(promo.buy_product_id || ""))
    setGetProductId(String(promo.get_product_id || ""))

    const { data } = await supabase
      .from("promo_products")
      .select("product_id")
      .eq("promo_id", promo.id)

    setSelectedProducts(
      (data || []).map((item) => Number(item.product_id))
    )

    setShowModal(true)
  }

  function toggleProduct(productId: number) {
    setSelectedProducts((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    )
  }

  async function savePromo() {
    if (!canManage) {
      alert("Hanya Owner dan Manager yang dapat mengatur promo.")
      return
    }

    if (!name.trim()) {
      alert("Nama promo wajib diisi.")
      return
    }

    if (applyScope === "selected" && selectedProducts.length === 0) {
      alert("Pilih minimal satu menu yang terkena promo.")
      return
    }

    if (
      promoType === "percentage" &&
      (!discountValue || Number(discountValue) <= 0)
    ) {
      alert("Masukkan persentase diskon.")
      return
    }

    if (
      (promoType === "nominal" || promoType === "fixed_price") &&
      (!discountValue && !fixedPrice)
    ) {
      alert("Masukkan nilai promo.")
      return
    }

    if (
      (promoType === "buy_one_get_one" || promoType === "buy_x_get_y") &&
      (!buyProductId || !getProductId)
    ) {
      alert("Pilih menu yang dibeli dan menu yang didapat.")
      return
    }

    setSaving(true)

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      promo_type: promoType,
      discount_value:
        promoType === "percentage" || promoType === "nominal"
          ? Number(discountValue || 0)
          : 0,
      minimum_purchase: Number(minimumPurchase || 0),
      start_date: startDate || null,
      end_date: endDate || null,
      is_active: editing?.is_active ?? true,
      apply_scope: applyScope,
      fixed_price:
        promoType === "fixed_price"
          ? Number(fixedPrice || 0)
          : null,
      buy_quantity:
        promoType === "buy_one_get_one"
          ? 1
          : promoType === "buy_x_get_y"
            ? Number(buyQuantity || 1)
            : null,
      get_quantity:
        promoType === "buy_one_get_one"
          ? 1
          : promoType === "buy_x_get_y"
            ? Number(getQuantity || 1)
            : null,
      buy_product_id:
        promoType === "buy_one_get_one" || promoType === "buy_x_get_y"
          ? Number(buyProductId)
          : null,
      get_product_id:
        promoType === "buy_one_get_one" || promoType === "buy_x_get_y"
          ? Number(getProductId)
          : null
    }

    let promoId = editing?.id

    if (editing) {
      const { error } = await supabase
        .from("promos")
        .update(payload)
        .eq("id", editing.id)

      if (error) {
        alert(error.message)
        setSaving(false)
        return
      }

      await supabase
        .from("promo_products")
        .delete()
        .eq("promo_id", editing.id)
    } else {
      const { data, error } = await supabase
        .from("promos")
        .insert(payload)
        .select("id")
        .single()

      if (error) {
        alert(error.message)
        setSaving(false)
        return
      }

      promoId = data.id
    }

    if (promoId && applyScope === "selected") {
      const rows = selectedProducts.map((productId) => ({
        promo_id: promoId,
        product_id: productId
      }))

      const { error } = await supabase
        .from("promo_products")
        .insert(rows)

      if (error) {
        alert(error.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setShowModal(false)
    resetForm()
    await loadData()
  }

  async function toggleActive(promo: Promo) {
    if (!canManage) return

    const { error } = await supabase
      .from("promos")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id)

    if (error) {
      alert(error.message)
      return
    }

    await loadData()
  }

  async function deletePromo(promo: Promo) {
    if (!canManage) return

    const yes = confirm(
      `Hapus promo "${promo.name}"?`
    )

    if (!yes) return

    const { error } = await supabase
      .from("promos")
      .delete()
      .eq("id", promo.id)

    if (error) {
      alert(error.message)
      return
    }

    await loadData()
  }

  function promoLabel(promo: Promo) {
    if (promo.promo_type === "percentage") {
      return `Diskon ${promo.discount_value}%`
    }

    if (promo.promo_type === "nominal") {
      return `Potongan ${rupiah(promo.discount_value)}`
    }

    if (promo.promo_type === "fixed_price") {
      return `Harga khusus ${rupiah(promo.fixed_price || 0)}`
    }

    if (promo.promo_type === "buy_one_get_one") {
      return "Beli 1 Gratis 1"
    }

    return `Beli ${promo.buy_quantity} Dapat ${promo.get_quantity}`
  }

  function scopeLabel(promo: Promo) {
    return promo.apply_scope === "all"
      ? "Semua Menu"
      : "Menu Tertentu"
  }

  if (loading) {
    return (
      <main className="p-6">
        <p>Memuat promo...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Promo
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Atur promo KOPI SAKU yang dapat digunakan oleh kasir.
            </p>
          </div>

          {canManage && (
            <button
              onClick={openAdd}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              + Tambah Promo
            </button>
          )}
        </div>

        {!canManage && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Akun Anda hanya dapat melihat promo. Penambahan dan perubahan promo
            hanya dapat dilakukan oleh Owner atau Manager.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Promo</p>
            <p className="mt-2 text-3xl font-bold">{promos.length}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Promo Aktif</p>
            <p className="mt-2 text-3xl font-bold">
              {promos.filter((promo) => promo.is_active).length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Promo Nonaktif</p>
            <p className="mt-2 text-3xl font-bold">
              {promos.filter((promo) => !promo.is_active).length}
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-sm">
                <tr>
                  <th className="px-5 py-4">Promo</th>
                  <th className="px-5 py-4">Jenis</th>
                  <th className="px-5 py-4">Berlaku</th>
                  <th className="px-5 py-4">Periode</th>
                  <th className="px-5 py-4">Status</th>
                  {canManage && (
                    <th className="px-5 py-4">Aksi</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y">
                {promos.map((promo) => (
                  <tr key={promo.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {promo.name}
                      </p>
                      {promo.description && (
                        <p className="mt-1 text-xs text-slate-500">
                          {promo.description}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm">
                        {promoLabel(promo)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {scopeLabel(promo)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {promo.start_date || "Tanpa batas"}{" "}
                      →{" "}
                      {promo.end_date || "Tanpa batas"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          promo.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {promo.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>

                    {canManage && (
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(promo)}
                            className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => toggleActive(promo)}
                            className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            {promo.is_active
                              ? "Nonaktifkan"
                              : "Aktifkan"}
                          </button>

                          <button
                            onClick={() => deletePromo(promo)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}

                {promos.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManage ? 6 : 5}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Belum ada promo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {editing ? "Edit Promo" : "Tambah Promo"}
                </h2>
                <p className="text-sm text-slate-500">
                  Buat aturan promo yang nantinya dijalankan oleh kasir.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="text-2xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Nama Promo
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Promo Ulang Tahun Reza"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Keterangan
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan promo..."
                  rows={3}
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Jenis Promo
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  {promoTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setPromoType(type.value)}
                      className={`rounded-xl border p-4 text-left ${
                        promoType === type.value
                          ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-semibold">
                        {type.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {type.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {selectedPromoType && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <strong>{selectedPromoType.label}</strong>
                  {" — "}
                  {selectedPromoType.description}
                </div>
              )}

              {promoType === "percentage" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Besar Diskon (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="10"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
              )}

              {promoType === "nominal" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Potongan Harga
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="5000"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
              )}

              {promoType === "fixed_price" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Harga Khusus
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={fixedPrice}
                    onChange={(e) => setFixedPrice(e.target.value)}
                    placeholder="15000"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
              )}

              {(promoType === "buy_one_get_one" ||
                promoType === "buy_x_get_y") && (
                <div className="rounded-xl border p-4">
                  {promoType === "buy_x_get_y" && (
                    <div className="mb-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          Beli Berapa?
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={buyQuantity}
                          onChange={(e) =>
                            setBuyQuantity(e.target.value)
                          }
                          className="w-full rounded-xl border px-4 py-3"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          Dapat Berapa?
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={getQuantity}
                          onChange={(e) =>
                            setGetQuantity(e.target.value)
                          }
                          className="w-full rounded-xl border px-4 py-3"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Menu yang Dibeli
                      </label>

                      <select
                        value={buyProductId}
                        onChange={(e) =>
                          setBuyProductId(e.target.value)
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      >
                        <option value="">
                          Pilih menu
                        </option>

                        {products.map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                          >
                            {product.name} — {rupiah(product.price)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Menu yang Didapat
                      </label>

                      <select
                        value={getProductId}
                        onChange={(e) =>
                          setGetProductId(e.target.value)
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      >
                        <option value="">
                          Pilih menu
                        </option>

                        {products.map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                          >
                            {product.name} — {rupiah(product.price)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Promo Berlaku Untuk
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setApplyScope("all")}
                    className={`rounded-xl border p-4 text-left ${
                      applyScope === "all"
                        ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900"
                        : ""
                    }`}
                  >
                    <p className="font-semibold">
                      Semua Menu
                    </p>
                    <p className="text-xs text-slate-500">
                      Promo berlaku untuk semua menu
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplyScope("selected")}
                    className={`rounded-xl border p-4 text-left ${
                      applyScope === "selected"
                        ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900"
                        : ""
                    }`}
                  >
                    <p className="font-semibold">
                      Menu Tertentu
                    </p>
                    <p className="text-xs text-slate-500">
                      Pilih menu yang mendapatkan promo
                    </p>
                  </button>
                </div>
              </div>

              {applyScope === "selected" && (
                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        Pilih Menu
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedProducts.length} menu dipilih
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedProducts(
                          selectedProducts.length === products.length
                            ? []
                            : products.map((product) => product.id)
                        )
                      }
                      className="text-sm font-semibold"
                    >
                      {selectedProducts.length === products.length
                        ? "Batal Pilih Semua"
                        : "Pilih Semua"}
                    </button>
                  </div>

                  <div className="grid max-h-72 gap-2 overflow-y-auto md:grid-cols-2">
                    {products.map((product) => {
                      const selected = selectedProducts.includes(
                        product.id
                      )

                      return (
                        <label
                          key={product.id}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${
                            selected
                              ? "border-slate-900 bg-slate-50"
                              : ""
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold">
                              {product.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {rupiah(product.price)}
                            </p>
                          </div>

                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleProduct(product.id)
                            }
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Minimal Pembelian
                </label>
                <input
                  type="number"
                  min="0"
                  value={minimumPurchase}
                  onChange={(e) =>
                    setMinimumPurchase(e.target.value)
                  }
                  placeholder="0 = tidak ada minimal pembelian"
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(e.target.value)
                    }
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Tanggal Berakhir
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                      setEndDate(e.target.value)
                    }
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="rounded-xl border px-5 py-3 font-semibold"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={savePromo}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Promo"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </main>
  )
}
