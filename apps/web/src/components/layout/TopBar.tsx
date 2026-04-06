'use client'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { SiTiendaLogo } from './SiTiendaLogo'
import { ThemeToggle } from './ThemeToggle'

const PAGE_TITLES: Record<string, { title: string; action?: { label: string; href: string } }> = {
  '/': { title: 'Dashboard' },
  '/products': { title: 'Productos' },
  '/clients': { title: 'Clientes' },
  '/suppliers': { title: 'Proveedores' },
  '/purchases': { title: 'Compras' },
  '/sales': { title: 'Ventas', action: { label: 'Nueva venta', href: '/sales/new' } },
  '/quotes': { title: 'Presupuestos', action: { label: 'Nuevo', href: '/quotes/new' } },
  '/finance': { title: 'Finanzas' },
  '/categories': { title: 'Categorías' },
  '/users': { title: 'Usuarios' },
}

export function TopBar() {
  const pathname = usePathname()

  const config = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => pathname === key || pathname.startsWith(key + '/'))

  const { title, action } = config?.[1] ?? { title: '' }

  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-30">
      <div className="flex items-center">
        <SiTiendaLogo className="md:hidden" />
        <h1 className="hidden md:block text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {/* Toggle solo visible en móvil (en desktop va en sidebar) */}
        <ThemeToggle className="md:hidden" />
        {action && (
          <Link href={action.href}>
            <Button size="sm">
              <Plus size={16} />
              {action.label}
            </Button>
          </Link>
        )}
      </div>
    </header>
  )
}
