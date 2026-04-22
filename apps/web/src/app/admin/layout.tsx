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
    if (pathname === '/admin/login') { setReady(true); return }
    if (!hasAdminKey()) router.replace('/admin/login')
    else setReady(true)
  }, [pathname, router])

  if (!ready) return null
  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <svg width="12" height="16" viewBox="0 0 14 18" fill="none" aria-hidden="true">
            <path d="M 7 0.5 L 13.5 9 L 7 17.5 L 0.5 9 Z" fill="#4f46e5"/>
          </svg>
          <span className="text-sm font-semibold text-slate-300">norde</span>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">admin</span>

          {/* Nav inline en header */}
          <nav className="hidden sm:flex items-center gap-1 ml-4">
            <Link
              href="/admin/companies"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <Building2 size={13} />
              Empresas
            </Link>
          </nav>
        </div>

        <button
          onClick={() => { clearAdminKey(); router.push('/admin/login') }}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      {/* Nav mobile */}
      <nav className="sm:hidden flex border-b border-slate-800 bg-slate-900 px-4">
        <Link
          href="/admin/companies"
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-slate-400 hover:text-slate-100 transition-colors border-b-2 border-transparent"
        >
          <Building2 size={13} />
          Empresas
        </Link>
      </nav>

      {/* Main — sin sidebar, full width */}
      <main className="p-4 md:p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  )
}
