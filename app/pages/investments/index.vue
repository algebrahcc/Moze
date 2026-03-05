<script setup lang="ts">
import { useAccountsStore } from '@/stores/accounts'
import { useReports } from '@/app/composables/useReports'
import BaseChart from '@/components/ui/chart/BaseChart.vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const accountsStore = useAccountsStore()
const { monthlyTrendData, reloadForYear } = useReports()

const fireSettings = ref({
  fire_number: 0,
  withdrawal_rate: 4.0,
  expected_return: 7.0,
  current_age: 30,
  retire_age: 40,
})
const loadingSettings = ref(true)

// Load settings
async function loadSettings() {
  loadingSettings.value = true
  const { data, error } = await supabase
    .from('fire_settings')
    .select('*')
    .single()

  if (data) {
    fireSettings.value = {
      fire_number: Number(data.fire_number) || 0,
      withdrawal_rate: Number(data.withdrawal_rate) || 4.0,
      expected_return: Number(data.expected_return) || 7.0,
      current_age: data.current_age || 30,
      retire_age: data.retire_age || 40,
    }
  } else if (!error) {
    // If no settings exist, create default
    const { error: insertError } = await supabase
      .from('fire_settings')
      .insert({ user_id: user.value?.id })
      .select()
      .single()
    
    if (!insertError) {
      // Default values are already set in ref
    }
  }
  loadingSettings.value = false
}

// Compute metrics
const totalNetWorth = computed(() => accountsStore.netWorth)

// Calculate FIRE Number if not set manually
const calculatedFireNumber = computed(() => {
  if (fireSettings.value.fire_number > 0) return fireSettings.value.fire_number
  
  // Estimate annual expense from last 12 months (or last month * 12)
  // For now, use a placeholder or fetch from reports if available
  // Let's assume a default annual expense of 120,000 (10k/month) if no data
  const estimatedAnnualExpense = 120000 
  return estimatedAnnualExpense * (100 / fireSettings.value.withdrawal_rate)
})

const progress = computed(() => {
  if (calculatedFireNumber.value === 0) return 0
  return Math.min(100, (totalNetWorth.value / calculatedFireNumber.value) * 100)
})

const runwayYears = computed(() => {
  const annualExpense = calculatedFireNumber.value * (fireSettings.value.withdrawal_rate / 100)
  if (annualExpense === 0) return 0
  return totalNetWorth.value / annualExpense
})

const savingsRate = computed(() => {
  let income = 0
  let expense = 0
  for (const m of monthlyTrendData.value) {
    income += m.income
    expense += m.expense
  }
  if (income <= 0) return 0
  return ((income - expense) / income) * 100
})

const assetHistory = ref<{ date: string; value: number }[]>([])

async function loadAssetHistory() {
  const { data, error } = await supabase
    .from('asset_snapshots')
    .select('date, total_value')
    .order('date', { ascending: true })
  
  if (error || !data) return

  const map = new Map<string, number>()
  for (const row of data) {
    const d = row.date
    const v = Number(row.total_value)
    map.set(d, (map.get(d) || 0) + v)
  }

  const sorted = Array.from(map.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
  
  assetHistory.value = sorted
}

// Initialize
onMounted(async () => {
  await Promise.all([
    accountsStore.load(),
    loadSettings(),
    reloadForYear(),
    loadAssetHistory()
  ])
})
</script>

<template>
  <div class="space-y-8 pb-10">
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h2 class="text-3xl font-bold tracking-tight text-foreground/90">
          FIRE 仪表盘
        </h2>
        <p class="mt-2 text-base text-muted-foreground">
          财务自由进度监控与规划
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <AppIcon name="lucide:settings-2" :size="16" class="mr-2" />
          设置目标
        </Button>
      </div>
    </div>

    <!-- Top Cards -->
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            当前净资产
          </CardTitle>
          <AppIcon name="lucide:wallet" :size="16" class="text-primary" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold tabular-nums">
            ¥{{ totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            包含所有账户资产与负债
          </p>
        </CardContent>
      </Card>

      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            FIRE 目标金额
          </CardTitle>
          <AppIcon name="lucide:flag" :size="16" class="text-red-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold tabular-nums">
            ¥{{ calculatedFireNumber.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            基于 {{ fireSettings.withdrawal_rate }}% 提现率
          </p>
        </CardContent>
      </Card>

      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            自由进度
          </CardTitle>
          <AppIcon name="lucide:gauge" :size="16" class="text-blue-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {{ progress.toFixed(1) }}%
          </div>
          <div class="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              class="h-full bg-blue-500 transition-all duration-500 ease-out"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
        </CardContent>
      </Card>

      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            安全跑道
          </CardTitle>
          <AppIcon name="lucide:hourglass" :size="16" class="text-amber-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold tabular-nums">
            {{ runwayYears.toFixed(1) }} 年
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            按当前资产维持生活
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Main Content Area -->
    <div class="grid gap-8 lg:grid-cols-3">
      <!-- Chart Area -->
      <Card class="lg:col-span-2 border-border/50 bg-card/60 shadow-xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle>资产增长趋势</CardTitle>
        </CardHeader>
        <CardContent class="h-[300px] p-4">
          <BaseChart
            v-if="assetHistory.length"
            type="area"
            :data="assetHistory.map(d => ({ x: d.date, y: d.value }))"
            :colors="['#ef4444']" 
            :height="260"
          />
          <div v-else class="flex h-full items-center justify-center text-muted-foreground">
            暂无历史数据
          </div>
        </CardContent>
      </Card>

      <!-- Sidebar / Insights -->
      <Card class="lg:col-span-1 border-border/50 bg-card/60 shadow-xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle>关键指标</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">储蓄率 (Savings Rate)</span>
            <span class="font-bold font-numeric tabular-nums" :class="savingsRate > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'">
              {{ savingsRate.toFixed(1) }}%
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">预计退休年龄</span>
            <span class="font-bold font-numeric tabular-nums">{{ fireSettings.retire_age }} 岁</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">距离退休</span>
            <span class="font-bold font-numeric tabular-nums">{{ Math.max(0, fireSettings.retire_age - fireSettings.current_age) }} 年</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
