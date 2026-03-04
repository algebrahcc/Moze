import { computed } from 'vue'

export function useDashboardSummary() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  const accountsCount = ref<number | null>(null)
  const monthExpense = ref<number | null>(null)
  const monthIncome = ref<number | null>(null)
  const snapshots30Count = ref<number | null>(null)
  const recentTransactions = ref<any[]>([])
  const netAssets = ref<number | null>(null)
  const todayPnl = ref<number | null>(null)
  const assetTrendPoints = ref<any[]>([])
  const accountBreakdown = ref<{ type: string; value: number }[]>([])
  const topExpenses = ref<any[]>([])
  const monthBudget = ref<number | null>(null)

  const trendChartType = ref<'line' | 'stacked' | 'donut'>('line')
  const categoryChartType = ref<'line' | 'stacked' | 'donut'>('donut')

  const monthlyTrendData = ref<any[]>([])
  const categoryData = ref<any[]>([])

  function labelForAccountType(t: string) {
    if (t === 'cash') return '现金'
    if (t === 'credit') return '信用'
    if (t === 'stock') return '股票'
    return '其他'
  }

  function startOfMonthIso() {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return start.toISOString()
  }

  function startOfYearIso() {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    return start.toISOString()
  }

  function isoDateDaysAgo(days: number) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().slice(0, 10)
  }

  async function loadSummary() {
    if (!user.value) return
    loading.value = true
    errorMessage.value = null

    const monthStart = startOfMonthIso()
    const yearStart = startOfYearIso()
    const todayIso = new Date().toISOString().slice(0, 10)

    const { data: accountsData, error: aErr } = await supabase
      .from('accounts')
      .select('id,type,is_archived')
      .eq('is_archived', false)

    if (aErr) {
      loading.value = false
      errorMessage.value = aErr.message
      return
    }

    const accountIds = (accountsData ?? []).map((a) => a.id)
    const stockIds = (accountsData ?? []).filter((a) => a.type === 'stock').map((a) => a.id)

    const [
      { data: txData, error: txErr },
      { count: sCount, error: sErr },
      { data: recentTx, error: rTxErr },
      { data: yearTx, error: yTxErr },
      { data: allTx, error: allTxErr },
      { data: latestSnapshots, error: latestErr },
      { data: trendSnapshots, error: trendErr },
      { data: todaySnapshots, error: todayErr },
      { data: budgetData, error: budgetErr }
    ] = await Promise.all([
      supabase
        .from('transactions')
        .select('type,amount,occurred_at,category,account_id,to_account_id')
        .gte('occurred_at', monthStart)
        .order('occurred_at', { ascending: false }),
      supabase
        .from('asset_snapshots')
        .select('id', { count: 'exact', head: true })
        .gte('date', isoDateDaysAgo(30)),
      supabase
        .from('transactions')
        .select(`
          id, type, amount, category, occurred_at,
          account:accounts!transactions_account_id_fkey(name),
          to_account:accounts!transactions_to_account_id_fkey(name)
        `)
        .order('occurred_at', { ascending: false })
        .limit(5),
      supabase
        .from('transactions')
        .select('type,amount,occurred_at')
        .gte('occurred_at', yearStart)
        .order('occurred_at', { ascending: true }),
      supabase
        .from('transactions')
        .select('type,amount,account_id,to_account_id')
        .order('occurred_at', { ascending: true }),
      stockIds.length
        ? supabase
            .from('asset_snapshots')
            .select('account_id,date,total_value,daily_pnl')
            .in('account_id', stockIds)
            .order('date', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      stockIds.length
        ? supabase
            .from('asset_snapshots')
            .select('account_id,date,total_value')
            .in('account_id', stockIds)
            .gte('date', isoDateDaysAgo(30))
            .order('date', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      stockIds.length
        ? supabase
            .from('asset_snapshots')
            .select('account_id,date,daily_pnl')
            .in('account_id', stockIds)
            .eq('date', todayIso)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('budgets')
        .select('amount')
        .eq('month', monthStart.slice(0, 10))
        .maybeSingle()
    ])

    loading.value = false

    if (txErr || sErr || rTxErr || yTxErr || allTxErr || latestErr || trendErr || todayErr || budgetErr) {
      errorMessage.value =
        txErr?.message ||
        sErr?.message ||
        rTxErr?.message ||
        yTxErr?.message ||
        allTxErr?.message ||
        latestErr?.message ||
        trendErr?.message ||
        todayErr?.message ||
        budgetErr?.message ||
        '读取失败'
      return
    }

    accountsCount.value = accountIds.length
    snapshots30Count.value = sCount ?? 0
    recentTransactions.value = recentTx ?? []
    monthBudget.value = budgetData?.amount ? Number(budgetData.amount) : null

    let expense = 0
    let income = 0
    let todayExpense = 0
    let todayIncome = 0
    const catMap: Record<string, number> = {}
    const expensesList: any[] = []

    for (const row of txData ?? []) {
      const amt = Number(row.amount ?? 0)
      const txDate = new Date(row.occurred_at).toISOString().slice(0, 10)
      if (row.type === 'expense') {
        expense += amt
        if (txDate === todayIso) todayExpense += amt
        const cat = row.category || '无分类'
        catMap[cat] = (catMap[cat] || 0) + amt
        expensesList.push({
          ...row,
          amount: amt
        })
      }
      if (row.type === 'income') {
        income += amt
        if (txDate === todayIso) todayIncome += amt
      }
    }
    monthExpense.value = expense
    monthIncome.value = income

    topExpenses.value = expensesList.sort((a, b) => b.amount - a.amount).slice(0, 5)

    const balances: Record<string, number> = {}
    for (const id of accountIds) balances[id] = 0
    for (const row of allTx ?? []) {
      const amt = Number(row.amount ?? 0)
      if (row.type === 'expense') {
        balances[row.account_id] = (balances[row.account_id] ?? 0) - amt
      }
      if (row.type === 'income') {
        balances[row.account_id] = (balances[row.account_id] ?? 0) + amt
      }
      if (row.type === 'transfer') {
        balances[row.account_id] = (balances[row.account_id] ?? 0) - amt
        if (row.to_account_id) {
          balances[row.to_account_id] = (balances[row.to_account_id] ?? 0) + amt
        }
      }
    }

    const latestMap: Record<string, { total: number; daily: number | null }> = {}
    for (const row of latestSnapshots ?? []) {
      if (!latestMap[row.account_id]) {
        latestMap[row.account_id] = {
          total: Number(row.total_value ?? 0),
          daily: row.daily_pnl === null ? null : Number(row.daily_pnl ?? 0),
        }
      }
    }

    let stockTotal = 0
    for (const id of stockIds) {
      stockTotal += latestMap[id]?.total ?? 0
    }

    const cashTotal = accountIds
      .filter((id) => !stockIds.includes(id))
      .reduce((sum, id) => sum + (balances[id] ?? 0), 0)

    netAssets.value = cashTotal + stockTotal

    const todayStockPnl = (todaySnapshots ?? []).reduce((sum, r) => sum + Number(r.daily_pnl ?? 0), 0)
    todayPnl.value = todayIncome - todayExpense + todayStockPnl

    const typeTotals: Record<string, number> = {}
    for (const a of accountsData ?? []) {
      if (a.type === 'stock') {
        typeTotals[a.type] = (typeTotals[a.type] ?? 0) + (latestMap[a.id]?.total ?? 0)
      } else {
        typeTotals[a.type] = (typeTotals[a.type] ?? 0) + (balances[a.id] ?? 0)
      }
    }
    accountBreakdown.value = Object.entries(typeTotals).map(([type, value]) => ({ type, value }))

    const trendMap: Record<string, number> = {}
    for (const row of trendSnapshots ?? []) {
      const key = row.date
      trendMap[key] = (trendMap[key] ?? 0) + Number(row.total_value ?? 0)
    }

    assetTrendPoints.value = Object.entries(trendMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({
        x: date.slice(5),
        y: value,
        series: '净资产'
      }))

    categoryData.value = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6)

    const monthsMap: Record<string, { income: number; expense: number }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthsMap[key] = { income: 0, expense: 0 }
    }

    for (const row of yearTx ?? []) {
      const date = new Date(row.occurred_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (monthsMap[key]) {
        const amt = Number(row.amount ?? 0)
        if (row.type === 'income') monthsMap[key].income += amt
        if (row.type === 'expense') monthsMap[key].expense += amt
      }
    }

    monthlyTrendData.value = Object.entries(monthsMap).map(([k, v]) => ({
      label: k.slice(5) + '月',
      ...v
    }))
  }

  const trendColors = ['#22c55e', '#ef4444'] as const
  const trendLegendItems = computed(() => ([
    { label: '收入', color: trendColors[0] },
    { label: '支出', color: trendColors[1] },
  ]))

  const trendPlotData = computed(() => {
    if (trendChartType.value === 'donut') {
      const incomeTotal = monthlyTrendData.value.reduce((sum, d) => sum + d.income, 0)
      const expenseTotal = monthlyTrendData.value.reduce((sum, d) => sum + d.expense, 0)
      return [
        { type: '收入', value: incomeTotal },
        { type: '支出', value: expenseTotal },
      ]
    }
    return monthlyTrendData.value.flatMap((d) => ([
      { x: d.label, y: d.income, series: '收入' },
      { x: d.label, y: d.expense, series: '支出' },
    ]))
  })

  const categoryPalette = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#f97316', '#f43f5e']

  const categoryPlotData = computed(() => {
    if (categoryChartType.value === 'donut') {
      return categoryData.value.map((d) => ({ type: d[0], value: d[1] }))
    }
    if (categoryChartType.value === 'stacked') {
      return categoryData.value.map((d) => ({ x: '支出', y: d[1], series: d[0] }))
    }
    return categoryData.value.map((d) => ({ x: d[0], y: d[1], series: '支出' }))
  })

  const categoryLegendItems = computed(() => {
    return categoryData.value.map((d, idx) => ({
      label: String(d[0]),
      color: categoryPalette[idx % categoryPalette.length] ?? categoryPalette[0] ?? '#2563eb',
    }))
  })

  const categoryLegendForPlot = computed(() => {
    if (categoryChartType.value === 'line') {
      return [{ label: '支出', color: categoryPalette[0] ?? '#2563eb' }]
    }
    return categoryLegendItems.value
  })

  const budgetUsagePercent = computed(() => {
    if (!monthBudget.value || monthExpense.value === null) return 0
    const percent = (monthExpense.value / monthBudget.value) * 100
    return Math.min(100, Math.max(0, percent))
  })

  watchEffect(() => {
    if (user.value) loadSummary()
  })

  return {
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
    loadSummary,
  }
}
