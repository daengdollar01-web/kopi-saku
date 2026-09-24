"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Category = {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [userRole, setUserRole] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const loadCategories = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      console.error(error)
      alert("Gagal mengambil kategori.")
    } else {
      setCategories((data || []) as Category[])
    }

    setLoading(false)
  }

  const loadRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (data) {
      setUserRole(data.role)
    }
  }

  useEffect(() => {
    loadCategories()
    loadRole()
  }, [])

  const canManage =
    userRole === "master" ||
    userRole === "manager"

  const resetForm = () => {
    setName("")
    setDescription("")
    setEditing(null)
    setShowForm(false)
  }

  const openAdd = () => {
    setEditing(null)
    setName("")
    setDescription("")
    setShowForm(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    setName(category.name)
    setDescription(category.description || "")
    setShowForm(true)
  }

  const saveCategory = async () => {
    if (!name.trim()) {
      alert("Nama kategori wajib diisi.")
      return
    }

    setSaving(true)

    if (editing) {
      const { error } = await supabase
        .from("categories")
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq("id", editing.id)

      if (error) {
        console.error(error)
        alert("Gagal mengubah kategori: " + error.message)
      } else {
        alert("Kategori berhasil diubah.")
        resetForm()
        await loadCategories()
      }
    } else {
      const { error } = await supabase
        .from("categories")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          is_active: true,
        })

      if (error) {
        console.error(error)
        alert("Gagal menambahkan kategori: " + error.message)
      } else {
        alert("Kategori berhasil ditambahkan.")
        resetForm()
        await loadCategories()
      }
    }

    setSaving(false)
  }

  const toggleCategory = async (category: Category) => {
    const action = category.is_active
      ? "menonaktifkan"
      : "mengaktifkan"

    if (
      !confirm(
        `Yakin ingin ${action} kategori "${category.name}"?`
      )
    ) {
      return
    }

    const { error } = await supabase
      .from("categories")
      .update({
        is_active: !category.is_active,
      })
      .eq("id", category.id)

    if (error) {
      console.error(error)
      alert("Gagal mengubah status kategori.")
      return
    }

    await loadCategories()
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">

        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Kategori
            </h1>
            <p className="mt-1 text-gray-500">
              Kelola kategori menu KOPI SAKU.
            </p>
          </div>

          {canManage && (
            <button
              onClick={openAdd}
              className="rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
            >
              + Tambah Kategori
            </button>
          )}
        </div>

        <div className="rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Memuat kategori...
            </div>
          ) : categories.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              Belum ada kategori.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      Nama Kategori
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      Deskripsi
                    </th>
                    <th className="px-5 py-4 text-center text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-4 text-center text-sm font-semibold">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-t border-gray-100"
                    >
                      <td className="px-5 py-4 font-semibold">
                        {category.name}
                      </td>

                      <td className="px-5 py-4 text-gray-500">
                        {category.description || "-"}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            category.is_active
                              ? "bg-gray-100 text-gray-800"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {category.is_active
                            ? "Aktif"
                            : "Nonaktif"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {canManage ? (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() =>
                                openEdit(category)
                              }
                              className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                toggleCategory(category)
                              }
                              className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              {category.is_active
                                ? "Nonaktifkan"
                                : "Aktifkan"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            View Only
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6">

              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editing
                    ? "Edit Kategori"
                    : "Tambah Kategori"}
                </h2>

                <button
                  onClick={resetForm}
                  className="text-2xl text-gray-400"
                >
                  ×
                </button>
              </div>

              <label className="mb-2 block text-sm font-medium">
                Nama Kategori
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Contoh: Coffee"
                className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-500"
              />

              <label className="mb-2 block text-sm font-medium">
                Deskripsi
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Deskripsi kategori..."
                rows={3}
                className="mb-6 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-500"
              />

              <div className="flex gap-3">
                <button
                  onClick={resetForm}
                  className="flex-1 rounded-xl border border-gray-200 py-3 font-medium"
                >
                  Batal
                </button>

                <button
                  onClick={saveCategory}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-black py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : "Simpan"}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  )
}
