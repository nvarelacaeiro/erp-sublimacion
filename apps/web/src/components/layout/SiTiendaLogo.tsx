interface NordeLogoProps {
  className?: string
  collapsed?: boolean
}

export function SiTiendaLogo({ className = '', collapsed = false }: NordeLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="14" height="18" viewBox="0 0 14 18" fill="none" aria-hidden="true" className="shrink-0">
        <path
          d="M 7 0.5 L 13.5 9 L 7 17.5 L 0.5 9 Z"
          className="fill-primary-600 dark:fill-primary-500"
        />
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
