'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Users, Truck, ShoppingCart,
  DollarSign, FileText, CreditCard, ChevronLeft, ChevronRight,
  LogOut, Tag, UserRound, ClipboardList, PackageCheck, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { SiTiendaLogo } from './SiTiendaLogo'
import { ThemeToggle } from './ThemeToggle'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Ventas',
    items: [
      { href: '/quotes', icon: FileText, label: 'Presupuestos' },
      { href: '/sales', icon: DollarSign, label: 'Ventas' },
      { href: '/delivery-notes', icon: PackageCheck, label: 'Remitos' },
    ],
  },
  {
    label: 'Compras',
    items: [
      { href: '/requisitions', icon: ClipboardList, label: 'Solicitudes' },
      { href: '/purchases', icon: ShoppingCart, label: 'Compras' },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { href: '/products', icon: Package, label: 'Productos' },
      { href: '/categories', icon: Tag, label: 'Categorías' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/finance', icon: CreditCard, label: 'Finanzas' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/clients', icon: Users, label: 'Clientes' },
      { href: '/suppliers', icon: Truck, label: 'Proveedores' },
      { href: '/users', icon: UserRound, label: 'Usuarios' },
    ],
  },
]

function NavGroupSection({
  group,
  pathname,
  collapsed,
}: {
  group: NavGroup
  pathname: string
  collapsed: boolean
}) {
  const hasActive = group.items.some(i => pathname.startsWith(i.href))
  const [open, setOpen] = useState(hasActive)

  return (
    <div>
      {/* Group header */}
      {!collapsed && (
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400 transition-colors"
        >
          {group.label}
          <ChevronDown
            size={12}
            className={cn('transition-transform duration-200', open ? 'rotate-0' : '-rotate-90')}
          />
        </button>
      )}

      {/* Items */}
      {(open || collapsed) && (
        <div className={cn('space-y-0.5', !collapsed && 'pl-1')}>
          {group.items.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#F0EEE1] text-primary-700 dark:bg-primary-600/20 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-[#F0EEE1] hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                  collapsed && 'justify-center',
                )}
              >
                <Icon size={17} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-[#EAE4D8] dark:bg-slate-900 border-r border-[#d4cfc6] dark:border-slate-700 transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-56',
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
      <nav className="flex-1 py-3 px-2 space-y-3 overflow-y-auto">
        {/* Dashboard standalone */}
        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === '/'
              ? 'bg-[#F0EEE1] text-primary-700 dark:bg-primary-600/20 dark:text-primary-400'
              : 'text-gray-700 hover:bg-[#F0EEE1] hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
            collapsed && 'justify-center',
          )}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <LayoutDashboard size={17} className="shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </Link>

        {/* Divider */}
        <div className="border-t border-[#d4cfc6] dark:border-slate-700" />

        {/* Groups */}
        <div className="space-y-3">
          {NAV_GROUPS.map(group => (
            <NavGroupSection
              key={group.label}
              group={group}
              pathname={pathname}
              collapsed={collapsed}
            />
          ))}
        </div>
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
          <LogOut size={17} className="shrink-0" />
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
