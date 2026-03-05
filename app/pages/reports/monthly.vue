<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import MonthlyReport from '@/components/report/MonthlyReport.vue'
import { useReports } from '@/app/composables/useReports'
import { useToast } from '@/app/composables/useToast'

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
  monthBudget,
  updateBudget,
  persistBudget,
} = useReports()
const toast = useToast()
</script>

<template>
  <div class="space-y-8 pb-10">
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:line-chart" :size="24" class="text-primary" />
          <h1 class="text-3xl font-bold tracking-tight text-foreground/90">月度概览</h1>
        </div>
        <p class="mt-2 text-base text-muted-foreground">本月收入、支出与分类分析</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <select v-model="selectedYear" class="h-10 appearance-none rounded-xl border border-border/50 bg-background/50 pl-4 pr-10 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary backdrop-blur-md">
            <option v-for="y in [selectedYear, selectedYear-1, selectedYear-2, selectedYear-3, selectedYear-4]" :key="y" :value="y">{{ y }}年</option>
          </select>
          <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <div class="relative">
          <select v-model="selectedMonth" class="h-10 appearance-none rounded-xl border border-border/50 bg-background/50 pl-4 pr-10 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary backdrop-blur-md">
            <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
          </select>
          <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
      {{ errorMessage }}
    </div>
    <div v-else-if="loading" class="flex items-center justify-center py-16 text-muted-foreground">
      <AppIcon name="lucide:loader-2" :size="32" class="animate-spin opacity-50" />
    </div>
    <div v-else>
      <MonthlyReport
        :month-tx="monthTx"
        :monthly-trend-data="monthlyTrendData"
        :month-category-expenses="monthCategoryExpenses"
        :budget="monthBudget"
        :budget-loading="budgetSaving"
        :year="selectedYear"
        :month="selectedMonth"
        @update:budget="updateBudget"
        @save-budget="persistBudget"
      />
    </div>
  </div>
</template>

