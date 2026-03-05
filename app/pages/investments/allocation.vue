<script setup lang="ts">
import { useAccountsStore } from '@/stores/accounts'
import BaseChart from '@/components/ui/chart/BaseChart.vue'

const accountsStore = useAccountsStore()

const assetClasses = [
  { key: 'equities', label: '权益类 (Equities)', color: 'bg-red-500', hex: '#ef4444' },
  { key: 'fixed_income', label: '固收类 (Fixed Income)', color: 'bg-blue-500', hex: '#3b82f6' },
  { key: 'cash', label: '现金类 (Cash)', color: 'bg-emerald-500', hex: '#10b981' },
  { key: 'real_estate', label: '房地产 (Real Estate)', color: 'bg-amber-500', hex: '#f59e0b' },
  { key: 'alternatives', label: '另类投资 (Alternatives)', color: 'bg-purple-500', hex: '#a855f7' },
  { key: 'crypto', label: '加密货币 (Crypto)', color: 'bg-indigo-500', hex: '#6366f1' },
  { key: 'other', label: '其他 (Other)', color: 'bg-gray-500', hex: '#6b7280' },
] as const

type AssetClassKey = typeof assetClasses[number]['key']

const allocation = computed(() => {
  const map: Record<AssetClassKey, number> = {
    equities: 0,
    fixed_income: 0,
    cash: 0,
    real_estate: 0,
    alternatives: 0,
    crypto: 0,
    other: 0,
  }
  let total = 0

  accountsStore.accounts.forEach(acc => {
    if (acc.is_archived) return
    const bal = accountsStore.getBalance(acc.id)
    if (bal === 0) return
    
    let cls: AssetClassKey = 'other'
    if (acc.asset_class) {
      cls = acc.asset_class as AssetClassKey
    } else if (acc.type === 'stock') {
      cls = 'equities'
    } else if (acc.type === 'cash') {
      cls = 'cash'
    }
    map[cls] += bal
    total += bal
  })

  return assetClasses.map(c => ({
    ...c,
    value: map[c.key],
    percent: total === 0 ? 0 : (map[c.key] / total) * 100
  })).sort((a, b) => b.value - a.value)
})

const totalAssets = computed(() => allocation.value.reduce((sum, item) => sum + item.value, 0))

onMounted(() => {
  accountsStore.load()
})
</script>

<template>
  <div class="space-y-8 pb-10">
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground/90">
          资产配置
        </h2>
        <p class="mt-2 text-base text-muted-foreground">
          监控各类资产的分布比例与风险敞口
        </p>
      </div>
    </div>

    <div class="grid gap-8 lg:grid-cols-3">
      <!-- Chart Area -->
      <Card class="lg:col-span-1 border-border/50 bg-card/60 shadow-xl backdrop-blur-xl h-fit">
        <CardHeader>
          <CardTitle>分布概览</CardTitle>
        </CardHeader>
        <CardContent class="py-8">
          <div v-if="totalAssets > 0" class="flex flex-col items-center">
            <BaseChart
              type="donut"
              :data="allocation.filter(i => i.value > 0).map(i => ({ type: i.label, value: i.value }))"
              :colors="allocation.filter(i => i.value > 0).map(i => i.hex)"
              :height="200"
              :interactive-legend="false"
            />
            <div class="mt-4 text-center">
              <div class="text-xs text-muted-foreground">总资产</div>
              <div class="text-xl font-bold tabular-nums">¥{{ totalAssets.toLocaleString() }}</div>
            </div>
          </div>
          <div v-else class="flex h-48 items-center justify-center text-muted-foreground text-sm">
            暂无资产数据
          </div>
        </CardContent>
      </Card>

      <!-- Allocation Table -->
      <Card class="lg:col-span-2 border-border/50 bg-card/60 shadow-xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle>资产明细</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-6">
            <div v-for="item in allocation" :key="item.key" class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded-full" :class="item.color"></div>
                  <span class="font-medium">{{ item.label }}</span>
                </div>
                <div class="flex items-center gap-4">
                  <span class="tabular-nums text-muted-foreground">¥{{ item.value.toLocaleString() }}</span>
                  <span class="w-12 text-right font-bold tabular-nums">{{ item.percent.toFixed(1) }}%</span>
                </div>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                <div class="h-full transition-all duration-500" :class="item.color" :style="{ width: `${item.percent}%` }"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
