'use client'
import { useState } from 'react'
import {
  useAccountsReceivable, useAccountsPayable,
  usePayReceivable, usePayPayable, useCreateTransaction, useTransactions,
} from '@/hooks/useFinance'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CreditCard, TrendingUp, TrendingDown, CheckCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

type Tab = 'receivable' | 'payable' | 'transactions'

function PayModal({
  open, onClose, account, type, onPay,
}: {
  open: boolean
  onClose: () => void
  account: any
  type: 'receivable' | 'payable'
  onPay: (amount: number, notes: string) => Promise<void>
}) {
  const [amount, setAmount] = useState(account?.pending ?? 0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onPay(amount, notes)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!account) return null

  return (
    <Modal open={open} onClose={onClose} title={type === 'receivable' ? 'Registrar cobro' : 'Registrar pago'} size="sm">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm">
          <div className="font-medium text-gray-900 dark:text-slate-100">
            {type === 'receivable' ? account.clientName : account.supplierName}
          </div>
          <div className="text-gray-500 dark:text-slate-400 mt-0.5">
            Pendiente: <strong>{formatCurrency(account.pending)}</strong>
          </div>
        </div>
        <Input
          label="Monto a cobrar/pagar ($)"
          type="number"
          min="0.01"
          step="0.01"
          max={account.pending}
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
        />
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Notas</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white dark:bg-slate-800 dark:text-slate-100"
            placeholder="Método de pago, referencia..."
          />
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" loading={loading} className="flex-1">Confirmar</Button>
        </div>
      </form>
    </Modal>
  )
}

function TransactionModal({
  open, onClose, onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [type, setType] = useState('INCOME')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({ type, category, amount, description })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva transacción manual" size="sm">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Select
          label="Tipo"
          options={[
            { value: 'INCOME', label: 'Ingreso' },
            { value: 'EXPENSE', label: 'Egreso' },
          ]}
          value={type}
          onChange={e => setType(e.target.value)}
        />
        <Input
          label="Categoría"
          placeholder="Ej: Alquiler, Servicio, Otros..."
          value={category}
          onChange={e => setCategory(e.target.value)}
          required
        />
        <Input
          label="Monto ($)"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
        />
        <Input
          label="Descripción"
          placeholder="Detalle..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
        />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" loading={loading} className="flex-1">Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('receivable')
  const [payAccount, setPayAccount] = useState<any>(null)
  const [showTxModal, setShowTxModal] = useState(false)

  const { data: receivable = [] } = useAccountsReceivable()
  const { data: payable = [] } = useAccountsPayable()
  const { data: transactions = [] } = useTransactions()

  const payReceivable = usePayReceivable()
  const payPayable = usePayPayable()
  const createTransaction = useCreateTransaction()

  const totalReceivable = receivable.reduce((s: number, a: any) => s + a.pending, 0)
  const totalPayable = payable.reduce((s: number, a: any) => s + a.pending, 0)

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'receivable', label: 'A cobrar', count: receivable.length },
    { key: 'payable', label: 'A pagar', count: payable.length },
    { key: 'transactions', label: 'Movimientos' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2 text-green-600">
            <TrendingUp size={16} />
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Por cobrar</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(totalReceivable)}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2 text-red-500">
            <TrendingDown size={16} />
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Por pagar</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(totalPayable)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-xl mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                tab === t.key ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-slate-300'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cuentas a cobrar */}
      {tab === 'receivable' && (
        <div className="space-y-2">
          {receivable.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">Sin cuentas a cobrar</div>
          ) : (
            receivable.map((account: any) => (
              <div key={account.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{account.clientName}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Venta #{account.saleNumber}
                      {account.dueDate && ` · Vence ${formatDate(account.dueDate)}`}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      Total: {formatCurrency(account.amount)} ·
                      Pagado: {formatCurrency(account.amountPaid)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-amber-600">
                      {formatCurrency(account.pending)}
                    </div>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setPayAccount({ ...account, type: 'receivable' })}
                    >
                      <CheckCircle size={13} /> Cobrar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Cuentas a pagar */}
      {tab === 'payable' && (
        <div className="space-y-2">
          {payable.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">Sin cuentas a pagar</div>
          ) : (
            payable.map((account: any) => (
              <div key={account.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{account.supplierName}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Compra #{account.purchaseNumber}
                      {account.dueDate && ` · Vence ${formatDate(account.dueDate)}`}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      Total: {formatCurrency(account.amount)} ·
                      Pagado: {formatCurrency(account.amountPaid)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-red-500">
                      {formatCurrency(account.pending)}
                    </div>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setPayAccount({ ...account, type: 'payable' })}
                    >
                      <CheckCircle size={13} /> Pagar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Transacciones */}
      {tab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowTxModal(true)}>
              <Plus size={14} /> Manual
            </Button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">Sin movimientos</div>
            ) : (
              transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    tx.type === 'INCOME' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {tx.type === 'INCOME'
                      ? <TrendingUp size={14} className="text-green-600" />
                      : <TrendingDown size={14} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{tx.description}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{tx.category} · {formatDate(tx.date)}</div>
                  </div>
                  <div className={`text-sm font-bold shrink-0 ${
                    tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal pago */}
      {payAccount && (
        <PayModal
          open={!!payAccount}
          onClose={() => setPayAccount(null)}
          account={payAccount}
          type={payAccount.type}
          onPay={async (amount, notes) => {
            if (payAccount.type === 'receivable') {
              await payReceivable.mutateAsync({ id: payAccount.id, amount, notes })
            } else {
              await payPayable.mutateAsync({ id: payAccount.id, amount, notes })
            }
          }}
        />
      )}

      {/* Modal transacción manual */}
      <TransactionModal
        open={showTxModal}
        onClose={() => setShowTxModal(false)}
        onSave={async (data) => {
          await createTransaction.mutateAsync(data)
        }}
      />
    </div>
  )
}
