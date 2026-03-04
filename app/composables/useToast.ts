import type { ToastVariant } from '@/stores/toast'
import { useToastStore } from '@/stores/toast'

export function useToast() {
  const store = useToastStore()
  return (input: { title?: string; description?: string; variant?: ToastVariant; durationMs?: number }) => store.push(input)
}

