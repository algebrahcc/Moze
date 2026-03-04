<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import EmptyStateIllustration from '@/components/illustrations/EmptyStateIllustration.vue'
import { Plot } from '@/components/ui/plot'
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
      <Card class="bg-card/50 backdrop-blur-sm">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">本月收入</CardTitle>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
            <AppIcon name="lucide:trending-up" :size="16" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric">
            ¥{{ monthIncome.toFixed(2) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            {{ year }}年{{ month }}月
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
            ¥{{ monthExpense.toFixed(2) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            {{ year }}年{{ month }}月
          </p>
        </CardContent>
      </Card>

      <Card class="bg-card/50 backdrop-blur-sm">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">本月结余</CardTitle>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <AppIcon name="lucide:wallet" :size="16" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric" :class="monthNet >= 0 ? 'text-primary' : 'text-destructive'">
            {{ monthNet >= 0 ? '+' : '' }}¥{{ monthNet.toFixed(2) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            收入 - 支出
          </p>
        </CardContent>
      </Card>

      <Card class="bg-card/50 backdrop-blur-sm">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">预算执行</CardTitle>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
            <AppIcon name="lucide:target" :size="16" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-2">
             <div class="relative flex-1">
               <input 
                v-model="budgetInput"
                type="number" 
                placeholder="设置预算"
                class="w-full bg-transparent text-2xl font-bold font-numeric outline-none placeholder:text-muted-foreground/50"
                @blur="handleBudgetSave"
                @keydown.enter="handleBudgetSave"
              />
              <div v-if="budgetLoading" class="absolute right-0 top-1/2 -translate-y-1/2">
                <AppIcon name="lucide:loader-2" :size="16" class="animate-spin text-muted-foreground" />
              </div>
             </div>
          </div>
          <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              class="h-full rounded-full transition-all duration-500" 
              :class="budgetUsagePercent > 100 ? 'bg-destructive' : 'bg-primary'"
              :style="{ width: `${budgetUsagePercent}%` }"
            />
          </div>
          <p class="text-xs text-muted-foreground mt-1 flex justify-between">
            <span>已用 {{ budgetUsagePercent.toFixed(1) }}%</span>
            <span v-if="budget > 0">剩余 ¥{{ (budget - monthExpense).toFixed(2) }}</span>
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Charts -->
    <div class="grid gap-4 md:grid-cols-2">
      <!-- Monthly Trend -->
      <Card class="rounded-lg bg-card/60 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.6)] backdrop-blur-sm">
        <CardHeader class="gap-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-sm font-medium">收支趋势 (年度)</CardTitle>
            <div class="flex items-center gap-1 rounded-lg border border-border/60 bg-background/70 p-1 text-xs">
              <button type="button" class="px-2 py-1 rounded-md transition" :class="trendChartType === 'line' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'" @click="trendChartType = 'line'">线</button>
              <button type="button" class="px-2 py-1 rounded-md transition" :class="trendChartType === 'stacked' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'" @click="trendChartType = 'stacked'">堆</button>
              <button type="button" class="px-2 py-1 rounded-md transition" :class="trendChartType === 'donut' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'" @click="trendChartType = 'donut'">环</button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="h-[240px] w-full">
            <ClientOnly>
              <Plot :type="trendChartType" :data="trendPlotData" :colors="trendColors" :legend-items="trendLegendItems" />
            </ClientOnly>
          </div>
        </CardContent>
      </Card>

      <!-- Category Breakdown -->
      <Card class="rounded-lg bg-card/60 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.6)] backdrop-blur-sm">
        <CardHeader class="gap-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-sm font-medium">本月支出构成</CardTitle>
            <div class="flex items-center gap-1 rounded-lg border border-border/60 bg-background/70 p-1 text-xs">
              <button type="button" class="px-2 py-1 rounded-md transition" :class="categoryChartType === 'line' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'" @click="categoryChartType = 'line'">线</button>
              <button type="button" class="px-2 py-1 rounded-md transition" :class="categoryChartType === 'stacked' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'" @click="categoryChartType = 'stacked'">堆</button>
              <button type="button" class="px-2 py-1 rounded-md transition" :class="categoryChartType === 'donut' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'" @click="categoryChartType = 'donut'">环</button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex h-[240px] w-full items-center justify-center">
            <div v-if="!categoryData.length" class="flex flex-col items-center justify-center text-sm text-muted-foreground">
              <EmptyStateIllustration class="mb-4 w-28 opacity-50" />
              <span>暂无支出数据</span>
            </div>
            <ClientOnly v-else>
              <Plot :type="categoryChartType" :data="categoryPlotData" :colors="categoryPalette" :legend-items="categoryLegendForPlot" />
            </ClientOnly>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Transaction Details Table -->
    <Card class="rounded-lg bg-card/60 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle class="text-sm font-medium">月度明细</CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <div class="relative w-full overflow-auto">
          <table class="w-full caption-bottom text-sm">
            <thead class="[&_tr]:border-b">
              <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">日期</th>
                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">分类</th>
                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">备注</th>
                <th class="h-12 px-4 text-right align-middle font-medium text-muted-foreground">金额</th>
              </tr>
            </thead>
            <tbody class="[&_tr:last-child]:border-0">
              <tr v-if="!monthTx.length">
                <td colspan="4" class="h-24 text-center text-muted-foreground">暂无数据</td>
              </tr>
              <tr v-for="tx in monthTx" :key="tx.id" class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <td class="p-4 align-middle tabular-nums">{{ new Date(tx.occurred_at).toLocaleDateString() }}</td>
                <td class="p-4 align-middle">
                  <div class="flex items-center gap-2">
                    <div class="flex h-6 w-6 items-center justify-center rounded bg-muted">
                      <AppIcon 
                        :name="tx.type === 'expense' ? 'lucide:arrow-up-right' : (tx.type === 'income' ? 'lucide:arrow-down-left' : 'lucide:arrow-right-left')" 
                        :size="12"
                        :class="tx.type === 'expense' ? 'text-destructive' : (tx.type === 'income' ? 'text-green-600' : 'text-blue-600')" 
                      />
                    </div>
                    <span>{{ tx.category || '无分类' }}</span>
                  </div>
                </td>
                <td class="p-4 align-middle text-muted-foreground">{{ tx.note || '-' }}</td>
                <td 
                  class="p-4 align-middle text-right font-medium tabular-nums font-numeric"
                  :class="tx.type === 'income' ? 'text-green-600' : (tx.type === 'expense' ? 'text-foreground' : 'text-blue-600')"
                >
                  {{ tx.type === 'expense' ? '-' : '+' }}¥{{ Number(tx.amount).toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
