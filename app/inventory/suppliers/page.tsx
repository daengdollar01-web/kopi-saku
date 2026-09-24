"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Supplier = {
  id: number
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  is_active: boolean
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")

  async function loadSuppliers() {
    setLoading(true)

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name")

    if (error) {
      alert(error.message)
    } else {
      setSuppliers(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  function openAdd() {
    setEditing(null)
    setName("")
    setPhone("")
    setAddress("")
    setNotes("")
    setShowModal(true)
  }

  function openEdit(item: Supplier) {
    setEditing(item)
    setName(item.name)
    setPhone(item.phone || "")
    setAddress(item.address || "")
    setNotes(item.notes || "")
    setShowModal(true)
  }

  async function saveSupplier() {
    if (!name.trim()) {
      alert("Nama supplier wajib diisi.")
      return
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    }

    if (editing) {
      const { error } = await supabase
        .from("suppliers")
        .update(payload)
        .eq("id", editing.id)

      if (error) {
        alert(error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from("suppliers")
        .insert({
          ...payload,
          is_active: true,
        })

      if (error) {
        alert(error.message)
        return
      }
    }

    setShowModal(false)
    loadSuppliers()
  }

  async function toggleStatus(item: Supplier) {
    const { error } = await supabase
      .from("suppliers")
      .update({
        is_active: !item.is_active,
      })
      .eq("id", item.id)

    if (error) {
      alert(error.message)
      return
    }

    loadSuppliers()
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Supplier
            </h1>
            <p className="text-sm text-slate-500">
              Kelola data pemasok bahan baku KOPI SAKU
            </p>
          </div>

          <button
            onClick={openAdd}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            + Tambah Supplier
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Supplier</p>
            <p className="mt-2 text-3xl font-bold">
              {suppliers.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Supplier Aktif</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {suppliers.filter(x => x.is_active).length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Nonaktif</p>
            <p className="mt-2 text-3xl font-bold text-slate-500">
              {suppliers.filter(x => !x.is_active).length}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left">Nama</th>
                  <th className="px-5 py-4 text-left">Telepon</th>
                  <th className="px-5 py-4 text-left">Alamat</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center">
                      Memuat data...
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Belum ada supplier.
                    </td>
                  </tr>
                ) : (
                  suppliers.map(item => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-5 py-4 font-semibold">
                        {item.name}
                      </td>

                      <td className="px-5 py-4">
                        {item.phone || "-"}
                      </td>

                      <td className="px-5 py-4">
                        {item.address || "-"}
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
                {editing ? "Edit Supplier" : "Tambah Supplier"}
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
                placeholder="Nama supplier"
                className="w-full rounded-xl border px-4 py-3"
              />

              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Nomor telepon"
                className="w-full rounded-xl border px-4 py-3"
              />

              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Alamat"
                rows={3}
                className="w-full rounded-xl border px-4 py-3"
              />

              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Catatan"
                rows={3}
                className="w-full rounded-xl border px-4 py-3"
              />

              <button
                onClick={saveSupplier}
                className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white"
              >
                Simpan Supplier
              </button>

            </div>
          </div>
        </div>
      )}
    </main>
  )
}
