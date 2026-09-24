'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Profile = {
  id: string
  full_name: string
  role: 'master' | 'owner' | 'manager' | 'kasir'
  is_active: boolean
  created_at: string
}

export default function AccountsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'owner' | 'manager' | 'kasir'>('kasir')

  async function loadProfiles() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/'
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setMessage('Gagal mengambil data akun')
    } else {
      setProfiles(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()

    setSaving(true)
    setMessage('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setMessage('Sesi login sudah berakhir')
        return
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || 'Gagal membuat akun')
        return
      }

      setMessage(result.message || 'Akun berhasil dibuat')

      setFullName('')
      setEmail('')
      setPassword('')
      setRole('kasir')
      setShowForm(false)

      await loadProfiles()
    } catch (error) {
      console.error(error)
      setMessage('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  function roleLabel(role: string) {
    if (role === 'master') return 'Master'
    if (role === 'owner') return 'Owner'
    if (role === 'manager') return 'Manager'
    return 'Kasir'
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Manajemen Akun
            </h1>
            <p className="mt-1 text-slate-500">
              Kelola akun Owner, Manager, dan Kasir
            </p>
          </div>

          <button
            onClick={() => {
              setMessage('')
              setShowForm(!showForm)
            }}
            className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white shadow hover:bg-slate-800"
          >
            {showForm ? 'Tutup' : '+ Tambah Akun'}
          </button>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-slate-900">
              Tambah Akun Baru
            </h2>

            <form onSubmit={handleCreateAccount} className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Contoh: Andi Saputra"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="contoh@email.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as 'owner' | 'manager' | 'kasir')
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="kasir">Kasir</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? 'Membuat Akun...' : 'Buat Akun'}
                </button>
              </div>

            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-bold text-slate-900">
              Daftar Akun
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-slate-500">
              Memuat data akun...
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-6 text-slate-500">
              Belum ada akun.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-sm text-slate-500">
                    <th className="px-6 py-4">Nama</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Dibuat</th>
                  </tr>
                </thead>

                <tbody>
                  {profiles.map((profile) => (
                    <tr
                      key={profile.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {profile.full_name}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {roleLabel(profile.role)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            profile.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {profile.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(profile.created_at).toLocaleDateString(
                          'id-ID'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={() => (window.location.href = '/dashboard')}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Kembali ke Dashboard
          </button>
        </div>

      </div>
    </main>
  )
}
