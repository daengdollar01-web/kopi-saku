'use client'

import Sidebar from './Sidebar'

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <main className="min-h-screen pl-64">
        {children}
      </main>
    </div>
  )
}
