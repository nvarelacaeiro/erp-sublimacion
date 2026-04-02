'use client'
import { useRouter } from 'next/navigation'
import { useCreateQuote } from '@/hooks/useQuotes'
import { QuoteForm } from '@/components/quotes/QuoteForm'

export default function NewQuotePage() {
  const router = useRouter()
  const createQuote = useCreateQuote()

  async function handleSave(data: any) {
    await createQuote.mutateAsync(data)
    router.push('/quotes')
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <QuoteForm
        onSave={handleSave}
        onCancel={() => router.push('/quotes')}
        loading={createQuote.isPending}
      />
    </div>
  )
}
