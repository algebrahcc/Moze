<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('rounded-2xl border border-border/70 bg-card/90 backdrop-blur', props.class)">
    <slot />
  </div>
</template>
