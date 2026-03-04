<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import MonthlyReport from '@/components/report/MonthlyReport.vue'
import AnnualReport from '@/components/report/AnnualReport.vue'

type TxType = 'expense' | 'income' | 'transfer'

type TxRow = {
  id?: string
  type: TxType
  amount: string
  occurred_at: string
  category: string | null
  note?: string | null
}

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const yearTx = ref<TxRow[]>([])
const yearBudgets = ref<Record<string, number>>({}) // 'YYYY-MM-DD' -> amount
const budgetLoading = ref(false)
const budgetSaving = ref(false)
const budgetError = ref<string | null>(null)

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
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)

const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => current - i)
})

const monthOptions = computed(() => Array.from({ length: 12 }, (_, i) => i + 1))

const monthTx = computed(() => {
  return yearTx.value.filter((t) => {
    const d = new Date(t.occurred_at)
    return d.getFullYear() === selectedYear.value && d.getMonth() + 1 === selectedMonth.value
  })
})

const monthDateStr = computed(() => {
  return new Date(selectedYear.value, selectedMonth.value - 1, 1).toISOString().slice(0, 10)
})

const monthBudget = computed(() => {
  return yearBudgets.value[monthDateStr.value] || 0
})

const monthlyTrendData = computed(() => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  return months.map((m) => {
    let income = 0
    let expense = 0
    for (const t of yearTx.value) {
      const d = new Date(t.occurred_at)
      if (d.getFullYear() !== selectedYear.value || d.getMonth() + 1 !== m) continue
      const amt = Number(t.amount ?? 0)
      if (t.type === 'income') income += amt
      if (t.type === 'expense') expense += amt
    }
    return { label: `${m}月`, income, expense }
  })
})

async function loadYearTransactions() {
  if (!user.value) return
  loading.value = true
  errorMessage.value = null
  const start = new Date(selectedYear.value, 0, 1)
  const end = new Date(selectedYear.value + 1, 0, 1)
  const { data, error } = await supabase
    .from('transactions')
    .select('id,type,amount,occurred_at,category,note')
    .gte('occurred_at', start.toISOString())
    .lt('occurred_at', end.toISOString())
    .order('occurred_at', { ascending: false }) // Descending for detailed list
  loading.value = false
  if (error) {
    errorMessage.value = error.message
    yearTx.value = []
    return
  }
  yearTx.value = (data ?? []) as TxRow[]
}

async function loadYearBudgets() {
  if (!user.value) return
  budgetLoading.value = true
  budgetError.value = null
  const start = new Date(selectedYear.value, 0, 1).toISOString().slice(0, 10)
  const end = new Date(selectedYear.value + 1, 0, 1).toISOString().slice(0, 10)
  
  const { data, error } = await supabase
    .from('budgets')
    .select('month,amount')
    .gte('month', start)
    .lt('month', end)

  budgetLoading.value = false
  if (error) {
    budgetError.value = error.message
    yearBudgets.value = {}
    return
  }
  
  const map: Record<string, number> = {}
  for (const b of data || []) {
    map[b.month] = Number(b.amount)
  }
  yearBudgets.value = map
}

async function saveBudget() {
  if (!user.value) return
  budgetSaving.value = true
  budgetError.value = null
  const monthDate = monthDateStr.value
  const amountNum = monthBudget.value
  
  // We update local state immediately via v-model in MonthlyReport, but need to sync to DB
  // Actually MonthlyReport emits 'update:budget' which updates the computed property? No, computed is read-only unless setter.
  // We need a writable ref or handle the update.
}

function updateBudget(val: number) {
  const date = monthDateStr.value
  yearBudgets.value = { ...yearBudgets.value, [date]: val }
}

async function persistBudget() {
  if (!user.value) return
  budgetSaving.value = true
  const monthDate = monthDateStr.value
  const amountNum = yearBudgets.value[monthDate] || 0

  if (amountNum <= 0) {
    const { error } = await supabase.from('budgets').delete().eq('month', monthDate)
    budgetSaving.value = false
    if (error) budgetError.value = error.message
    return
  }

  const { error } = await supabase
    .from('budgets')
    .upsert({ month: monthDate, amount: amountNum }, { onConflict: 'user_id,month' })
  
  budgetSaving.value = false
  if (error) {
    budgetError.value = error.message
  }
}

watch([selectedYear, user], () => {
  if (user.value) {
    loadYearTransactions()
    loadYearBudgets()
  } else {
    yearTx.value = []
    yearBudgets.value = {}
  }
}, { immediate: true })

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
          :budget="monthBudget"
          :budget-loading="budgetSaving"
          :year="selectedYear"
          :month="selectedMonth"
          @update:budget="updateBudget"
          @save-budget="persistBudget"
        />
        <AnnualReport 
          v-else
          :year-tx="yearTx"
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
