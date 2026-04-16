interface NordeLogoProps {
  className?: string
  collapsed?: boolean
}

export function SiTiendaLogo({ className = '', collapsed = false }: NordeLogoProps) {
  if (collapsed) return null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Arrow icon — north-east direction */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M5 19L19 5M19 5H9M19 5V15"
          className="stroke-primary-700 dark:stroke-primary-400"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* Wordmark */}
      <span
        className="text-primary-700 dark:text-primary-400 font-bold tracking-tight select-none"
        style={{ fontSize: '1.2rem', fontFamily: "'Inter', system-ui" }}
        aria-label="Norde"
      >
        norde
      </span>
    </div>
  )
}
