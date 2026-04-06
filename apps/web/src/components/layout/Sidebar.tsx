'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Users, Truck, ShoppingCart,
  DollarSign, FileText, CreditCard, ChevronLeft, ChevronRight, LogOut, Tag, UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { SiTiendaLogo } from './SiTiendaLogo'
import { ThemeToggle } from './ThemeToggle'

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/products', icon: Package, label: 'Productos' },
  { href: '/categories', icon: Tag, label: 'Categorías' },
  { href: '/clients', icon: Users, label: 'Clientes' },
  { href: '/suppliers', icon: Truck, label: 'Proveedores' },
  { href: '/purchases', icon: ShoppingCart, label: 'Compras' },
  { href: '/sales', icon: DollarSign, label: 'Ventas' },
  { href: '/quotes', icon: FileText, label: 'Presupuestos' },
  { href: '/finance', icon: CreditCard, label: 'Finanzas' },
  { href: '/users', icon: UserRound, label: 'Usuarios' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-[#EAE4D8] dark:bg-slate-900 border-r border-[#d4cfc6] dark:border-slate-700 transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-[#d4cfc6] dark:border-slate-700 overflow-hidden',
        collapsed ? 'justify-center px-2' : 'px-5',
      )}>
        <SiTiendaLogo collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#F0EEE1] text-primary-700 dark:bg-primary-600/20 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-[#F0EEE1] hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#d4cfc6] dark:border-slate-700 p-2 space-y-0.5">
        {!collapsed && user && (
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400 truncate">
            <div className="font-medium text-gray-700 dark:text-slate-300 truncate">{user.name}</div>
            <div className="truncate">{user.email}</div>
          </div>
        )}
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'px-1')}>
          <ThemeToggle className="w-full" />
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-400 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  )
}
