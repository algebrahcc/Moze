<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { ToastViewport } from '@/components/ui/toast'
import { useThemeStore } from '@/stores/theme'
import { useToast } from '@/app/composables/useToast'
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const toast = useToast()

const themeStore = useThemeStore()
themeStore.init()

const navPosition = useCookie<'top' | 'left'>('moze_nav_position', {
  default: () => 'top',
})

const navItems = [
  { name: '总览', to: '/dashboard', icon: 'lucide:layout-grid' },
  { name: '资产', to: '/accounts', icon: 'lucide:wallet-cards' },
  {
    name: '收支',
    to: '/transactions',
    icon: 'lucide:arrow-right-left',
    children: [{ name: '周期记账', to: '/transactions/recurring', icon: 'lucide:repeat' }],
  },
  {
    name: '报表',
    to: '/reports',
    icon: 'lucide:line-chart',
    children: [
      { name: '资产负债表', to: '/reports/balance-sheet', icon: 'lucide:wallet' },
      { name: '现金流量表', to: '/reports/cashflow', icon: 'lucide:repeat' },
      { name: '月度概览', to: '/reports/monthly', icon: 'lucide:line-chart' },
      { name: '年度报表', to: '/reports/annual', icon: 'lucide:book-open' },
    ],
  },
  {
    name: '财富',
    to: '/investments',
    icon: 'lucide:trending-up',
    children: [
      { name: 'FIRE 仪表盘', to: '/investments', icon: 'lucide:target' },
      { name: '资产配置', to: '/investments/allocation', icon: 'lucide:layers' },
      { name: '净值记录', to: '/investments/snapshots', icon: 'lucide:history' },
    ],
  },
] as const

function toggleNavPosition() {
  navPosition.value = navPosition.value === 'top' ? 'left' : 'top'
}

const route = useRoute()
const router = useRouter()

function isInSection(basePath: string) {
  return route.path === basePath || route.path.startsWith(`${basePath}/`)
}

const activeNavItem = computed(() => {
  return navItems.find((i) => isInSection(i.to))
})

const activeChildren = computed(() => (activeNavItem.value as any)?.children as { name: string; to: string; icon?: string }[] | undefined)

function quickAdd() {
  router.push({ path: '/transactions', query: { create: '1' } })
}

async function signOut() {
  await supabase.auth.signOut()
}

const userMenuOpen = ref(false)

function closeUserMenu() {
  userMenuOpen.value = false
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  if (target.closest?.('[data-user-menu]')) return
  userMenuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})

function themeIcon() {
  if (themeStore.mode === 'system') return 'lucide:monitor'
  return themeStore.resolved === 'dark' ? 'lucide:moon' : 'lucide:sun'
}

const themeToastReady = ref(false)
onMounted(() => {
  themeToastReady.value = true
})

watch(
  () => themeStore.mode,
  () => {
    if (!themeToastReady.value) return
    toast({ title: '主题已切换', description: themeStore.label, variant: 'default', durationMs: 1600 })
  }
)

const onlineToastReady = ref(false)
const isOnline = ref(true)
onMounted(() => {
  isOnline.value = navigator.onLine
  onlineToastReady.value = true
  const onOnline = () => {
    isOnline.value = true
    if (onlineToastReady.value) toast({ title: '网络已恢复', description: '同步已恢复', variant: 'success', durationMs: 1600 })
  }
  const onOffline = () => {
    isOnline.value = false
    if (onlineToastReady.value) toast({ title: '网络已断开', description: '数据可能无法同步', variant: 'error', durationMs: 2200 })
  }
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  onScopeDispose(() => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  })
})
</script>

<template>
  <div class="relative min-h-screen bg-background text-foreground">
    <div class="pointer-events-none absolute inset-0 -z-40 bg-[linear-gradient(120deg,_hsl(var(--background))_0%,_hsl(var(--secondary))_45%,_hsl(var(--background))_100%)]" />
    <div class="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),_transparent_55%)]" />
    <div class="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_right,_hsl(var(--foreground)/0.04)_1px,_transparent_1px),_linear-gradient(to_bottom,_hsl(var(--foreground)/0.04)_1px,_transparent_1px)] bg-[size:100px_100px] opacity-30" />
    <div class="pointer-events-none absolute inset-0 -z-10 bg-noise opacity-[0.08] mix-blend-soft-light" />

    <header class="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div class="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <NuxtLink to="/dashboard" class="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
            <AppIcon name="lucide:wallet" :size="18" />
          </div>
          <span class="text-base font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Moze</span>
        </NuxtLink>
        
        <nav v-if="navPosition === 'top'" class="hidden md:flex items-center gap-1 ml-2">
          <NuxtLink 
            v-for="item in navItems" 
            :key="item.to"
            :to="item.to" 
            class="group relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50"
            active-class="!text-primary bg-primary/10 shadow-sm"
          >
            <AppIcon :name="item.icon" :size="16" class="transition-transform group-hover:scale-110 group-active:scale-95" />
            {{ item.name }}
          </NuxtLink>
        </nav>

        <div class="ml-auto flex items-center gap-4">
          <div v-if="user?.email" class="hidden md:flex flex-col items-end">
            <span class="text-xs font-medium text-foreground">
              {{ user.email.split('@')[0] }}
            </span>
            <span class="text-[10px] text-muted-foreground uppercase tracking-wider">
              Pro Plan
            </span>
          </div>
          <div class="h-8 w-px bg-border/50 hidden md:block" />
          <Button
            variant="ghost"
            size="icon"
            class="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            title="切换主题"
            @click="themeStore.cycleMode()"
          >
            <AppIcon :name="themeIcon()" :size="18" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            title="快速记账"
            @click="quickAdd"
          >
            <AppIcon name="lucide:plus" :size="18" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            title="切换导航位置"
            @click="toggleNavPosition"
          >
            <AppIcon :name="navPosition === 'top' ? 'lucide:layout-dashboard' : 'lucide:layout-grid'" :size="18" />
          </Button>
          <div v-if="user" class="relative" data-user-menu>
            <Button
              variant="ghost"
              class="h-9 rounded-xl px-2.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              @click="userMenuOpen = !userMenuOpen"
            >
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-xs">
                {{ user?.email?.[0]?.toUpperCase?.() || 'U' }}
              </span>
              <AppIcon name="lucide:chevron-down" :size="16" class="ml-2" />
            </Button>

            <div
              v-if="userMenuOpen"
              class="absolute right-0 mt-2 w-60 rounded-2xl border border-border/50 bg-card/90 p-2 shadow-2xl backdrop-blur-xl"
            >
              <div class="px-3 py-2">
                <div class="text-xs text-muted-foreground">已登录</div>
                <div class="mt-0.5 text-sm font-semibold text-foreground truncate">{{ user?.email }}</div>
              </div>
              <div class="my-2 h-px bg-border/50" />
              <NuxtLink
                to="/settings/profile"
                class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                @click="closeUserMenu"
              >
                <AppIcon name="lucide:user-circle" :size="16" />
                个人信息
              </NuxtLink>
              <NuxtLink
                to="/settings"
                class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                @click="closeUserMenu"
              >
                <AppIcon name="lucide:settings-2" :size="16" />
                设置
              </NuxtLink>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                @click="closeUserMenu(); signOut()"
              >
                <AppIcon name="lucide:log-out" :size="16" />
                退出
              </button>
            </div>
          </div>
          <NuxtLink v-else to="/login">
            <Button
              variant="outline"
              class="h-9 rounded-xl border-border/50 bg-background/40 text-foreground/80 hover:bg-muted/40"
            >
              登录
            </Button>
          </NuxtLink>
        </div>
      </div>

      <div v-if="navPosition === 'top' && activeChildren?.length" class="hidden md:block border-t border-border/40 bg-background/40">
        <div class="mx-auto flex max-w-7xl items-center gap-1 px-4 py-2 sm:px-6 lg:px-8">
          <span class="mr-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {{ activeNavItem?.name }}
          </span>
          <NuxtLink
            v-for="c in activeChildren"
            :key="c.to"
            :to="c.to"
            class="group inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
            exact-active-class="!text-primary bg-primary/10 shadow-sm"
          >
            <AppIcon v-if="c.icon" :name="c.icon" :size="14" class="transition-transform group-hover:scale-110 group-active:scale-95" />
            {{ c.name }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <div v-if="navPosition === 'left'" class="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <aside class="hidden md:flex w-56 shrink-0">
        <div class="sticky top-24 w-full space-y-2">
          <div class="rounded-2xl border border-border/50 bg-card/50 p-2 backdrop-blur-xl">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50"
              active-class="!text-primary bg-primary/10 shadow-sm"
            >
              <AppIcon :name="item.icon" :size="16" class="transition-transform group-hover:scale-110 group-active:scale-95" />
              {{ item.name }}
            </NuxtLink>
          </div>
          <div v-if="activeChildren?.length" class="rounded-2xl border border-border/50 bg-card/50 p-2 backdrop-blur-xl">
            <div class="px-3 pb-2 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {{ activeNavItem?.name }} · 子导航
            </div>
            <NuxtLink
              v-for="c in activeChildren"
              :key="c.to"
              :to="c.to"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50"
              exact-active-class="!text-primary bg-primary/10 shadow-sm"
            >
              <AppIcon v-if="c.icon" :name="c.icon" :size="16" class="transition-transform group-hover:scale-110 group-active:scale-95" />
              {{ c.name }}
            </NuxtLink>
          </div>
          <div class="rounded-2xl border border-border/50 bg-card/50 p-2 backdrop-blur-xl">
            <NuxtLink
              to="/settings/categories"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50"
              active-class="!text-primary bg-primary/10 shadow-sm"
            >
              <AppIcon name="lucide:layers" :size="16" class="transition-transform group-hover:scale-110 group-active:scale-95" />
              分类管理
            </NuxtLink>
            <NuxtLink
              to="/settings"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50"
              active-class="!text-primary bg-primary/10 shadow-sm"
            >
              <AppIcon name="lucide:settings-2" :size="16" class="transition-transform group-hover:scale-110 group-active:scale-95" />
              设置
            </NuxtLink>
          </div>
        </div>
      </aside>

      <main class="min-w-0 flex-1 pb-6">
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <slot />
        </div>
      </main>
    </div>

    <main v-else class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <slot />
      </div>
    </main>

    <ToastViewport />
  </div>
</template>
