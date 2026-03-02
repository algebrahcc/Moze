<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  size?: number | string
  class?: any
  ariaLabel?: string
}>()

const symbolId = computed(() => {
  const raw = (props.name || '').trim()
  const name = raw.includes(':') ? raw.split(':', 2)[1] : raw
  return `icon-${name}`
})

const symbolHref = computed(() => `#${symbolId.value}`)
</script>

<template>
  <svg
    :width="size ?? 18"
    :height="size ?? 18"
    viewBox="0 0 24 24"
    :aria-hidden="ariaLabel ? undefined : true"
    :aria-label="ariaLabel"
    :class="props.class"
    fill="currentColor"
  >
    <use :href="symbolHref" />
  </svg>
</template>
