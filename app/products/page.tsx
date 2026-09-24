'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Category = {
  id: number
  name: string
}

type Product = {
  id: number
  category_id: number | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  categories?: { name: string }[] | null
}

type Role = 'master' | 'owner' | 'manager' | 'kasir'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [role, setRole] = useState<Role | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)

  async function loadData() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/'
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role) {
      setRole(profile.role as Role)
    }

    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .order('name')

    if (categoryError) {
      console.error('Category error:', categoryError)
    }

    setCategories(categoryData || [])

    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        category_id,
        name,
        description,
        price,
        image_url,
        is_available,
        created_at,
        categories (
          name
        )
      `)
      .order('name')

    if (productError) {
      console.error('Product error:', productError)
    }

    setProducts(productData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const canEdit = role === 'master' || role === 'manager'

  function resetForm() {
    setName('')
    setDescription('')
    setPrice('')
    setCategoryId('')
    setImageUrl('')
    setIsAvailable(true)
    setEditingId(null)
  }

  function openAddForm() {
    resetForm()
    setShowForm(true)
  }

  function openEditForm(product: Product) {
    setEditingId(product.id)
    setName(product.name)
    setDescription(product.description || '')
    setPrice(String(product.price))
    setCategoryId(product.category_id ? String(product.category_id) : '')
    setImageUrl(product.image_url || '')
    setIsAvailable(product.is_available)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      alert('Nama menu wajib diisi')
      return
    }

    if (!price || Number(price) < 0) {
      alert('Harga tidak valid')
      return
    }

    if (!categoryId) {
      alert('Kategori wajib dipilih')
      return
    }

    setSaving(true)

    const productData = {
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      category_id: Number(categoryId),
      image_url: imageUrl.trim() || null,
      is_available: isAvailable,
    }

    let error

    if (editingId) {
      const result = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingId)

      error = result.error
    } else {
      const result = await supabase
        .from('products')
        .insert(productData)

      error = result.error
    }

    if (error) {
      console.error(error)
      alert(`Gagal menyimpan menu: ${error.message}`)
    } else {
      setShowForm(false)
      resetForm()
      await loadData()
    }

    setSaving(false)
  }

  async function toggleAvailability(product: Product) {
    const action = product.is_available
      ? 'menonaktifkan'
      : 'mengaktifkan'

    if (!confirm(`Yakin ingin ${action} "${product.name}"?`)) {
      return
    }

    const { error } = await supabase
      .from('products')
      .update({
        is_available: !product.is_available,
      })
      .eq('id', product.id)

    if (error) {
      alert(`Gagal mengubah status: ${error.message}`)
      return
    }

    await loadData()
  }

  const filteredProducts = products.filter((product) => {
    const keyword = search.toLowerCase()

    const matchesSearch =
      product.name.toLowerCase().includes(keyword) ||
      (product.description || '').toLowerCase().includes(keyword)

    const matchesCategory =
      categoryFilter === 'all' ||
      String(product.category_id) === categoryFilter

    return matchesSearch && matchesCategory
  })

  function formatRupiah(value: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Menu Produk
            </h1>
            <p className="mt-1 text-slate-500">
              Kelola menu KOPI SAKU
            </p>
          </div>

          {canEdit && (
            <button
              onClick={openAddForm}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              + Tambah Menu
            </button>
          )}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">

          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Cari nama menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
          >
            <option value="all">Semua Kategori</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

        </div>

        {showForm && canEdit && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Edit Menu' : 'Tambah Menu'}
              </h2>

              <button
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="text-xl text-slate-500 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nama Menu *
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kopi Susu Aren"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Kategori *
                </label>

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  required
                >
                  <option value="">Pilih Kategori</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Harga *
                </label>

                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="15000"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  URL Gambar
                </label>

                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Opsional"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Deskripsi
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi menu..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">
                    Menu tersedia
                  </span>
                </label>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? 'Menyimpan...'
                    : editingId
                      ? 'Simpan Perubahan'
                      : 'Tambah Menu'}
                </button>
              </div>

            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-bold text-slate-900">
              Daftar Menu
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredProducts.length} menu
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Memuat menu...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mb-2 text-4xl">☕</div>
              <p className="font-semibold">
                Belum ada menu
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-slate-50">
                  <tr className="text-left text-sm text-slate-500">
                    <th className="px-6 py-4">Menu</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4">Harga</th>
                    <th className="px-6 py-4">Status</th>

                    {canEdit && (
                      <th className="px-6 py-4 text-right">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>

                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-t border-slate-100"
                    >

                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {product.name}
                        </div>

                        {product.description && (
                          <div className="mt-1 text-sm text-slate-500">
                            {product.description}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {product.categories?.[0]?.name || '-'}
                      </td>

                      <td className="px-6 py-4 font-semibold">
                        {formatRupiah(Number(product.price))}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            product.is_available
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {product.is_available
                            ? 'Tersedia'
                            : 'Nonaktif'}
                        </span>
                      </td>

                      {canEdit && (
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">

                            <button
                              onClick={() => openEditForm(product)}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                toggleAvailability(product)
                              }
                              className={`rounded-lg px-3 py-2 text-sm ${
                                product.is_available
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-green-50 text-green-600'
                              }`}
                            >
                              {product.is_available
                                ? 'Nonaktifkan'
                                : 'Aktifkan'}
                            </button>

                          </div>
                        </td>
                      )}

                    </tr>
                  ))}

                </tbody>

              </table>
            </div>
          )}

        </div>

      </div>
    </main>
  )
}

