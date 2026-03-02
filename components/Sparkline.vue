<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  points: number[]
  height?: number
  strokeWidth?: number
}>()

const h = computed(() => props.height ?? 56)
const w = 240
const sw = computed(() => props.strokeWidth ?? 2)

const normalized = computed(() => {
  const pts = (props.points ?? []).filter((n) => Number.isFinite(n))
  if (pts.length < 2) return null
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min || 1
  const width = 240
  const dx = width / (pts.length - 1)
  
  // Create path data "M x y L x y ..."
  const d = pts.map((v, i) => {
    const x = i * dx
    const y = h.value - ((v - min) / range) * (h.value - 4) - 2 // Padding 2px
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')

  return { points: d }
})
</script>

<template>
  <svg
    v-if="normalized"
    viewBox="0 0 240 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="overflow-visible"
  >
    <defs>
      <linearGradient id="spark-stroke" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="currentColor" stop-opacity="0.2" />
        <stop offset="0.5" stop-color="currentColor" stop-opacity="1" />
        <stop offset="1" stop-color="currentColor" stop-opacity="0.2" />
      </linearGradient>
    </defs>
    <polyline
      :points="normalized.points"
      stroke="url(#spark-stroke)"
      :stroke-width="sw"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
