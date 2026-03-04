<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import MonthlyReport from '@/components/report/MonthlyReport.vue'
import AnnualReport from '@/components/report/AnnualReport.vue'
import { useReports } from '@/app/composables/useReports'
import { useToast } from '@/app/composables/useToast'

const currentTab = ref<'monthly' | 'annual'>('monthly')

// Sync tab with URL query
const route = useRoute()
const router = useRouter()

watch(() => route.query.tab, (newTab) => {
  if (newTab === 'monthly' || newTab === 'annual') {
    currentTab.value = newTab
  }
}, { immediate: true })

watch(currentTab, (newTab) => {
  if (route.query.tab !== newTab) {
    router.push({ query: { ...route.query, tab: newTab } })
  }
})

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
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:line-chart" :size="24" class="text-primary" />
          <h1 class="text-3xl font-bold tracking-tight text-foreground/90">
            报表中心
          </h1>
        </div>
        <p class="mt-2 text-base text-muted-foreground">
          全方位的财务数据分析与预算管理
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center rounded-xl border border-border/50 bg-muted/30 p-1 backdrop-blur-md">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium transition-all"
            :class="currentTab === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="currentTab = 'monthly'"
          >
            月度概览
          </button>
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium transition-all"
            :class="currentTab === 'annual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="currentTab = 'annual'"
          >
            年度报表
          </button>
        </div>
        
        <div class="h-8 w-px bg-border/50 mx-1 hidden md:block" />

        <div class="relative">
          <select
            v-model="selectedYear"
            class="h-10 appearance-none rounded-xl border border-border/50 bg-background/50 pl-4 pr-10 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary backdrop-blur-md"
          >
            <option v-for="y in yearOptions" :key="y" :value="y">
              {{ y }}年
            </option>
          </select>
          <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div v-if="currentTab === 'monthly'" class="relative animate-in fade-in slide-in-from-left-2 duration-300">
          <select
            v-model="selectedMonth"
            class="h-10 appearance-none rounded-xl border border-border/50 bg-background/50 pl-4 pr-10 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary backdrop-blur-md"
          >
            <option v-for="m in monthOptions" :key="m" :value="m">
              {{ m }}月
            </option>
          </select>
          <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
      <div class="flex items-center gap-2 font-semibold">
        <AppIcon name="lucide:alert-circle" :size="16" />
        加载失败
      </div>
      <p class="mt-1 opacity-90">{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <AppIcon name="lucide:loader-2" :size="32" class="animate-spin opacity-50" />
      <p class="mt-4 text-sm">正在加载报表数据...</p>
    </div>

    <div v-else>
      <Transition mode="out-in" name="fade">
        <MonthlyReport 
          v-if="currentTab === 'monthly'"
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
        <AnnualReport 
          v-else
          :year-budgets="yearBudgets"
          :monthly-trend-data="monthlyTrendData"
          :year="selectedYear"
        />
      </Transition>
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
