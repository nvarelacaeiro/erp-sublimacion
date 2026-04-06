interface SiTiendaLogoProps {
  className?: string
  collapsed?: boolean
}

export function SiTiendaLogo({ className = '', collapsed = false }: SiTiendaLogoProps) {
  if (collapsed) return null

  return (
    <span
      style={{
        fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
        fontWeight: 400,
        letterSpacing: '0.04em',
        fontSize: '1.35rem',
        color: '#111827',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
      className={className}
      aria-label="sí tienda"
    >
      sí tienda
    </span>
  )
}
