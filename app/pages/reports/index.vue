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
          <AppIcon name="lucide:line-chart" :size="18" class="text-muted-foreground" />
          <h1 class="text-2xl font-semibold tracking-tight">
            报表中心
          </h1>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">
          全方位的财务数据分析与预算管理
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center rounded-lg border border-input bg-background/50 p-1">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-all"
            :class="currentTab === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="currentTab = 'monthly'"
          >
            月度概览
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-all"
            :class="currentTab === 'annual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="currentTab = 'annual'"
          >
            年度报表
          </button>
        </div>
        
        <div class="h-6 w-px bg-border/60 mx-1" />

        <select
          v-model="selectedYear"
          class="h-10 rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option v-for="y in yearOptions" :key="y" :value="y">
            {{ y }}年
          </option>
        </select>
        <select
          v-if="currentTab === 'monthly'"
          v-model="selectedMonth"
          class="h-10 rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-in fade-in slide-in-from-left-2 duration-300"
        >
          <option v-for="m in monthOptions" :key="m" :value="m">
            {{ m }}月
          </option>
        </select>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
      {{ errorMessage }}
    </div>

    <div v-else-if="loading" class="rounded-xl border border-border/70 bg-background/40 p-8 text-sm text-muted-foreground">
      加载中...
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
