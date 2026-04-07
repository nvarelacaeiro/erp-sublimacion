'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

export type ImportEntity = 'products' | 'clients' | 'suppliers' | 'categories'

const TEMPLATES: Record<ImportEntity, { headers: string[]; example: Record<string, any> }> = {
  products: {
    headers: ['name', 'sku', 'description', 'cost', 'price', 'stock', 'minStock', 'unit', 'category'],
    example: { name: 'Remera blanca', sku: 'REM-001', description: 'Remera 100% algodón', cost: 500, price: 1200, stock: 10, minStock: 3, unit: 'un', category: 'Remeras' },
  },
  clients: {
    headers: ['name', 'businessName', 'email', 'phone', 'taxId', 'address', 'notes'],
    example: { name: 'Juan Pérez', businessName: 'Juan Pérez SA', email: 'juan@email.com', phone: '11-1234-5678', taxId: '20-12345678-9', address: 'Av. Siempre Viva 742', notes: '' },
  },
  suppliers: {
    headers: ['name', 'email', 'phone', 'taxId', 'address', 'notes'],
    example: { name: 'Proveedor ABC', email: 'ventas@abc.com', phone: '11-9876-5432', taxId: '30-98765432-1', address: 'Calle Falsa 123', notes: '' },
  },
  categories: {
    headers: ['name'],
    example: { name: 'Remeras' },
  },
}

const ENTITY_LABELS: Record<ImportEntity, string> = {
  products: 'Productos',
  clients: 'Clientes',
  suppliers: 'Proveedores',
  categories: 'Categorías',
}

interface ImportResult {
  created: number
  errors: { row: number; message: string }[]
}

interface ImportModalProps {
  open: boolean
  onClose: () => void
  entity: ImportEntity
  onSuccess?: () => void
}

export function ImportModal({ open, onClose, entity, onSuccess }: ImportModalProps) {
  const [rows, setRows] = useState<any[]>([])
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [parseError, setParseError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const template = TEMPLATES[entity]
  const label = ENTITY_LABELS[entity]

  function reset() {
    setRows([])
    setFileName('')
    setResult(null)
    setParseError('')
    setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([template.example], { header: template.headers })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, label)
    XLSX.writeFile(wb, `plantilla_${entity}.xlsx`)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setParseError('')
    setResult(null)
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const parsed: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
        if (parsed.length === 0) {
          setParseError('El archivo no contiene filas de datos.')
          return
        }
        setRows(parsed)
      } catch {
        setParseError('No se pudo leer el archivo. Asegurate de que sea .xlsx o .csv válido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    if (rows.length === 0) return
    setLoading(true)
    try {
      const res = await api.post<ImportResult>(`/api/${entity}/bulk-import`, { rows })
      setResult(res)
      if (res.created > 0) onSuccess?.()
    } catch (err: any) {
      setParseError(err.message ?? 'Error al importar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Importar ${label}`}>
      <div className="p-5 space-y-4">
        {/* Step 1: Download template */}
        <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 dark:border-slate-700 px-4 py-3 bg-gray-50 dark:bg-slate-800/50">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">1. Descargá la plantilla</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Columnas: {template.headers.join(', ')}</p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            <Download size={14} />
            Descargar
          </button>
        </div>

        {/* Step 2: Upload file */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">2. Subí tu archivo (.xlsx o .csv)</p>
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-xl cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors bg-white dark:bg-slate-800">
            <Upload size={20} className="text-gray-400 dark:text-slate-500 mb-1" />
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {fileName || 'Hacé clic para seleccionar'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv,.xls"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        </div>

        {parseError && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && !result && (
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5">
              {rows.length} fila{rows.length !== 1 ? 's' : ''} detectada{rows.length !== 1 ? 's' : ''} — vista previa:
            </p>
            <div className="overflow-auto max-h-36 rounded-lg border border-gray-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800">
                    {template.headers.map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap border-b border-gray-200 dark:border-slate-700">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-slate-700 last:border-0">
                      {template.headers.map(h => (
                        <td key={h} className="px-2 py-1.5 text-gray-700 dark:text-slate-300 max-w-[120px] truncate">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">…y {rows.length - 5} más</p>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{result.created} registro{result.created !== 1 ? 's' : ''} importado{result.created !== 1 ? 's' : ''} correctamente.</span>
            </div>
            {result.errors.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400 space-y-0.5 max-h-28 overflow-y-auto">
                <p className="font-semibold mb-1">{result.errors.length} fila{result.errors.length !== 1 ? 's' : ''} con error:</p>
                {result.errors.map((e, i) => (
                  <p key={i}>Fila {e.row}: {e.message}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button
              type="button"
              onClick={handleImport}
              loading={loading}
              disabled={rows.length === 0}
              className="flex-1"
            >
              <Upload size={15} />
              Importar {rows.length > 0 ? `(${rows.length})` : ''}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
