'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, DollarSign, FileText, Package, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { MobileMenu } from './MobileMenu'

const BOTTOM_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/sales', icon: DollarSign, label: 'Ventas' },
  { href: '/quotes', icon: FileText, label: 'Presupuestos' },
  { href: '/products', icon: Package, label: 'Productos' },
]

export function BottomNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#EAE4D8] dark:bg-slate-900 border-t border-[#d4cfc6] dark:border-slate-700 pb-safe">
        <div className="grid grid-cols-5 h-16">
          {BOTTOM_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 transition-colors',
                  active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-slate-500',
                )}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-gray-500 dark:text-slate-500"
          >
            <Menu size={22} />
            <span className="text-[10px] font-medium">Más</span>
          </button>
        </div>
      </nav>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
