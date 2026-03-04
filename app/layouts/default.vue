<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
const user = useSupabaseUser()
const supabase = useSupabaseClient()


async function signOut() {
  await supabase.auth.signOut()
}
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
        
        <nav class="hidden md:flex items-center gap-1 ml-2">
          <NuxtLink 
            v-for="item in [
              { name: '总览', to: '/dashboard', icon: 'lucide:layout-grid' },
              { name: '资产', to: '/accounts', icon: 'lucide:wallet-cards' },
              { name: '收支', to: '/transactions', icon: 'lucide:arrow-right-left' },
              { name: '报表', to: '/reports', icon: 'lucide:line-chart' },
              { name: '净值', to: '/investments/snapshots', icon: 'lucide:trending-up' },
              { name: '分类', to: '/categories', icon: 'lucide:layers' }
            ]" 
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
            v-if="user" 
            variant="ghost" 
            size="icon"
            class="h-9 w-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            @click="signOut"
            title="退出登录"
          >
            <AppIcon name="lucide:log-out" :size="18" />
          </Button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <slot />
      </div>
    </main>
  </div>
</template>
