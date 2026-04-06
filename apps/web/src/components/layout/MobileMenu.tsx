'use client'
import Link from 'next/link'
import { X, Users, Truck, ShoppingCart, CreditCard, LogOut, Tag, UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth.store'

const EXTRA_ITEMS = [
  { href: '/clients', icon: Users, label: 'Clientes' },
  { href: '/suppliers', icon: Truck, label: 'Proveedores' },
  { href: '/purchases', icon: ShoppingCart, label: 'Compras' },
  { href: '/categories', icon: Tag, label: 'Categorías' },
  { href: '/finance', icon: CreditCard, label: 'Finanzas' },
  { href: '/users', icon: UserRound, label: 'Usuarios' },
]

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout } = useAuth()
  const { user } = useAuthStore()

  if (!open) return null

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl pb-safe">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <div className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{user?.name}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400">{user?.email}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400">
            <X size={20} />
          </button>
        </div>
        <nav className="py-3">
          {EXTRA_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-4 px-5 py-3.5 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <Icon size={20} className="text-gray-500 dark:text-slate-400" />
              <span className="font-medium">{label}</span>
            </Link>
          ))}
          <div className="border-t border-gray-100 dark:border-slate-700 mt-2 pt-2">
            <button
              onClick={() => { onClose(); logout() }}
              className="w-full flex items-center gap-4 px-5 py-3.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut size={20} />
              <span className="font-medium">Cerrar sesión</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
