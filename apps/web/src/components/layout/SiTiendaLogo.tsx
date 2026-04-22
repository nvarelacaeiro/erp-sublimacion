interface NordeLogoProps {
  className?: string
  collapsed?: boolean
}

export function SiTiendaLogo({ className = '', collapsed = false }: NordeLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
        <rect x="0" y="0" width="7" height="7" rx="1.5" className="fill-primary-600 dark:fill-primary-500" />
        <rect x="9" y="0" width="7" height="7" rx="1.5" className="fill-primary-600 dark:fill-primary-500" opacity="0.4" />
        <rect x="0" y="9" width="7" height="7" rx="1.5" className="fill-primary-600 dark:fill-primary-500" opacity="0.4" />
        <rect x="9" y="9" width="7" height="7" rx="1.5" className="fill-primary-600 dark:fill-primary-500" />
      </svg>
      {!collapsed && (
        <span
          className="font-bold tracking-tight select-none text-slate-900 dark:text-slate-100"
          style={{ fontSize: '1.1rem', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui" }}
          aria-label="Norde"
        >
          norde
        </span>
      )}
    </div>
  )
}
