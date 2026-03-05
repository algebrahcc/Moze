<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import MonthlyReport from '@/components/report/MonthlyReport.vue'
import AnnualReport from '@/components/report/AnnualReport.vue'
import { useReports } from '@/app/composables/useReports'
import { useToast } from '@/app/composables/useToast'

const items = [
  { key: 'balance', label: '资产负债表', to: '/reports/balance-sheet', icon: 'lucide:wallet' },
  { key: 'cashflow', label: '现金流量表', to: '/reports/cashflow', icon: 'lucide:repeat' },
  { key: 'monthly', label: '月度概览', to: '/reports/monthly', icon: 'lucide:line-chart' },
  { key: 'annual', label: '年度报表', to: '/reports/annual', icon: 'lucide:book-open' },
] as const

const now = new Date()
const {
  loading,
  errorMessage,
  selectedYear,
  selectedMonth,
  monthTx,
  monthlyTrendData,
  monthCategoryExpenses,
  yearBudgets,
  budgetSaving,
  budgetError,
  monthBudget,
  updateBudget,
  persistBudget,
} = useReports()
const toast = useToast()

watch(budgetError, (msg) => {
  if (msg) toast({ title: '预算保存失败', description: msg, variant: 'error' })
})

const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => current - i)
})

const monthOptions = computed(() => Array.from({ length: 12 }, (_, i) => i + 1))

</script>

<template>
  <div class="space-y-8 pb-10">
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:line-chart" :size="24" class="text-primary" />
          <h1 class="text-3xl font-bold tracking-tight text-foreground/90">报表中心</h1>
        </div>
        <p class="mt-2 text-base text-muted-foreground">选择一种报表类型查看详细分析</p>
      </div>
    </div>
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <NuxtLink
        v-for="item in items"
        :key="item.key"
        :to="item.to"
        class="group rounded-2xl border border-border/60 bg-card/60 p-5 transition-all hover:shadow-lg hover:-translate-y-1"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <AppIcon :name="item.icon" :size="18" />
          </div>
          <div>
            <div class="text-sm font-semibold">{{ item.label }}</div>
            <div class="text-xs text-muted-foreground">进入查看</div>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
