<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import EmptyStateIllustration from '@/components/illustrations/EmptyStateIllustration.vue'
import { BaseChart } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type TxType = 'expense' | 'income' | 'transfer'

type TxRow = {
  id?: string
  type: TxType
  amount: string
  occurred_at: string
  category: string | null
  note?: string | null
}

const props = defineProps<{
  monthTx: TxRow[]
  monthlyTrendData: { label: string; income: number; expense: number }[]
  monthCategoryExpenses?: { category: string; expense: number }[]
  budget: number
  budgetLoading: boolean
  year: number
  month: number
}>()

const emit = defineEmits<{
  (e: 'update:budget', value: number): void
  (e: 'save-budget'): void
}>()

const trendChartType = ref<'line' | 'stacked' | 'donut'>('line')
const categoryChartType = ref<'line' | 'stacked' | 'donut'>('donut')
const budgetInput = ref(props.budget ? String(props.budget) : '')

const monthIncome = computed(() => {
  return props.monthTx
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
})

const monthExpense = computed(() => {
  return props.monthTx
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
})

const monthNet = computed(() => monthIncome.value - monthExpense.value)

const budgetUsagePercent = computed(() => {
  if (!props.budget) return 0
  const percent = (monthExpense.value / props.budget) * 100
  return Math.min(100, Math.max(0, percent))
})

const categoryData = computed(() => {
  if (props.monthCategoryExpenses?.length) {
    return props.monthCategoryExpenses
      .map((d) => [d.category, d.expense] as const)
      .slice(0, 8)
  }
  const map: Record<string, number> = {}
  for (const t of props.monthTx) {
    if (t.type !== 'expense') continue
    const key = t.category || '未分类'
    map[key] = (map[key] ?? 0) + Number(t.amount ?? 0)
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
})

const categoryPalette = [
  '#2563eb',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#f97316',
  '#f43f5e',
  '#a855f7',
  '#64748b',
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

const categoryLegendForPlot = computed(() => {
  if (categoryChartType.value === 'line') {
    return [{ label: '支出', color: categoryPalette[0] ?? '#2563eb' }]
  }
  return categoryData.value.map((d, idx) => ({
    label: String(d[0]),
    color: categoryPalette[idx % categoryPalette.length] ?? categoryPalette[0] ?? '#2563eb',
  }))
})

const trendColors = ['#22c55e', '#ef4444'] as const
const trendLegendItems = computed(() => ([
  { label: '收入', color: trendColors[0] },
  { label: '支出', color: trendColors[1] },
]))

const trendPlotData = computed(() => {
  if (trendChartType.value === 'donut') {
    const incomeTotal = props.monthlyTrendData.reduce((sum, d) => sum + d.income, 0)
    const expenseTotal = props.monthlyTrendData.reduce((sum, d) => sum + d.expense, 0)
    return [
      { type: '收入', value: incomeTotal },
      { type: '支出', value: expenseTotal },
    ]
  }
  return props.monthlyTrendData.flatMap((d) => ([
    { x: d.label, y: d.income, series: '收入' },
    { x: d.label, y: d.expense, series: '支出' },
  ]))
})

function handleBudgetSave() {
  const val = Number(budgetInput.value)
  if (Number.isFinite(val) && val >= 0) {
    emit('update:budget', val)
    emit('save-budget')
  } else if (budgetInput.value === '') {
    emit('update:budget', 0)
    emit('save-budget')
  }
}

// Watch budget prop to update local input
watch(() => props.budget, (val) => {
  budgetInput.value = val ? String(val) : ''
}, { immediate: true })
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Summary Cards -->
    <div class="grid gap-4 md:grid-cols-4">
      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl transition-transform hover:-translate-y-1">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">本月收入</CardTitle>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <AppIcon name="lucide:trending-up" :size="20" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric text-foreground">
            ¥{{ monthIncome.toFixed(2) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1 font-medium">
            {{ year }}年{{ month }}月
          </p>
        </CardContent>
      </Card>

      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl transition-transform hover:-translate-y-1">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">本月支出</CardTitle>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AppIcon name="lucide:trending-down" :size="20" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric text-foreground">
            ¥{{ monthExpense.toFixed(2) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1 font-medium">
            {{ year }}年{{ month }}月
          </p>
        </CardContent>
      </Card>

      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl transition-transform hover:-translate-y-1">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">本月结余</CardTitle>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <AppIcon name="lucide:wallet" :size="20" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric" :class="monthNet >= 0 ? 'text-primary' : 'text-destructive'">
            {{ monthNet >= 0 ? '+' : '' }}¥{{ monthNet.toFixed(2) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1 font-medium">
            收入 - 支出
          </p>
        </CardContent>
      </Card>

      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl transition-transform hover:-translate-y-1">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">预算执行</CardTitle>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <AppIcon name="lucide:target" :size="20" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-2">
             <div class="relative flex-1 group">
               <input 
                v-model="budgetInput"
                type="number" 
                placeholder="设置预算"
                class="w-full bg-transparent text-2xl font-bold font-numeric outline-none placeholder:text-muted-foreground/30 transition-colors focus:text-primary"
                @blur="handleBudgetSave"
                @keydown.enter="handleBudgetSave"
              />
              <div v-if="budgetLoading" class="absolute right-0 top-1/2 -translate-y-1/2">
                <AppIcon name="lucide:loader-2" :size="16" class="animate-spin text-muted-foreground" />
              </div>
              <div class="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full group-focus-within:w-full" />
             </div>
          </div>
          <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary/50">
            <div 
              class="h-full rounded-full transition-all duration-500 shadow-sm" 
              :class="budgetUsagePercent > 100 ? 'bg-destructive' : 'bg-primary'"
              :style="{ width: `${budgetUsagePercent}%` }"
            />
          </div>
          <p class="text-xs text-muted-foreground mt-2 flex justify-between font-medium">
            <span>已用 {{ budgetUsagePercent.toFixed(1) }}%</span>
            <span v-if="budget > 0">剩余 ¥{{ (budget - monthExpense).toFixed(2) }}</span>
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Charts -->
    <div class="grid gap-6 md:grid-cols-2">
      <!-- Monthly Trend -->
      <Card class="overflow-hidden border-border/50 bg-card/60 shadow-xl backdrop-blur-xl">
        <CardHeader class="border-b border-border/40 pb-4">
          <div class="flex items-center justify-between">
            <CardTitle class="text-base font-medium">收支趋势 (年度)</CardTitle>
            <div class="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-1 text-xs backdrop-blur-md">
              <button type="button" class="px-2.5 py-1 rounded-md transition-all font-medium" :class="trendChartType === 'line' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'" @click="trendChartType = 'line'">线</button>
              <button type="button" class="px-2.5 py-1 rounded-md transition-all font-medium" :class="trendChartType === 'stacked' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'" @click="trendChartType = 'stacked'">堆</button>
              <button type="button" class="px-2.5 py-1 rounded-md transition-all font-medium" :class="trendChartType === 'donut' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'" @click="trendChartType = 'donut'">环</button>
            </div>
          </div>
        </CardHeader>
        <CardContent class="pt-6">
          <div class="h-[280px] w-full">
            <ClientOnly>
              <BaseChart :type="trendChartType" :data="trendPlotData" :colors="trendColors" :legend-items="trendLegendItems" />
            </ClientOnly>
          </div>
        </CardContent>
      </Card>

      <!-- Category Breakdown -->
      <Card class="overflow-hidden border-border/50 bg-card/60 shadow-xl backdrop-blur-xl">
        <CardHeader class="border-b border-border/40 pb-4">
          <div class="flex items-center justify-between">
            <CardTitle class="text-base font-medium">本月支出构成</CardTitle>
            <div class="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-1 text-xs backdrop-blur-md">
              <button type="button" class="px-2.5 py-1 rounded-md transition-all font-medium" :class="categoryChartType === 'line' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'" @click="categoryChartType = 'line'">线</button>
              <button type="button" class="px-2.5 py-1 rounded-md transition-all font-medium" :class="categoryChartType === 'stacked' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'" @click="categoryChartType = 'stacked'">堆</button>
              <button type="button" class="px-2.5 py-1 rounded-md transition-all font-medium" :class="categoryChartType === 'donut' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'" @click="categoryChartType = 'donut'">环</button>
            </div>
          </div>
        </CardHeader>
        <CardContent class="pt-6">
          <div class="flex h-[280px] w-full items-center justify-center">
            <div v-if="!categoryData.length" class="flex flex-col items-center justify-center text-sm text-muted-foreground">
              <EmptyStateIllustration class="mb-4 w-32 opacity-50 grayscale" />
              <span>暂无支出数据</span>
            </div>
            <ClientOnly v-else>
              <BaseChart :type="categoryChartType" :data="categoryPlotData" :colors="categoryPalette" :legend-items="categoryLegendForPlot" />
            </ClientOnly>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Transaction Details Table -->
    <Card class="overflow-hidden border-border/50 bg-card/60 shadow-xl backdrop-blur-xl">
      <CardHeader class="border-b border-border/40 pb-4">
        <CardTitle class="text-base font-medium">月度明细</CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <div class="relative w-full overflow-auto">
          <table class="w-full caption-bottom text-sm">
            <thead class="bg-muted/30 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              <tr>
                <th class="h-12 px-6 text-left align-middle font-medium">日期</th>
                <th class="h-12 px-6 text-left align-middle font-medium">分类</th>
                <th class="h-12 px-6 text-left align-middle font-medium">备注</th>
                <th class="h-12 px-6 text-right align-middle font-medium">金额</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/30">
              <tr v-if="!monthTx.length">
                <td colspan="4" class="h-32 text-center text-muted-foreground">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <EmptyStateIllustration class="w-24 opacity-30 grayscale" />
                    <span class="text-xs">本月暂无交易记录</span>
                  </div>
                </td>
              </tr>
              <tr v-for="tx in monthTx" :key="tx.id" class="transition-colors hover:bg-muted/40">
                <td class="p-4 px-6 align-middle tabular-nums text-muted-foreground">{{ new Date(tx.occurred_at).toLocaleDateString() }}</td>
                <td class="p-4 px-6 align-middle">
                  <div class="flex items-center gap-3">
                    <div 
                      class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                      :class="{
                        'bg-destructive/10 text-destructive': tx.type === 'expense',
                        'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400': tx.type === 'income',
                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400': tx.type === 'transfer'
                      }"
                    >
                      <AppIcon 
                        :name="tx.type === 'expense' ? 'lucide:arrow-up-right' : (tx.type === 'income' ? 'lucide:arrow-down-left' : 'lucide:arrow-right-left')" 
                        :size="16"
                      />
                    </div>
                    <span class="font-medium">{{ tx.category || '无分类' }}</span>
                  </div>
                </td>
                <td class="p-4 px-6 align-middle text-muted-foreground max-w-[200px] truncate">{{ tx.note || '-' }}</td>
                <td 
                  class="p-4 px-6 align-middle text-right font-bold tabular-nums font-numeric text-base"
                  :class="{
                    'text-foreground': tx.type === 'expense',
                    'text-emerald-600 dark:text-emerald-400': tx.type === 'income',
                    'text-blue-600 dark:text-blue-400': tx.type === 'transfer'
                  }"
                >
                  {{ tx.type === 'expense' ? '-' : (tx.type === 'income' ? '+' : '') }}¥{{ Number(tx.amount).toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
