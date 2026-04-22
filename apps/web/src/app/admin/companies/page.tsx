'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/adminApi'
import { Building2, Plus, CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'

const PLAN_LABEL: Record<string, string> = { TRIAL: 'Trial', STARTER: 'Starter', PRO: 'Pro' }
const PLAN_COLOR: Record<string, string> = {
  TRIAL:   'bg-amber-400/10 text-amber-400',
  STARTER: 'bg-blue-400/10 text-blue-400',
  PRO:     'bg-emerald-400/10 text-emerald-400',
}

function trialDaysLeft(date: string | null): number | null {
  if (!date) return null
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function CompaniesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.getCompanies()
      .then(res => setCompanies(res.data))
      .catch(err => {
        if (err.message === 'UNAUTHORIZED') router.replace('/admin/login')
        else setError('Error al cargar empresas.')
      })
      .finally(() => setLoading(false))
  }, [router])

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Empresas</h1>
          <p className="text-sm text-slate-500 mt-0.5">{companies.length} empresa{companies.length !== 1 ? 's' : ''} registrada{companies.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/admin/companies/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={14} />
          Nueva empresa
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-900 rounded-xl border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Building2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay empresas todavía.</p>
          <Link href="/admin/companies/new" className="text-sm text-blue-400 hover:underline mt-1 inline-block">
            Crear la primera
          </Link>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
          {companies.map((c: any) => {
            const daysLeft = trialDaysLeft(c.trialEndsAt)
            return (
              <Link
                key={c.id}
                href={`/admin/companies/${c.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/50 transition-colors"
              >
                {/* Estado */}
                <div className="shrink-0">
                  {c.active
                    ? <CheckCircle size={15} className="text-emerald-400" />
                    : <XCircle size={15} className="text-slate-600" />}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-100 truncate">{c.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${PLAN_COLOR[c.plan]}`}>
                      {PLAN_LABEL[c.plan]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                    {c.plan === 'TRIAL' && daysLeft !== null && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {daysLeft > 0 ? `${daysLeft}d trial` : 'Trial vencido'}
                      </span>
                    )}
                    <span>{c._count.users} usuarios</span>
                    <span>{c._count.products} productos</span>
                    <span>{c._count.sales} ventas</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
