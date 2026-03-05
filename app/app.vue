<script setup lang="ts">
import iconSprite from '~/app/assets/iconfont/sprite.svg?raw'
import { useThemeStore } from '@/stores/theme'
import { useRecurringStore } from '@/stores/recurring'

const themeStore = useThemeStore()
const recurringStore = useRecurringStore()

onMounted(() => {
  themeStore.init()
  // Check for due recurring transactions on app launch
  setTimeout(() => {
    recurringStore.processDueRules()
  }, 3000) // Delay slightly to avoid blocking initial render
})
</script>

<template>
  <div>
    <!-- Inject SVG sprite globally for all layouts -->
    <div v-html="iconSprite" class="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
