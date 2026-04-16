'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  X, Users, Truck, ShoppingCart, CreditCard, LogOut, Tag, UserRound,
  ClipboardList, PackageCheck, DollarSign, FileText, Package, LayoutDashboard,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

const GROUPS = [
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

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout } = useAuth()
  const { user } = useAuthStore()
  const pathname = usePathname()

  if (!open) return null

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl pb-safe max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <div>
            <div className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{user?.name}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400">{user?.email}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable nav */}
        <nav className="overflow-y-auto flex-1 py-2">
          {/* Dashboard */}
          <Link
            href="/"
            onClick={onClose}
            className={cn(
              'flex items-center gap-4 px-5 py-3 mb-1',
              pathname === '/'
                ? 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700',
            )}
          >
            <LayoutDashboard size={19} className="text-gray-500 dark:text-slate-400 shrink-0" />
            <span className="font-medium">Dashboard</span>
          </Link>

          {/* Groups */}
          {GROUPS.map((group, gi) => (
            <div key={group.label}>
              <div className={cn('px-5 pt-3 pb-1', gi > 0 && 'border-t border-gray-100 dark:border-slate-700 mt-1')}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                  {group.label}
                </span>
              </div>
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-4 px-5 py-3',
                      active
                        ? 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700',
                    )}
                  >
                    <Icon size={19} className={cn('shrink-0', active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-slate-400')} />
                    <span className="font-medium">{label}</span>
                  </Link>
                )
              })}
            </div>
          ))}

          {/* Cerrar sesión */}
          <div className="border-t border-gray-100 dark:border-slate-700 mt-2 pt-2">
            <button
              onClick={() => { onClose(); logout() }}
              className="w-full flex items-center gap-4 px-5 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut size={19} />
              <span className="font-medium">Cerrar sesión</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
