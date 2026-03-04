<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { useThemeStore } from '@/stores/theme'

const navPosition = useCookie<'top' | 'left'>('moze_nav_position', {
  default: () => 'top',
})

const themeStore = useThemeStore()
themeStore.init()
</script>

<template>
  <div class="space-y-8 pb-10">
    <div class="flex items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:settings-2" :size="24" class="text-primary" />
          <h1 class="text-3xl font-bold tracking-tight text-foreground/90">设置</h1>
        </div>
        <p class="mt-2 text-base text-muted-foreground">偏好与模块管理</p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl">
        <CardHeader class="border-b border-border/40 pb-4">
          <CardTitle class="text-base font-medium">主题</CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <div class="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-1 w-fit">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              :class="themeStore.mode === 'system' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              @click="themeStore.setMode('system')"
            >
              <AppIcon name="lucide:monitor" :size="16" />
              跟随系统
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              :class="themeStore.mode === 'light' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              @click="themeStore.setMode('light')"
            >
              <AppIcon name="lucide:sun" :size="16" />
              亮色
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              :class="themeStore.mode === 'dark' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              @click="themeStore.setMode('dark')"
            >
              <AppIcon name="lucide:moon" :size="16" />
              暗色
            </button>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">
            当前：{{ themeStore.label }}
          </p>
        </CardContent>
      </Card>

      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl">
        <CardHeader class="border-b border-border/40 pb-4">
          <CardTitle class="text-base font-medium">导航栏位置</CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <div class="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-1 w-fit">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              :class="navPosition === 'top' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              @click="navPosition = 'top'"
            >
              <AppIcon name="lucide:layout-grid" :size="16" />
              顶部
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              :class="navPosition === 'left' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              @click="navPosition = 'left'"
            >
              <AppIcon name="lucide:layout-dashboard" :size="16" />
              左侧
            </button>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">
            顶部更紧凑；左侧更适合频繁切换模块。
          </p>
        </CardContent>
      </Card>

      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl">
        <CardHeader class="border-b border-border/40 pb-4">
          <CardTitle class="text-base font-medium">模块</CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <NuxtLink
            to="/settings/categories"
            class="group flex items-center justify-between rounded-2xl border border-border/50 bg-background/40 px-5 py-4 transition-colors hover:bg-background/70"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <AppIcon name="lucide:layers" :size="18" />
              </div>
              <div class="min-w-0">
                <div class="text-sm font-semibold">分类管理</div>
                <div class="mt-0.5 text-xs text-muted-foreground">收支分类的创建、编辑与维护</div>
              </div>
            </div>
            <AppIcon name="lucide:chevron-right" :size="18" class="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </NuxtLink>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
