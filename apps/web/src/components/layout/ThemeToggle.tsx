'use client'
import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/store/theme.store'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
        'dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200',
        className,
      )}
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
