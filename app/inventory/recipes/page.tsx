"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Product = {
  id: number
  name: string
  price: number
}

type Item = {
  id: number
  name: string
  unit: string
  purchase_price: number
}

type Recipe = {
  id: number
  product_id: number
  inventory_item_id: number
  quantity: number
  inventory_items?: {
    name: string
    unit: string
    purchase_price: number
  }[] | null
}

export default function RecipesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])

  const [productId, setProductId] = useState("")
  const [itemId, setItemId] = useState("")
  const [quantity, setQuantity] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    setLoading(true)

    const [productsResult, itemsResult, recipesResult] =
      await Promise.all([
        supabase
          .from("products")
          .select("id,name,price")
          .eq("is_available", true)
          .order("name"),

        supabase
          .from("inventory_items")
          .select("id,name,unit,purchase_price")
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("recipes")
          .select(`
            id,
            product_id,
            inventory_item_id,
            quantity,
            inventory_items (
              name,
              unit,
              purchase_price
            )
          `)
          .order("id"),
      ])

    if (productsResult.error) {
      alert(productsResult.error.message)
    }

    if (itemsResult.error) {
      alert(itemsResult.error.message)
    }

    if (recipesResult.error) {
      alert(recipesResult.error.message)
    }

    setProducts(productsResult.data || [])
    setItems(itemsResult.data || [])
    setRecipes((recipesResult.data as Recipe[]) || [])

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function addRecipe() {
    if (!productId || !itemId || Number(quantity) <= 0) {
      alert("Produk, bahan dan jumlah wajib diisi.")
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from("recipes")
      .insert({
        product_id: Number(productId),
        inventory_item_id: Number(itemId),
        quantity: Number(quantity),
      })

    if (error) {
      if (error.code === "23505") {
        alert("Bahan tersebut sudah ada di resep produk ini.")
      } else {
        alert(error.message)
      }

      setSaving(false)
      return
    }

    setItemId("")
    setQuantity("")

    await loadData()

    setSaving(false)
  }

  async function deleteRecipe(id: number) {
    if (!confirm("Hapus bahan ini dari resep?")) {
      return
    }

    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", id)

    if (error) {
      alert(error.message)
      return
    }

    loadData()
  }

  function formatRupiah(value: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const selectedProduct = products.find(
    x => String(x.id) === productId
  )

  const selectedRecipes = recipes.filter(
    x => String(x.product_id) === productId
  )

  const hpp = selectedRecipes.reduce((total, recipe) => {
    const item = recipe.inventory_items?.[0]

    if (!item) return total

    return total +
      Number(recipe.quantity) *
      Number(item.purchase_price)
  }, 0)

  const margin = selectedProduct
    ? Number(selectedProduct.price) - hpp
    : 0

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Resep & HPP
          </h1>

          <p className="text-sm text-slate-500">
            Atur komposisi bahan dan hitung harga pokok produk
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-lg font-bold">
              Tambah Bahan ke Resep
            </h2>

            <div className="space-y-4">

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Produk
                </label>

                <select
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                >
                  <option value="">
                    Pilih produk
                  </option>

                  {products.map(product => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Bahan
                </label>

                <select
                  value={itemId}
                  onChange={e => setItemId(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                >
                  <option value="">
                    Pilih bahan
                  </option>

                  {items.map(item => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Jumlah
                </label>

                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="Contoh: 18"
                  className="w-full rounded-xl border px-4 py-3"
                />

                {itemId && (
                  <p className="mt-2 text-xs text-slate-500">
                    Satuan: {
                      items.find(x => String(x.id) === itemId)?.unit
                    }
                  </p>
                )}
              </div>

              <button
                onClick={addRecipe}
                disabled={saving}
                className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Tambah ke Resep"}
              </button>

            </div>
          </div>

          <div className="lg:col-span-2">

            <div className="mb-5 rounded-2xl bg-white p-6 shadow-sm">

              <label className="mb-2 block text-sm font-semibold">
                Lihat Resep Produk
              </label>

              <select
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="">
                  Pilih produk
                </option>

                {products.map(product => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                  </option>
                ))}
              </select>

            </div>

            {selectedProduct && (
              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Harga Jual
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {formatRupiah(selectedProduct.price)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    HPP
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {formatRupiah(hpp)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Selisih Harga - HPP
                  </p>
                  <p className="mt-2 text-xl font-bold text-green-600">
                    {formatRupiah(margin)}
                  </p>
                </div>

              </div>
            )}

            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

              {loading ? (
                <div className="p-10 text-center">
                  Memuat data...
                </div>
              ) : !productId ? (
                <div className="p-10 text-center text-slate-500">
                  Pilih produk untuk melihat resep.
                </div>
              ) : selectedRecipes.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  Belum ada resep untuk produk ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">

                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="px-5 py-4 text-left">
                          Bahan
                        </th>

                        <th className="px-5 py-4 text-left">
                          Jumlah
                        </th>

                        <th className="px-5 py-4 text-left">
                          Harga Satuan
                        </th>

                        <th className="px-5 py-4 text-left">
                          Biaya
                        </th>

                        <th className="px-5 py-4 text-right">
                          Aksi
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedRecipes.map(recipe => {
                        const item =
                          recipe.inventory_items?.[0]

                        const cost =
                          item
                            ? Number(recipe.quantity) *
                              Number(item.purchase_price)
                            : 0

                        return (
                          <tr
                            key={recipe.id}
                            className="border-b last:border-0"
                          >
                            <td className="px-5 py-4 font-semibold">
                              {item?.name || "-"}
                            </td>

                            <td className="px-5 py-4">
                              {recipe.quantity}{" "}
                              {item?.unit || ""}
                            </td>

                            <td className="px-5 py-4">
                              {formatRupiah(
                                item?.purchase_price || 0
                              )}
                            </td>

                            <td className="px-5 py-4 font-semibold">
                              {formatRupiah(cost)}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() =>
                                  deleteRecipe(recipe.id)
                                }
                                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>

                  </table>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
