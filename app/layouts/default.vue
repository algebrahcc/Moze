<script setup lang="ts">
import AppIcon from '../../components/AppIcon.vue'
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

    <header class="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div class="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <NuxtLink to="/dashboard" class="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <AppIcon name="lucide:layout-dashboard" :size="18" class="text-primary" />
          </div>
          <span class="text-sm font-semibold tracking-tight">Moze / 默资记账</span>
        </NuxtLink>
        
        <nav class="hidden md:flex items-center gap-1">
          <NuxtLink 
            v-for="item in [
              { name: '总览', to: '/dashboard', icon: 'lucide:layout-grid' },
              { name: '资产', to: '/accounts', icon: 'lucide:wallet-cards' },
              { name: '收支', to: '/transactions', icon: 'lucide:arrow-right-left' },
              { name: '净值', to: '/investments/snapshots', icon: 'lucide:trending-up' },
              { name: '分类', to: '/categories', icon: 'lucide:tags' }
            ]" 
            :key="item.to"
            :to="item.to" 
            class="group inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary/50 hover:text-foreground active:scale-95 data-[active=true]:bg-secondary data-[active=true]:text-foreground"
            active-class="bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
          >
            <AppIcon :name="item.icon" :size="14" class="opacity-70 group-hover:opacity-100 transition-opacity" />
            {{ item.name }}
          </NuxtLink>
        </nav>

        <div class="ml-auto flex items-center gap-3">
          <span v-if="user?.email" class="hidden text-xs font-medium text-muted-foreground md:inline-block">
            {{ user.email }}
          </span>
          <Button 
            v-if="user" 
            variant="ghost" 
            size="sm"
            class="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
            @click="signOut"
          >
            <AppIcon name="lucide:log-out" :size="16" />
            <span class="sr-only">退出</span>
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
