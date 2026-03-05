<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { BaseChart } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps<{
  yearBudgets: Record<string, number> // key: 'YYYY-MM-01'
  monthlyTrendData: { label: string; income: number; expense: number }[]
  year: number
}>()

const annualIncome = computed(() => {
  return props.monthlyTrendData.reduce((sum, m) => sum + Number(m.income ?? 0), 0)
})

const annualExpense = computed(() => {
  return props.monthlyTrendData.reduce((sum, m) => sum + Number(m.expense ?? 0), 0)
})

const annualBudget = computed(() => {
  return Object.values(props.yearBudgets).reduce((sum, val) => sum + val, 0)
})

const annualBalance = computed(() => annualIncome.value - annualExpense.value)

const budgetVsActualData = computed(() => {
  const data: { x: string; value: number; type: string }[] = []
  props.monthlyTrendData.forEach((m, idx) => {
    // Budget
    const monthStr = `${props.year}-${String(idx + 1).padStart(2, '0')}-01`
    const budget = props.yearBudgets[monthStr] || 0
    data.push({ x: m.label, value: budget, type: '预算' })
    // Expense
    data.push({ x: m.label, value: m.expense, type: '支出' })
  })
  return data
})

const budgetVsActualColors = ['#f59e0b', '#ef4444'] as const

const trendColors = ['#ef4444', '#22c55e'] as const
const trendLegendItems = computed(() => ([
  { label: '收入', color: trendColors[0] ?? '#22c55e' },
  { label: '支出', color: trendColors[1] ?? '#ef4444' },
]))

const trendPlotData = computed(() => {
  return props.monthlyTrendData.flatMap((d) => ([
    { x: d.label, y: d.income, series: '收入' },
    { x: d.label, y: d.expense, series: '支出' },
  ]))
})
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Summary Cards -->
    <div class="grid gap-4 md:grid-cols-4">
      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl transition-transform hover:-translate-y-1">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">年度总收入</CardTitle>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <AppIcon name="lucide:trending-up" :size="20" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric text-foreground">
            ¥{{ annualIncome.toFixed(2) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1 font-medium">
            {{ year }}年全年
          </p>
        </CardContent>
      </Card>

      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl transition-transform hover:-translate-y-1">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">年度总支出</CardTitle>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <AppIcon name="lucide:trending-down" :size="20" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric text-foreground">
            ¥{{ annualExpense.toFixed(2) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1 font-medium">
            {{ year }}年全年
          </p>
        </CardContent>
      </Card>

      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl transition-transform hover:-translate-y-1">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">年度结余</CardTitle>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <AppIcon name="lucide:wallet" :size="20" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric" :class="annualBalance >= 0 ? 'text-red-600' : 'text-emerald-600'">
            {{ annualBalance >= 0 ? '+' : '' }}¥{{ annualBalance.toFixed(2) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1 font-medium">
            收入 - 支出
          </p>
        </CardContent>
      </Card>

      <Card class="border-border/50 bg-card/60 shadow-lg backdrop-blur-xl transition-transform hover:-translate-y-1">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">年度预算总额</CardTitle>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <AppIcon name="lucide:target" :size="20" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric text-foreground">
            ¥{{ annualBudget.toFixed(2) }}
          </div>
          <p class="text-xs text-muted-foreground mt-1 font-medium">
            {{ year }}年累计预算
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Charts -->
    <div class="grid gap-6 md:grid-cols-2">
      <!-- Budget vs Actual -->
      <Card class="overflow-hidden border-border/50 bg-card/60 shadow-xl backdrop-blur-xl">
        <CardHeader class="border-b border-border/40 pb-4">
          <CardTitle class="text-base font-medium">预算执行情况 (月度)</CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <div class="h-[320px] w-full">
            <ClientOnly>
              <BaseChart 
                type="grouped" 
                :data="budgetVsActualData.map(d => ({ x: d.x, y: d.value, series: d.type }))" 
                :colors="budgetVsActualColors"
                :legend-items="[{ label: '预算', color: budgetVsActualColors[0] ?? '#f59e0b' }, { label: '支出', color: budgetVsActualColors[1] ?? '#ef4444' }]"
              />
            </ClientOnly>
          </div>
        </CardContent>
      </Card>

      <!-- Annual Trend -->
      <Card class="overflow-hidden border-border/50 bg-card/60 shadow-xl backdrop-blur-xl">
        <CardHeader class="border-b border-border/40 pb-4">
          <CardTitle class="text-base font-medium">年度收支趋势</CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <div class="h-[320px] w-full">
            <ClientOnly>
              <BaseChart 
                type="line" 
                :data="trendPlotData" 
                :colors="trendColors"
                :legend-items="trendLegendItems"
              />
            </ClientOnly>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
