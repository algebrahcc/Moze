<script setup lang="ts">
import iconSprite from '~/app/assets/iconfont/sprite.svg?raw'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
themeStore.init()
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
