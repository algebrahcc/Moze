<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

const user = useSupabaseUser()
</script>

<template>
  <div class="space-y-8 pb-10">
    <div class="flex items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:user-circle" :size="24" class="text-primary" />
          <h1 class="text-3xl font-bold tracking-tight text-foreground/90">个人信息</h1>
        </div>
        <p class="mt-2 text-base text-muted-foreground">账号与基础资料</p>
      </div>
    </div>

    <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl">
      <CardHeader class="border-b border-border/40 pb-4">
        <CardTitle class="text-base font-medium">账号</CardTitle>
      </CardHeader>
      <CardContent class="pt-6">
        <div v-if="!user" class="text-sm text-muted-foreground">
          请先登录。
        </div>
        <div v-else class="space-y-4">
          <div class="grid gap-2">
            <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">邮箱</div>
            <div class="text-sm font-semibold text-foreground">
              {{ user.email }}
            </div>
          </div>
          <div class="grid gap-2">
            <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">用户 ID</div>
            <div class="text-sm font-mono text-foreground/80 break-all">
              {{ user.id }}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

