'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ExportButtonProps {
  filename: string
  sheetName?: string
  getData: () => Record<string, any>[]
  label?: string
  variant?: 'primary' | 'secondary'
}

export function ExportButton({
  filename,
  sheetName = 'Datos',
  getData,
  label = 'Exportar',
  variant = 'secondary',
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const rows = getData()
      if (rows.length === 0) {
        alert('No hay datos para exportar.')
        return
      }
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} onClick={handleExport} loading={loading} type="button">
      <Download size={15} />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}
