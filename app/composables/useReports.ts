import { computed } from 'vue'
import { useToast } from '@/app/composables/useToast'

type TxType = 'expense' | 'income' | 'transfer'

export type TxRow = {
  id?: string
  type: TxType
  amount: string
  occurred_at: string
  category: string | null
  note?: string | null
}

export type MonthlyTrendItem = { label: string; income: number; expense: number }
export type MonthCategoryExpenseItem = { category: string; expense: number }

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function useReports() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()

  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  const selectedYear = ref(new Date().getFullYear())
  const selectedMonth = ref(new Date().getMonth() + 1)

  const monthTx = ref<TxRow[]>([])
  const monthlyTrendData = ref<MonthlyTrendItem[]>([])
  const monthCategoryExpenses = ref<MonthCategoryExpenseItem[]>([])

  const yearBudgets = ref<Record<string, number>>({})
  const budgetLoading = ref(false)
  const budgetSaving = ref(false)
  const budgetError = ref<string | null>(null)

  const monthDateStr = computed(() => monthKey(selectedYear.value, selectedMonth.value))
  const monthBudget = computed(() => yearBudgets.value[monthDateStr.value] || 0)
  const monthExpense = computed(() => {
    return monthTx.value
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
  })

  const budgetAlertMonth = useCookie<string>('moze_budget_alert_month', {
    default: () => '',
  })

  function updateBudget(val: number) {
    const date = monthDateStr.value
    yearBudgets.value = { ...yearBudgets.value, [date]: val }
  }

  async function persistBudget() {
    if (!user.value) return
    budgetSaving.value = true
    budgetError.value = null
    const monthDate = monthDateStr.value
    const amountNum = yearBudgets.value[monthDate] || 0

    if (amountNum <= 0) {
      const { error } = await supabase.from('budgets').delete().eq('month', monthDate)
      budgetSaving.value = false
      if (error) budgetError.value = error.message
      return
    }

    const { error } = await supabase.from('budgets').upsert({ month: monthDate, amount: amountNum }, { onConflict: 'user_id,month' })
    budgetSaving.value = false
    if (error) budgetError.value = error.message
  }

  async function loadYearBudgets() {
    if (!user.value) return
    budgetLoading.value = true
    budgetError.value = null

    const start = `${selectedYear.value}-01-01`
    const end = `${selectedYear.value + 1}-01-01`

    const { data, error } = await supabase.from('budgets').select('month,amount').gte('month', start).lt('month', end)

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

  async function loadMonthlyTrend() {
    if (!user.value) return
    loading.value = true
    errorMessage.value = null

    const year = selectedYear.value
    const start = `${year}-01-01`
    const end = `${year + 1}-01-01`

    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const buckets: MonthlyTrendItem[] = months.map((m) => ({ label: `${m}月`, income: 0, expense: 0 }))

    const { data, error } = await supabase
      .from('v_transactions_monthly_totals')
      .select('month,income,expense')
      .gte('month', start)
      .lt('month', end)
      .order('month', { ascending: true })

    if (!error) {
      const map = new Map<string, { income: number; expense: number }>()
      for (const row of data ?? []) {
        map.set(String(row.month), { income: Number(row.income ?? 0), expense: Number(row.expense ?? 0) })
      }
      for (let i = 0; i < 12; i++) {
        const key = monthKey(year, i + 1)
        const hit = map.get(key)
        if (hit) {
          buckets[i] = { label: `${i + 1}月`, income: hit.income, expense: hit.expense }
        }
      }
      monthlyTrendData.value = buckets
      loading.value = false
      return
    }

    if ((error as any)?.code !== '42P01') {
      loading.value = false
      errorMessage.value = error.message
      return
    }

    const startDt = new Date(year, 0, 1)
    const endDt = new Date(year + 1, 0, 1)
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('type,amount,occurred_at')
      .gte('occurred_at', startDt.toISOString())
      .lt('occurred_at', endDt.toISOString())
      .order('occurred_at', { ascending: true })

    loading.value = false
    if (txErr) {
      errorMessage.value = txErr.message
      monthlyTrendData.value = buckets
      return
    }

    for (const t of tx ?? []) {
      const d = new Date(t.occurred_at)
      if (d.getFullYear() !== year) continue
      const idx = d.getMonth()
      const amt = Number(t.amount ?? 0)
      if (t.type === 'income') buckets[idx]!.income += amt
      if (t.type === 'expense') buckets[idx]!.expense += amt
    }
    monthlyTrendData.value = buckets
  }

  async function loadMonthTransactions() {
    if (!user.value) return
    const y = selectedYear.value
    const m = selectedMonth.value
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 1)

    const { data, error } = await supabase
      .from('transactions')
      .select('id,type,amount,occurred_at,category,note')
      .gte('occurred_at', start.toISOString())
      .lt('occurred_at', end.toISOString())
      .order('occurred_at', { ascending: false })

    if (error) {
      errorMessage.value = error.message
      monthTx.value = []
      return
    }
    monthTx.value = (data ?? []) as TxRow[]
  }

  async function loadMonthCategoryExpenses() {
    if (!user.value) return
    const month = monthDateStr.value
    const { data, error } = await supabase
      .from('v_transactions_monthly_category_expense')
      .select('category,expense')
      .eq('month', month)
      .order('expense', { ascending: false })
      .limit(12)

    if (!error) {
      monthCategoryExpenses.value = (data ?? []).map((r) => ({ category: String((r as any).category), expense: Number((r as any).expense ?? 0) }))
      return
    }

    if ((error as any)?.code !== '42P01') {
      errorMessage.value = error.message
      monthCategoryExpenses.value = []
      return
    }

    const map: Record<string, number> = {}
    for (const t of monthTx.value) {
      if (t.type !== 'expense') continue
      const key = t.category || '未分类'
      map[key] = (map[key] ?? 0) + Number(t.amount ?? 0)
    }
    monthCategoryExpenses.value = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([category, expense]) => ({ category, expense }))
  }

  async function reloadForYear() {
    if (!user.value) return
    await Promise.all([loadMonthlyTrend(), loadYearBudgets()])
  }

  async function reloadForMonth() {
    if (!user.value) return
    await loadMonthTransactions()
    await loadMonthCategoryExpenses()
  }

  watch(
    user,
    async (u) => {
      if (!u) {
        loading.value = false
        errorMessage.value = null
        monthTx.value = []
        monthlyTrendData.value = []
        monthCategoryExpenses.value = []
        yearBudgets.value = {}
        budgetLoading.value = false
        budgetSaving.value = false
        budgetError.value = null
        return
      }
      await reloadForYear()
      await reloadForMonth()
    },
    { immediate: true }
  )

  watch([monthBudget, monthExpense, monthDateStr, user], () => {
    if (!user.value) return
    if (monthBudget.value <= 0) return
    if (monthExpense.value <= monthBudget.value) return
    if (budgetAlertMonth.value === monthDateStr.value) return
    budgetAlertMonth.value = monthDateStr.value
    toast({
      title: '预算超支',
      description: `本月支出 ¥${monthExpense.value.toFixed(2)} 已超过预算 ¥${monthBudget.value.toFixed(2)}`,
      variant: 'default',
      durationMs: 2400,
    })
  })

  watch(selectedYear, async () => {
    if (!user.value) return
    await reloadForYear()
    await reloadForMonth()
  })

  watch(selectedMonth, async () => {
    if (!user.value) return
    await reloadForMonth()
  })

  return {
    loading,
    errorMessage,
    selectedYear,
    selectedMonth,
    monthTx,
    monthlyTrendData,
    monthCategoryExpenses,
    yearBudgets,
    budgetLoading,
    budgetSaving,
    budgetError,
    monthDateStr,
    monthBudget,
    monthExpense,
    updateBudget,
    persistBudget,
    reloadForYear,
    reloadForMonth,
  }
}
