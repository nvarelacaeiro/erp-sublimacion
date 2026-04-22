'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { hasAdminKey, clearAdminKey } from '@/lib/adminApi'
import { LogOut, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (pathname === '/admin/login') {
      setReady(true)
      return
    }
    if (!hasAdminKey()) {
      router.replace('/admin/login')
    } else {
      setReady(true)
    }
  }, [pathname, router])

  if (!ready) return null

  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {/* Logo Norde pequeño */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 19L19 5M19 5H9M19 5V15" stroke="#5a95c8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-semibold text-slate-300">norde</span>
          <span className="text-slate-600 mx-1">/</span>
          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">admin</span>
        </div>
        <button
          onClick={() => { clearAdminKey(); router.push('/admin/login') }}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <LogOut size={13} />
          Salir
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-52 min-h-[calc(100vh-3.5rem)] bg-slate-900 border-r border-slate-800 p-3">
          <nav className="space-y-0.5">
            <Link
              href="/admin/companies"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <Building2 size={15} />
              Empresas
            </Link>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
