interface SiTiendaLogoProps {
  collapsed?: boolean
  className?: string
}

export function SiTiendaLogo({ collapsed = false, className = '' }: SiTiendaLogoProps) {
  const fontStyle: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    fontWeight: 400,
    letterSpacing: '0.04em',
    lineHeight: 1,
  }

  if (collapsed) {
    return (
      <span
        style={{ ...fontStyle, fontSize: '1.5rem', color: '#111827' }}
        className={className}
        aria-label="sí tienda"
      >
        s
      </span>
    )
  }

  return (
    <span
      style={{ ...fontStyle, fontSize: '1.35rem', color: '#111827', whiteSpace: 'nowrap' }}
      className={className}
      aria-label="sí tienda"
    >
      sí tienda
    </span>
  )
}
