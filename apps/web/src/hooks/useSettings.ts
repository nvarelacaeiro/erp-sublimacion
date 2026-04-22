'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CompanySettings {
  projectLabel?: string
}

export function useSettings() {
  return useQuery<CompanySettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/api/settings'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CompanySettings>) => api.put('/api/settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}
