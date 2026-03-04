import { defineStore } from 'pinia'

export type ToastVariant = 'default' | 'success' | 'error'

export type ToastItem = {
  id: string
  title?: string
  description?: string
  variant: ToastVariant
  createdAt: number
}

type ToastInput = {
  title?: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([])

  function remove(id: string) {
    items.value = items.value.filter((t) => t.id !== id)
  }

  function push(input: ToastInput) {
    const id = uid()
    const item: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? 'default',
      createdAt: Date.now(),
    }
    items.value = [item, ...items.value].slice(0, 5)

    const duration = input.durationMs ?? 3000
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
    return id
  }

  function clear() {
    items.value = []
  }

  return { items, push, remove, clear }
})

