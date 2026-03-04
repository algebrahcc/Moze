<script setup lang="ts">
import { Plot } from '@/components/ui/plot'
import AppIcon from '@/components/AppIcon.vue'
import EmptyStateIllustration from '@/components/illustrations/EmptyStateIllustration.vue'
import { computed } from 'vue'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(false)
const errorMessage = ref<string | null>(null)

const accountsCount = ref<number | null>(null)
const monthExpense = ref<number | null>(null)
const monthIncome = ref<number | null>(null)
const snapshots30Count = ref<number | null>(null)
const recentTransactions = ref<any[]>([])
const netAssets = ref<number | null>(null)
const todayPnl = ref<number | null>(null)
const assetTrendPoints = ref<number[]>([])
const accountBreakdown = ref<{ type: string; value: number }[]>([])

const trendChartType = ref<'line' | 'stacked' | 'donut'>('line')
const categoryChartType = ref<'line' | 'stacked' | 'donut'>('donut')

function labelForAccountType(t: string) {
  if (t === 'cash') return '现金'
  if (t === 'credit') return '信用'
  if (t === 'stock') return '股票'
  return '其他'
}

// Chart data
const monthlyTrendData = ref<any[]>([])
const categoryData = ref<any[]>([])

function startOfMonthIso() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return start.toISOString()
}

function startOfYearIso() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return start.toISOString()
}

function isoDateDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

async function loadSummary() {
  if (!user.value) return
  loading.value = true
  errorMessage.value = null

  const monthStart = startOfMonthIso()
  const yearStart = startOfYearIso()
  const todayIso = new Date().toISOString().slice(0, 10)

  const { data: accountsData, error: aErr } = await supabase
    .from('accounts')
    .select('id,type,is_archived')
    .eq('is_archived', false)

  if (aErr) {
    loading.value = false
    errorMessage.value = aErr.message
    return
  }

  const accountIds = (accountsData ?? []).map((a) => a.id)
  const stockIds = (accountsData ?? []).filter((a) => a.type === 'stock').map((a) => a.id)

  const [
    { data: txData, error: txErr },
    { count: sCount, error: sErr },
    { data: recentTx, error: rTxErr },
    { data: yearTx, error: yTxErr },
    { data: allTx, error: allTxErr },
    { data: latestSnapshots, error: latestErr },
    { data: trendSnapshots, error: trendErr },
    { data: todaySnapshots, error: todayErr }
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('type,amount,occurred_at,category,account_id,to_account_id')
      .gte('occurred_at', monthStart)
      .order('occurred_at', { ascending: false }),
    supabase
      .from('asset_snapshots')
      .select('id', { count: 'exact', head: true })
      .gte('date', isoDateDaysAgo(30)),
    supabase
      .from('transactions')
      .select(`
        id, type, amount, category, occurred_at,
        account:accounts!transactions_account_id_fkey(name),
        to_account:accounts!transactions_to_account_id_fkey(name)
      `)
      .order('occurred_at', { ascending: false })
      .limit(5),
    supabase
      .from('transactions')
      .select('type,amount,occurred_at')
      .gte('occurred_at', yearStart)
      .order('occurred_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('type,amount,account_id,to_account_id')
      .order('occurred_at', { ascending: true }),
    stockIds.length
      ? supabase
          .from('asset_snapshots')
          .select('account_id,date,total_value,daily_pnl')
          .in('account_id', stockIds)
          .order('date', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    stockIds.length
      ? supabase
          .from('asset_snapshots')
          .select('account_id,date,total_value')
          .in('account_id', stockIds)
          .gte('date', isoDateDaysAgo(30))
          .order('date', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    stockIds.length
      ? supabase
          .from('asset_snapshots')
          .select('account_id,date,daily_pnl')
          .in('account_id', stockIds)
          .eq('date', todayIso)
      : Promise.resolve({ data: [], error: null }),
  ])

  loading.value = false

  if (txErr || sErr || rTxErr || yTxErr || allTxErr || latestErr || trendErr || todayErr) {
    errorMessage.value = txErr?.message || sErr?.message || rTxErr?.message || yTxErr?.message || allTxErr?.message || latestErr?.message || trendErr?.message || todayErr?.message || '读取失败'
    return
  }

  accountsCount.value = accountIds.length
  snapshots30Count.value = sCount ?? 0
  recentTransactions.value = recentTx ?? []

  // Calculate monthly stats
  let expense = 0
  let income = 0
  let todayExpense = 0
  let todayIncome = 0
  const catMap: Record<string, number> = {}

  for (const row of txData ?? []) {
    const amt = Number(row.amount ?? 0)
    const txDate = new Date(row.occurred_at).toISOString().slice(0, 10)
    if (row.type === 'expense') {
      expense += amt
      if (txDate === todayIso) todayExpense += amt
      const cat = row.category || '无分类'
      catMap[cat] = (catMap[cat] || 0) + amt
    }
    if (row.type === 'income') {
      income += amt
      if (txDate === todayIso) todayIncome += amt
    }
  }
  monthExpense.value = expense
  monthIncome.value = income

  const balances: Record<string, number> = {}
  for (const id of accountIds) balances[id] = 0
  for (const row of allTx ?? []) {
    const amt = Number(row.amount ?? 0)
    if (row.type === 'expense') {
      balances[row.account_id] = (balances[row.account_id] ?? 0) - amt
    }
    if (row.type === 'income') {
      balances[row.account_id] = (balances[row.account_id] ?? 0) + amt
    }
    if (row.type === 'transfer') {
      balances[row.account_id] = (balances[row.account_id] ?? 0) - amt
      if (row.to_account_id) {
        balances[row.to_account_id] = (balances[row.to_account_id] ?? 0) + amt
      }
    }
  }

  const latestMap: Record<string, { total: number; daily: number | null }> = {}
  for (const row of latestSnapshots ?? []) {
    if (!latestMap[row.account_id]) {
      latestMap[row.account_id] = {
        total: Number(row.total_value ?? 0),
        daily: row.daily_pnl === null ? null : Number(row.daily_pnl ?? 0),
      }
    }
  }

  let stockTotal = 0
  for (const id of stockIds) {
    const total = latestMap[id]?.total ?? 0
    stockTotal += total
  }

  const cashTotal = accountIds
    .filter((id) => !stockIds.includes(id))
    .reduce((sum, id) => sum + (balances[id] ?? 0), 0)

  netAssets.value = cashTotal + stockTotal

  const todayStockPnl = (todaySnapshots ?? []).reduce((sum, r) => sum + Number(r.daily_pnl ?? 0), 0)
  todayPnl.value = todayIncome - todayExpense + todayStockPnl

  const typeTotals: Record<string, number> = {}
  for (const a of accountsData ?? []) {
    if (a.type === 'stock') {
      typeTotals[a.type] = (typeTotals[a.type] ?? 0) + (latestMap[a.id]?.total ?? 0)
    } else {
      typeTotals[a.type] = (typeTotals[a.type] ?? 0) + (balances[a.id] ?? 0)
    }
  }
  accountBreakdown.value = Object.entries(typeTotals).map(([type, value]) => ({ type, value }))

  const trendMap: Record<string, number> = {}
  for (const row of trendSnapshots ?? []) {
    const key = row.date
    trendMap[key] = (trendMap[key] ?? 0) + Number(row.total_value ?? 0)
  }
  assetTrendPoints.value = Object.entries(trendMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => v)

  // Prepare Category Chart Data
  categoryData.value = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6) // Top 6 categories

  // Prepare Trend Chart Data (Last 6 months)
  const monthsMap: Record<string, { income: number; expense: number }> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthsMap[key] = { income: 0, expense: 0 }
  }

  for (const row of yearTx ?? []) {
    const date = new Date(row.occurred_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (monthsMap[key]) {
      const amt = Number(row.amount ?? 0)
      if (row.type === 'income') monthsMap[key].income += amt
      if (row.type === 'expense') monthsMap[key].expense += amt
    }
  }
  
  monthlyTrendData.value = Object.entries(monthsMap).map(([k, v]) => ({
    label: k.slice(5) + '月', // "03月"
    ...v
  }))
}

const trendColors = ['#22c55e', '#ef4444'] as const
const trendLegendItems = computed(() => ([
  { label: '收入', color: trendColors[0] },
  { label: '支出', color: trendColors[1] },
]))

const trendPlotData = computed(() => {
  if (trendChartType.value === 'donut') {
    const incomeTotal = monthlyTrendData.value.reduce((sum, d) => sum + d.income, 0)
    const expenseTotal = monthlyTrendData.value.reduce((sum, d) => sum + d.expense, 0)
    return [
      { type: '收入', value: incomeTotal },
      { type: '支出', value: expenseTotal },
    ]
  }
  return monthlyTrendData.value.flatMap((d) => ([
    { x: d.label, y: d.income, series: '收入' },
    { x: d.label, y: d.expense, series: '支出' },
  ]))
})

const categoryPalette = [
  '#2563eb',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#f97316',
  '#f43f5e',
]

const categoryPlotData = computed(() => {
  if (categoryChartType.value === 'donut') {
    return categoryData.value.map((d) => ({ type: d[0], value: d[1] }))
  }
  if (categoryChartType.value === 'stacked') {
    return categoryData.value.map((d) => ({ x: '支出', y: d[1], series: d[0] }))
  }
  return categoryData.value.map((d) => ({ x: d[0], y: d[1], series: '支出' }))
})

const categoryLegendItems = computed(() => {
  return categoryData.value.map((d, idx) => ({
    label: String(d[0]),
    color: categoryPalette[idx % categoryPalette.length] ?? categoryPalette[0] ?? '#2563eb',
  }))
})

const categoryLegendForPlot = computed(() => {
  if (categoryChartType.value === 'line') {
    return [{ label: '支出', color: categoryPalette[0] ?? '#2563eb' }]
  }
  return categoryLegendItems.value
})

watchEffect(() => {
  if (user.value) {
    loadSummary()
  }
})
</script>

<template>
  <div class="space-y-8 pb-10">
    <!-- Header -->
    <div class="flex flex-col gap-1">
      <h1 class="text-3xl font-semibold tracking-tight">总览</h1>
      <p class="text-muted-foreground">
        {{ new Date().getHours() < 12 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好' }}，这里是你的财务概览。
      </p>
    </div>

    <div v-if="errorMessage" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
      {{ errorMessage }}
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card class="bg-card/50 backdrop-blur-sm">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">净资产</CardTitle>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <AppIcon name="lucide:line-chart" :size="16" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric">
            {{ loading ? '—' : (netAssets !== null ? `¥${netAssets.toFixed(2)}` : '¥0.00') }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            资产净值合计
          </p>
        </CardContent>
      </Card>

      <Card class="bg-card/50 backdrop-blur-sm">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">总账户数</CardTitle>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <AppIcon name="lucide:wallet-cards" :size="16" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric">{{ loading ? '—' : (accountsCount ?? 0) }}</div>
          <p class="text-xs text-muted-foreground mt-1">
            活跃资产账户
          </p>
        </CardContent>
      </Card>

      <Card class="bg-card/50 backdrop-blur-sm">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">本月支出</CardTitle>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AppIcon name="lucide:trending-down" :size="16" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric">
            {{ loading ? '—' : (monthExpense ? `¥${monthExpense.toFixed(2)}` : '¥0.00') }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            {{ new Date().getMonth() + 1 }}月累计
          </p>
        </CardContent>
      </Card>

      <Card class="bg-card/50 backdrop-blur-sm">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">本月收入</CardTitle>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
            <AppIcon name="lucide:trending-up" :size="16" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric">
            {{ loading ? '—' : (monthIncome ? `¥${monthIncome.toFixed(2)}` : '¥0.00') }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            {{ new Date().getMonth() + 1 }}月累计
          </p>
        </CardContent>
      </Card>

      <Card class="bg-card/50 backdrop-blur-sm">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">今日盈亏</CardTitle>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <AppIcon name="lucide:activity" :size="16" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric">
            {{ loading ? '—' : (todayPnl !== null ? `${todayPnl >= 0 ? '+' : ''}¥${todayPnl.toFixed(2)}` : '¥0.00') }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            含当日盈亏与净流入
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Charts Section -->
    <div class="grid gap-4 md:grid-cols-2">
      <!-- Monthly Trend Chart -->
      <Card class="rounded-lg bg-card/60 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.6)] backdrop-blur-sm">
        <CardHeader class="gap-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-sm font-medium">近半年收支趋势</CardTitle>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1 rounded-lg border border-border/60 bg-background/70 p-1 text-xs">
                <button
                  type="button"
                  class="px-2 py-1 rounded-md transition"
                  :class="trendChartType === 'line' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                  @click="trendChartType = 'line'"
                >
                  线
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded-md transition"
                  :class="trendChartType === 'stacked' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                  @click="trendChartType = 'stacked'"
                >
                  堆
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded-md transition"
                  :class="trendChartType === 'donut' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                  @click="trendChartType = 'donut'"
                >
                  环
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="h-[240px] w-full">
            <ClientOnly>
              <Plot
                :type="trendChartType"
                :data="trendPlotData"
                :colors="trendColors"
                :legend-items="trendLegendItems"
              />
            </ClientOnly>
          </div>
        </CardContent>
      </Card>

      <!-- Expense Structure Chart -->
      <Card class="rounded-lg bg-card/60 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.6)] backdrop-blur-sm">
        <CardHeader class="gap-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-sm font-medium">本月支出构成</CardTitle>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1 rounded-lg border border-border/60 bg-background/70 p-1 text-xs">
                <button
                  type="button"
                  class="px-2 py-1 rounded-md transition"
                  :class="categoryChartType === 'line' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                  @click="categoryChartType = 'line'"
                >
                  线
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded-md transition"
                  :class="categoryChartType === 'stacked' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                  @click="categoryChartType = 'stacked'"
                >
                  堆
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded-md transition"
                  :class="categoryChartType === 'donut' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                  @click="categoryChartType = 'donut'"
                >
                  环
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex h-[240px] w-full items-center justify-center">
            <div v-if="!categoryData.length" class="flex flex-col items-center justify-center text-sm text-muted-foreground">
              <EmptyStateIllustration class="mb-4 w-32 opacity-50" />
              <span>暂无支出数据</span>
            </div>
            <ClientOnly v-else>
              <Plot
                :type="categoryChartType"
                :data="categoryPlotData"
                :colors="categoryPalette"
                :legend-items="categoryLegendForPlot"
              />
            </ClientOnly>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <!-- Recent Transactions -->
      <Card class="col-span-4 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>最近交易</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div v-if="recentTransactions.length === 0" class="flex h-32 items-center justify-center text-sm text-muted-foreground">
              暂无交易记录
            </div>
            <div 
              v-for="tx in recentTransactions" 
              :key="tx.id" 
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-4">
                <div class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background">
                  <AppIcon 
                    :name="tx.type === 'expense' ? 'lucide:arrow-up-right' : (tx.type === 'income' ? 'lucide:arrow-down-left' : 'lucide:arrow-right-left')" 
                    :size="16"
                    :class="tx.type === 'expense' ? 'text-destructive' : (tx.type === 'income' ? 'text-green-600' : 'text-blue-600')" 
                  />
                </div>
                <div class="space-y-1">
                  <p class="text-sm font-medium leading-none">
                    {{ tx.category || (tx.type === 'transfer' ? '转账' : '无分类') }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ tx.account?.name }} 
                    <span v-if="tx.type === 'transfer'">→ {{ tx.to_account?.name }}</span>
                    · {{ new Date(tx.occurred_at).toLocaleDateString() }}
                  </p>
                </div>
              </div>
              <div 
                class="font-medium font-numeric"
                :class="tx.type === 'expense' ? 'text-foreground' : (tx.type === 'income' ? 'text-green-600' : 'text-blue-600')"
              >
                {{ tx.type === 'expense' ? '-' : '+' }}¥{{ Number(tx.amount).toFixed(2) }}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Quick Actions / Snapshot -->
      <Card class="col-span-3 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-2">
          <Button as-child variant="outline" class="w-full justify-start h-auto py-3">
            <NuxtLink to="/transactions" class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <AppIcon name="lucide:arrow-right-left" :size="16" />
              </div>
              <div class="flex flex-col items-start text-left">
                <span class="text-sm font-medium">记一笔</span>
                <span class="text-xs text-muted-foreground">记录支出、收入或转账</span>
              </div>
            </NuxtLink>
          </Button>
          
          <Button as-child variant="outline" class="w-full justify-start h-auto py-3">
            <NuxtLink to="/investments/snapshots" class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <AppIcon name="lucide:trending-up" :size="16" />
              </div>
              <div class="flex flex-col items-start text-left">
                <span class="text-sm font-medium">录入净值</span>
                <span class="text-xs text-muted-foreground">更新今日资产快照</span>
              </div>
            </NuxtLink>
          </Button>
        </CardContent>
        <CardContent class="pt-0">
          <div class="mt-2 rounded-xl border border-border/60 bg-background/60 p-4">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">资产趋势</div>
              <div class="text-xs text-muted-foreground">近 30 天</div>
            </div>
            <div v-if="assetTrendPoints.length" class="mt-3 h-8">
              <Sparkline :points="assetTrendPoints" class="text-primary" />
            </div>
            <div v-else class="mt-3 text-xs text-muted-foreground">
              暂无净值数据
            </div>
          </div>
          <div class="mt-4 rounded-xl border border-border/60 bg-background/60 p-4">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">账户构成</div>
              <div class="text-xs text-muted-foreground">按类型</div>
            </div>
            <div v-if="accountBreakdown.length" class="mt-3 space-y-3">
              <div
                v-for="item in accountBreakdown"
                :key="item.type"
                class="space-y-1"
              >
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{{ labelForAccountType(item.type) }}</span>
                  <span class="font-medium text-foreground">¥{{ item.value.toFixed(2) }}</span>
                </div>
                <div class="h-2 w-full rounded-full bg-muted/60">
                  <div
                    class="h-2 rounded-full bg-primary"
                    :style="{
                      width: `${netAssets && netAssets > 0 ? (item.value / netAssets) * 100 : 0}%`
                    }"
                  />
                </div>
              </div>
            </div>
            <div v-else class="mt-3 text-xs text-muted-foreground">
              暂无账户数据
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
