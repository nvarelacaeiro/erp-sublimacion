import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'

interface PriceResult {
  baseCost: number
  extraCost: number
  totalCost: number
  margin: number
  unitPrice: number
  ruleApplied: { minQty: number; maxQty: number | null; margin: number } | null
}

export function useProductPrice(
  productId: string | null,
  quantity: number,
  selectedItems: { itemId: string; qty: number }[] = [],
) {
  const [result, setResult] = useState<PriceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedKey = JSON.stringify(selectedItems)

  useEffect(() => {
    if (!productId || quantity <= 0) {
      setResult(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.post<PriceResult>(
          `/api/products/${productId}/calculate-price`,
          { quantity, selectedItems },
        )
        setResult(data)
      } catch {
        setResult(null)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [productId, quantity, selectedKey])

  return { result, loading }
}
