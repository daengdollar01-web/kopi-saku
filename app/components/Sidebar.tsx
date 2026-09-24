'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Role = 'master' | 'owner' | 'manager' | 'kasir'

export default function Sidebar() {
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Gagal mengambil role:', error)
        }

        if (data?.role) {
          setRole(data.role as Role)
        }
      } catch (error) {
        console.error('Sidebar error:', error)
      } finally {
        setLoading(false)
      }
    }

    getRole()
  }, [])

  const canManageAccounts = role === 'master'
  const canManageOperations =
    role === 'master' ||
    role === 'manager' ||
    role === 'owner'

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-slate-950 text-white">

      <div className="border-b border-slate-800 px-6 py-5">
        <div className="text-xl font-bold">
          KOPI SAKU
        </div>

        <div className="text-xs text-slate-400">
          Coffee Management System
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">

        {/* DASHBOARD */}
        <a
          href="/dashboard"
          className="mb-1 block rounded-lg px-4 py-3 text-sm font-medium hover:bg-slate-800"
        >
          🏠 Dashboard
        </a>

        {/* KASIR */}
        <div className="mt-5 px-4 text-xs font-semibold uppercase text-slate-500">
          Kasir
        </div>

        <a
          href="/transactions"
          className="mt-1 block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          🛒 Transaksi
        </a>

        <a
          href="/transactions/history"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          📋 Riwayat Transaksi
        </a>

        <a
          href="/bill-gantung"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          🧾 Bill Gantung
        </a>

        {/* PRODUK */}
        <div className="mt-5 px-4 text-xs font-semibold uppercase text-slate-500">
          Produk
        </div>

        <a
          href="/products"
          className="mt-1 block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          ☕ Menu
        </a>

        <a
          href="/categories"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          🏷️ Kategori
        </a>

        {/* PROMO */}
        {(role === 'master' ||
          role === 'owner' ||
          role === 'manager') && (
          <>
            <a
              href="/promos"
              className="mt-1 block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
            >
              🎁 Promo
            </a>
          </>
        )}

        {/* INVENTORY */}
        {canManageOperations && (
          <>
            <div className="mt-5 px-4 text-xs font-semibold uppercase text-slate-500">
              Inventory
            </div>

            <a
              href="/inventory"
              className="mt-1 block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
            >
              📦 Bahan & Stok
            </a>

            <a
              href="/inventory/in"
              className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
            >
              📥 Stok Masuk
            </a>

            <a
              href="/inventory/out"
              className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
            >
              📤 Stok Keluar
            </a>

            <a
              href="/inventory/suppliers"
              className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
            >
              🚚 Supplier
            </a>

            <a
              href="/inventory/recipes"
              className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
            >
              🧪 Resep / HPP
            </a>
          </>
        )}

        {/* KEUANGAN */}
        <div className="mt-5 px-4 text-xs font-semibold uppercase text-slate-500">
          Keuangan
        </div>

        <a
          href="/finance"
          className="mt-1 block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          💰 Keuangan
        </a>

        <a
          href="/finance/income"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          📈 Pemasukan
        </a>

        <a
          href="/finance/expenses"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          📉 Pengeluaran
        </a>

        <a
          href="/finance/cash"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          💵 Kas
        </a>

        {/* LAPORAN */}
        <div className="mt-5 px-4 text-xs font-semibold uppercase text-slate-500">
          Laporan
        </div>

        <a
          href="/reports"
          className="mt-1 block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          📊 Laporan
        </a>

        <a
          href="/reports/daily"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          📅 Harian
        </a>

        <a
          href="/reports/weekly"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          📆 Mingguan
        </a>

        <a
          href="/reports/monthly"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          🗓️ Bulanan
        </a>

        <a
          href="/reports/sales"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          💹 Penjualan
        </a>

        <a
          href="/reports/top-products"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          🔥 Produk Terlaris
        </a>

        <a
          href="/reports/stock"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          📦 Stok
        </a>

        <a
          href="/reports/hpp"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          🧮 HPP
        </a>

        <a
          href="/reports/profit"
          className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
        >
          💰 Laba
        </a>

        {/* SISTEM */}
        {canManageAccounts && (
          <>
            <div className="mt-5 px-4 text-xs font-semibold uppercase text-slate-500">
              Sistem
            </div>

            <a
              href="/accounts"
              className="mt-1 block rounded-lg px-4 py-3 text-sm hover:bg-slate-800"
            >
              👥 Manajemen Akun
            </a>
          </>
        )}

      </nav>

      {/* USER */}
      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 text-xs text-slate-400">
          Login sebagai
        </div>

        <div className="rounded-lg bg-slate-900 px-4 py-3">
          <div className="font-semibold capitalize">
            {loading
              ? 'Memuat...'
              : role || 'User'}
          </div>
        </div>
      </div>

    </aside>
  )
}
