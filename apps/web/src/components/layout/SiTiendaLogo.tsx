interface SiTiendaLogoProps {
  className?: string
  collapsed?: boolean
}

export function SiTiendaLogo({ className = '', collapsed = false }: SiTiendaLogoProps) {
  if (collapsed) return null

  return (
    <span
      style={{
        fontFamily: "'Barlow', 'Inter', system-ui, sans-serif",
        fontWeight: 700,
        letterSpacing: '0.01em',
        fontSize: '1.25rem',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
      className={`text-gray-900 dark:text-slate-100 ${className}`}
      aria-label="sí tienda"
    >
      sí tienda
    </span>
  )
}
