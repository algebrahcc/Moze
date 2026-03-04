<script setup lang="ts">
import { computed } from 'vue'
type LegendPosition = 'top' | 'bottom' | 'left' | 'right'

type LegendItem = {
  label: string
  color: string
}

const emit = defineEmits<{
  (e: 'toggle', label: string): void
}>()

const props = withDefaults(defineProps<{
  items: LegendItem[]
  position?: LegendPosition
  interactive?: boolean
  inactiveLabels?: string[]
}>(), {
  position: 'bottom',
  interactive: false,
  inactiveLabels: () => [],
})

const layoutClass = computed(() => {
  if (props.position === 'left' || props.position === 'right') {
    return 'flex flex-col items-start gap-2'
  }
  return 'flex flex-wrap items-center justify-center gap-2 w-full'
})

const inactiveSet = computed(() => new Set(props.inactiveLabels ?? []))
</script>

<template>
  <div
    class="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-xs text-foreground shadow-[0_10px_30px_-20px_rgba(15,23,42,0.5)]"
    :class="layoutClass"
  >
    <component
      :is="interactive ? 'button' : 'div'"
      v-for="item in items"
      :key="item.label"
      :type="interactive ? 'button' : undefined"
      class="inline-flex items-center gap-2"
      :class="[
        interactive ? 'cursor-pointer transition-opacity hover:opacity-90 active:opacity-80' : '',
        inactiveSet.has(item.label) ? 'opacity-40' : ''
      ]"
      @click="interactive ? emit('toggle', item.label) : undefined"
    >
      <span class="h-2.5 w-2.5 rounded-full border border-border/60" :style="{ backgroundColor: item.color }" />
      <span class="font-medium">{{ item.label }}</span>
    </component>
  </div>
</template>
