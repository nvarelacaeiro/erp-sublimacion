'use client'
import { useRouter } from 'next/navigation'
import { useCreateSale } from '@/hooks/useSales'
import { SaleForm } from '@/components/sales/SaleForm'

export default function NewSalePage() {
  const router = useRouter()
  const createSale = useCreateSale()

  async function handleSave(data: any) {
    await createSale.mutateAsync(data)
    router.push('/sales')
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <SaleForm
        onSave={handleSave}
        onCancel={() => router.push('/sales')}
        loading={createSale.isPending}
      />
    </div>
  )
}
