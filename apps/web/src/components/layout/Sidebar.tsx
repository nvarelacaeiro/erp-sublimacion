'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Users, Truck, ShoppingCart,
  DollarSign, FileText, CreditCard, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/products', icon: Package, label: 'Productos' },
  { href: '/clients', icon: Users, label: 'Clientes' },
  { href: '/suppliers', icon: Truck, label: 'Proveedores' },
  { href: '/purchases', icon: ShoppingCart, label: 'Compras' },
  { href: '/sales', icon: DollarSign, label: 'Ventas' },
  { href: '/quotes', icon: FileText, label: 'Presupuestos' },
  { href: '/finance', icon: CreditCard, label: 'Finanzas' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">E</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-gray-900 truncate text-sm">ERP Sublimación</span>
          )}
        </div>
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
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-2 space-y-0.5">
        {!collapsed && user && (
          <div className="px-3 py-2 text-xs text-gray-500 truncate">
            <div className="font-medium text-gray-700 truncate">{user.name}</div>
            <div className="truncate">{user.email}</div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  )
}
