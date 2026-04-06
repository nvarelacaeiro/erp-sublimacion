'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Tag, Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/shared/EmptyState'

interface Category {
  id: string
  name: string
  _count: { products: number }
}

export default function CategoriesPage() {
  const qc = useQueryClient()
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/categories'),
  })

  const create = useMutation({
    mutationFn: (name: string) => api.post('/api/categories', { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setNewName(''); setError('') },
    onError: (e: any) => setError(e.message),
  })

  const update = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.put(`/api/categories/${id}`, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditId(null); setError('') },
    onError: (e: any) => setError(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (e: any) => setError(e.message),
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    create.mutate(newName.trim())
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    update.mutate({ id, name: editName.trim() })
  }

  function startEdit(c: Category) {
    setEditId(c.id)
    setEditName(c.name)
    setError('')
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Formulario de nueva categoría */}
      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nueva categoría..."
          className="flex-1 px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
        <Button type="submit" loading={create.isPending} disabled={!newName.trim()}>
          <Plus size={16} /> Agregar
        </Button>
      </form>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Sin categorías"
          description="Creá tu primera categoría para organizar los productos."
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
              <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                <Tag size={15} className="text-primary-600" />
              </div>

              {editId === cat.id ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleUpdate(cat.id); if (e.key === 'Escape') setEditId(null) }}
                  autoFocus
                  className="flex-1 px-2 py-1 text-sm border border-primary-300 dark:border-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 dark:text-slate-100"
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{cat.name}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {cat._count.products} {cat._count.products === 1 ? 'producto' : 'productos'}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                {editId === cat.id ? (
                  <>
                    <button
                      onClick={() => handleUpdate(cat.id)}
                      disabled={update.isPending}
                      className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
                    >
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={async () => {
                        if (cat._count.products > 0) {
                          if (!confirm(`Esta categoría tiene ${cat._count.products} productos asociados. ¿Eliminar igual?`)) return
                        }
                        remove.mutate(cat.id)
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
