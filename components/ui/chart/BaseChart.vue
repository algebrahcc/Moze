<script setup lang="ts">
import { computed } from 'vue'
import { Plot } from '@/components/ui/plot'

type PlotType = 'line' | 'stacked' | 'grouped' | 'donut' | 'area'

const props = withDefaults(defineProps<{
  type: PlotType
  data: Array<Record<string, any>>
  height?: number
  colors?: readonly string[] | string[]
  legendItems?: { label: string; color: string }[]
  interactiveLegend?: boolean
}>(), {
  height: 240,
  interactiveLegend: true,
})

const hidden = ref<string[]>([])

function toggle(label: string) {
  if (!props.interactiveLegend) return
  if (hidden.value.includes(label)) {
    hidden.value = hidden.value.filter((l) => l !== label)
  } else {
    hidden.value = [...hidden.value, label]
  }
}

const filteredData = computed(() => {
  if (!props.interactiveLegend || !hidden.value.length) return props.data
  const set = new Set(hidden.value)
  if (props.type === 'donut') {
    return props.data.filter((d) => !set.has(String((d as any).type)))
  }
  return props.data.filter((d) => !set.has(String((d as any).series)))
})
</script>

<template>
  <Plot
    :type="type"
    :data="filteredData"
    :height="height"
    :colors="colors"
    :legend-items="legendItems"
    :legend-interactive="interactiveLegend"
    :legend-inactive-labels="hidden"
    @toggle-legend="toggle"
  />
</template>

