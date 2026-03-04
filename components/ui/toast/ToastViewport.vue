<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toast'

const store = useToastStore()
const { items } = storeToRefs(store)

function iconFor(variant: string) {
  if (variant === 'success') return 'lucide:check-circle-2'
  if (variant === 'error') return 'lucide:alert-circle'
  return 'lucide:info'
}

function toneClass(variant: string) {
  if (variant === 'success') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (variant === 'error') return 'border-destructive/30 bg-destructive/10 text-destructive'
  return 'border-border/50 bg-card/80 text-foreground'
}
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3">
    <TransitionGroup name="toast" tag="div" class="flex flex-col gap-3">
      <div
        v-for="t in items"
        :key="t.id"
        class="pointer-events-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-xl"
        :class="toneClass(t.variant)"
      >
        <div class="flex items-start gap-3">
          <div class="mt-0.5">
            <AppIcon :name="iconFor(t.variant)" :size="18" />
          </div>
          <div class="min-w-0 flex-1">
            <div v-if="t.title" class="text-sm font-semibold leading-5">
              {{ t.title }}
            </div>
            <div v-if="t.description" class="mt-1 text-xs leading-5 opacity-90">
              {{ t.description }}
            </div>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            @click="store.remove(t.id)"
          >
            <AppIcon name="lucide:x" :size="16" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 160ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>

