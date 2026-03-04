<script setup lang="ts">
import { BaseChart } from '@/components/ui/chart'
import AppIcon from '@/components/AppIcon.vue'
import EmptyStateIllustration from '@/components/illustrations/EmptyStateIllustration.vue'
import { Button } from '@/components/ui/button'

const {
  loading,
  errorMessage,
  accountsCount,
  monthExpense,
  monthIncome,
  snapshots30Count,
  recentTransactions,
  netAssets,
  todayPnl,
  assetTrendPoints,
  accountBreakdown,
  topExpenses,
  monthBudget,
  trendChartType,
  categoryChartType,
  trendColors,
  trendLegendItems,
  trendPlotData,
  categoryPlotData,
  categoryLegendItems,
  categoryLegendForPlot,
  budgetUsagePercent,
  labelForAccountType,
} = useDashboardSummary()
</script>

<template>
  <div class="space-y-8 pb-10">
    <!-- Header with Quick Actions -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-3xl font-semibold tracking-tight">总览</h1>
        <p class="text-muted-foreground">
          {{ new Date().getHours() < 12 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好' }}，这里是你的财务概览。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button as-child variant="outline" size="sm" class="h-9">
          <NuxtLink to="/transactions" class="flex items-center gap-2">
            <AppIcon name="lucide:plus" :size="16" />
            <span>记一笔</span>
          </NuxtLink>
        </Button>
        <Button as-child variant="outline" size="sm" class="h-9">
          <NuxtLink to="/investments/snapshots" class="flex items-center gap-2">
            <AppIcon name="lucide:trending-up" :size="16" />
            <span>录入净值</span>
          </NuxtLink>
        </Button>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
      {{ errorMessage }}
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <!-- Net Assets -->
      <Card class="bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">净资产</CardTitle>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <AppIcon name="lucide:wallet" :size="16" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric">
            {{ loading ? '—' : (netAssets !== null ? `¥${netAssets.toFixed(2)}` : '¥0.00') }}
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs text-muted-foreground">
              {{ accountsCount ?? 0 }} 个活跃账户
            </span>
          </div>
        </CardContent>
      </Card>

      <!-- Monthly Balance -->
      <Card class="bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">本月结余</CardTitle>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <AppIcon name="lucide:piggy-bank" :size="16" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold font-numeric">
            {{ loading ? '—' : `¥${((monthIncome ?? 0) - (monthExpense ?? 0)).toFixed(2)}` }}
          </div>
          <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span class="text-green-600 flex items-center gap-0.5">
              <AppIcon name="lucide:arrow-down" :size="12" />
              {{ (monthIncome ?? 0).toFixed(0) }}
            </span>
            <span class="text-muted-foreground/30">|</span>
            <span class="text-destructive flex items-center gap-0.5">
              <AppIcon name="lucide:arrow-up" :size="12" />
              {{ (monthExpense ?? 0).toFixed(0) }}
            </span>
          </div>
        </CardContent>
      </Card>

      <!-- Budget -->
      <Card class="bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">本月预算</CardTitle>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
            <AppIcon name="lucide:target" :size="16" />
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="!monthBudget" class="flex h-[32px] items-center text-sm text-muted-foreground">
            未设置预算
          </div>
          <div v-else>
            <div class="text-2xl font-bold font-numeric">
              {{ (budgetUsagePercent).toFixed(0) }}%
            </div>
            <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div 
                class="h-full rounded-full transition-all duration-500" 
                :class="budgetUsagePercent > 100 ? 'bg-destructive' : 'bg-primary'"
                :style="{ width: `${budgetUsagePercent}%` }"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Today PnL -->
      <Card class="bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
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

    <!-- Asset Analysis Section -->
    <div class="grid gap-4 md:grid-cols-3">
      <Card class="md:col-span-2 bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>资产趋势 (近30天)</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="h-[280px] w-full">
            <ClientOnly>
              <BaseChart
                type="area"
                :data="assetTrendPoints"
                :colors="['#10b981']"
              />
            </ClientOnly>
          </div>
        </CardContent>
      </Card>

      <Card class="bg-card/60 backdrop-blur-sm flex flex-col">
        <CardHeader>
          <CardTitle>账户构成</CardTitle>
        </CardHeader>
        <CardContent class="flex-1">
          <div v-if="accountBreakdown.length" class="space-y-5">
            <div
              v-for="item in accountBreakdown"
              :key="item.type"
              class="space-y-2"
            >
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <div class="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <AppIcon 
                      :name="item.type === 'stock' ? 'lucide:trending-up' : (item.type === 'credit' ? 'lucide:credit-card' : 'lucide:wallet')" 
                      :size="14" 
                    />
                  </div>
                  <span class="font-medium">{{ labelForAccountType(item.type) }}</span>
                </div>
                <div class="flex flex-col items-end">
                  <span class="font-medium font-numeric">¥{{ item.value.toFixed(2) }}</span>
                  <span class="text-xs text-muted-foreground font-numeric">
                    {{ netAssets && netAssets > 0 ? ((item.value / netAssets) * 100).toFixed(1) : 0 }}%
                  </span>
                </div>
              </div>
              <div class="h-1.5 w-full rounded-full bg-secondary">
                <div
                  class="h-1.5 rounded-full transition-all duration-500"
                  :class="item.type === 'stock' ? 'bg-blue-500' : (item.type === 'credit' ? 'bg-orange-500' : 'bg-green-500')"
                  :style="{
                    width: `${netAssets && netAssets > 0 ? (item.value / netAssets) * 100 : 0}%`
                  }"
                />
              </div>
            </div>
          </div>
          <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
            暂无账户数据
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Income & Expense Analysis -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <!-- Monthly Trend Chart -->
      <Card class="lg:col-span-2 bg-card/60 backdrop-blur-sm">
        <CardHeader class="gap-3">
          <div class="flex items-center justify-between">
            <CardTitle>收支趋势 (近半年)</CardTitle>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="h-[240px] w-full">
            <ClientOnly>
              <BaseChart
                :type="trendChartType"
                :data="trendPlotData"
                :colors="trendColors"
                :legend-items="trendLegendItems"
              />
            </ClientOnly>
          </div>
        </CardContent>
      </Card>

      <!-- Top Expenses -->
      <Card class="bg-card/60 backdrop-blur-sm flex flex-col">
        <CardHeader>
          <CardTitle>本月大额支出</CardTitle>
        </CardHeader>
        <CardContent class="flex-1">
          <div v-if="topExpenses.length" class="space-y-4">
            <div 
              v-for="tx in topExpenses" 
              :key="tx.id"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <AppIcon name="lucide:arrow-up-right" :size="14" />
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-medium">{{ tx.category || '无分类' }}</span>
                  <span class="text-xs text-muted-foreground">{{ new Date(tx.occurred_at).toLocaleDateString() }}</span>
                </div>
              </div>
              <span class="font-medium font-numeric">¥{{ Number(tx.amount).toFixed(2) }}</span>
            </div>
          </div>
          <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
            暂无支出记录
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Recent Transactions -->
    <Card class="bg-card/50 backdrop-blur-sm">
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
              <div class="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                <AppIcon 
                  :name="tx.type === 'expense' ? 'lucide:shopping-bag' : (tx.type === 'income' ? 'lucide:wallet' : 'lucide:arrow-right-left')" 
                  :size="18"
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
              class="font-medium font-numeric text-base"
              :class="tx.type === 'expense' ? 'text-foreground' : (tx.type === 'income' ? 'text-green-600' : 'text-blue-600')"
            >
              {{ tx.type === 'expense' ? '-' : '+' }}¥{{ Number(tx.amount).toFixed(2) }}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
