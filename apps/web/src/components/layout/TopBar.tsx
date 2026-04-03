'use client'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

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

  // Buscar match exacto o padre
  const config = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => pathname === key || pathname.startsWith(key + '/'))

  const { title, action } = config?.[1] ?? { title: '' }

  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-200 sticky top-0 z-30">
      <h1 className="text-base md:text-lg font-semibold text-gray-900">{title}</h1>
      {action && (
        <Link href={action.href}>
          <Button size="sm">
            <Plus size={16} />
            {action.label}
          </Button>
        </Link>
      )}
    </header>
  )
}
