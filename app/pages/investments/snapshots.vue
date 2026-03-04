<script setup lang="ts">
type StockAccount = {
  id: string
  name: string
}

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const accounts = ref<StockAccount[]>([])
const accountsError = ref<string | null>(null)

const accountId = ref<string>('')
const date = ref<string>(new Date().toISOString().slice(0, 10))
const totalValue = ref<string>('')
const netDeposit = ref<string>('0')

const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitOk = ref(false)

type SnapshotRow = {
  id: string
  date: string
  total_value: string
  net_deposit: string
  daily_pnl: string | null
}

const recent = ref<SnapshotRow[]>([])
const recentError = ref<string | null>(null)
const trendRange = ref<30 | 90>(30)
const recalculating = ref(false)
const recalcError = ref<string | null>(null)
const recalcOk = ref(false)

const computedRecent = computed(() => {
  const rows = [...recent.value]
    .map((r) => ({
      ...r,
      totalValueNum: Number(r.total_value ?? 0),
      netDepositNum: Number(r.net_deposit ?? 0),
    }))
    .filter((r) => Number.isFinite(r.totalValueNum) && Number.isFinite(r.netDepositNum))
    .sort((a, b) => a.date.localeCompare(b.date))

  let cum = 0
  const out = rows.map((r, idx) => {
    const prev = rows[idx - 1]
    const daily = prev ? r.totalValueNum - prev.totalValueNum - r.netDepositNum : null
    if (daily !== null && Number.isFinite(daily)) cum += daily
    return {
      ...r,
      dailyPnl: daily,
      cumulativePnl: cum,
    }
  })

  return out.sort((a, b) => b.date.localeCompare(a.date))
})

const trendPoints = computed(() => {
  const rows = computedRecent.value.slice().reverse()
  return rows.slice(-trendRange.value).map((r) => r.totalValueNum)
})

async function loadStockAccounts() {
  accountsError.value = null
  const { data, error } = await supabase
    .from('accounts')
    .select('id,name')
    .eq('type', 'stock')
    .order('name', { ascending: true })

  if (error) {
    accountsError.value = error.message
    accounts.value = []
    return
  }

  accounts.value = (data ?? []) as StockAccount[]
  if (!accountId.value && accounts.value.length) {
    accountId.value = accounts.value[0]!.id
  }
}

async function loadRecent() {
  if (!user.value || !accountId.value) return
  recentError.value = null

  const { data, error } = await supabase
    .from('asset_snapshots')
    .select('id,date,total_value,net_deposit,daily_pnl')
    .eq('account_id', accountId.value)
    .order('date', { ascending: false })
    .limit(90)

  if (error) {
    recentError.value = error.message
    recent.value = []
    return
  }

  recent.value = (data ?? []) as SnapshotRow[]
}

async function submitSnapshot() {
  if (!user.value) {
    submitError.value = '请先登录后再录入净值。'
    return
  }
  submitError.value = null
  submitOk.value = false
  submitting.value = true

  const payload = {
    account_id: accountId.value,
    date: date.value,
    total_value: Number(totalValue.value),
    net_deposit: Number(netDeposit.value || 0),
  }

  const { data: inserted, error } = await supabase
    .from('asset_snapshots')
    .insert(payload)
    .select('id,date,total_value,net_deposit')
    .single()

  submitting.value = false

  if (error) {
    submitError.value = error.message
    return
  }

  if (inserted) {
    const { data: prevRows } = await supabase
      .from('asset_snapshots')
      .select('total_value,date')
      .eq('account_id', accountId.value)
      .lt('date', inserted.date)
      .order('date', { ascending: false })
      .limit(1)

    const prevTotal = prevRows?.length ? Number((prevRows as any[])[0]?.total_value ?? 0) : null
    const curTotal = Number((inserted as any).total_value ?? 0)
    const curDeposit = Number((inserted as any).net_deposit ?? 0)
    const daily = prevTotal === null ? null : curTotal - prevTotal - curDeposit

    if (daily !== null && Number.isFinite(daily)) {
      await supabase.from('asset_snapshots').update({ daily_pnl: daily }).eq('id', (inserted as any).id)
    }
  }

  submitOk.value = true
  await loadRecent()
}

async function recalcDailyPnl() {
  if (!user.value || !accountId.value) return
  recalcError.value = null
  recalcOk.value = false
  recalculating.value = true

  const { data, error } = await supabase
    .from('asset_snapshots')
    .select('id,date,total_value,net_deposit,daily_pnl')
    .eq('account_id', accountId.value)
    .order('date', { ascending: true })

  if (error) {
    recalculating.value = false
    recalcError.value = error.message
    return
  }

  const rows = (data ?? []).map((r) => ({
    id: r.id,
    date: r.date,
    total: Number(r.total_value ?? 0),
    deposit: Number(r.net_deposit ?? 0),
    daily: r.daily_pnl === null ? null : Number(r.daily_pnl ?? 0),
  }))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const prev = i > 0 ? rows[i - 1]! : null
    const daily = prev ? row.total - prev.total - row.deposit : null
    const shouldUpdate = daily !== row.daily
    if (shouldUpdate) {
      const { error: updateErr } = await supabase
        .from('asset_snapshots')
        .update({ daily_pnl: daily })
        .eq('id', row.id)
      if (updateErr) {
        recalculating.value = false
        recalcError.value = updateErr.message
        return
      }
    }
  }

  recalculating.value = false
  recalcOk.value = true
  await loadRecent()
}

onMounted(loadStockAccounts)

watchEffect(() => {
  if (user.value && accountId.value) {
    loadRecent()
  } else {
    recent.value = []
  }
})
</script>

<template>
  <div class="space-y-8 pb-10">
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:trending-up" :size="24" class="text-primary" />
          <h1 class="text-3xl font-bold tracking-tight text-foreground/90">
            投资账户净值
          </h1>
        </div>
        <p class="mt-2 text-base text-muted-foreground">
          按日期记录总资产与净入金，自动计算盈亏
        </p>
      </div>
    </div>

    <div class="grid gap-8 lg:grid-cols-3">
      <!-- Input Form -->
      <Card class="lg:col-span-1 h-fit border-border/50 bg-card/60 shadow-xl backdrop-blur-xl">
        <CardHeader class="border-b border-border/40 pb-4">
          <CardTitle class="text-lg font-medium flex items-center gap-2">
            <AppIcon name="lucide:pen-line" :size="18" class="text-primary" />
            录入快照
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-6">
          <div v-if="accountsError" class="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            读取账户失败：{{ accountsError }}
          </div>

          <form class="space-y-5" @submit.prevent="submitSnapshot">
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                股票账户
              </label>
              <div class="relative">
                <select
                  v-model="accountId"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                >
                  <option v-for="a in accounts" :key="a.id" :value="a.id">
                    {{ a.name }}
                  </option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              <div v-if="!accounts.length && !accountsError" class="text-xs text-muted-foreground">
                暂无股票账户，请先在“账户”中创建 type=stock 的账户。
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                日期
              </label>
              <div class="relative">
                <input
                  v-model="date"
                  type="date"
                  required
                  class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                >
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                当日总资产
              </label>
              <div class="relative">
                <input
                  v-model="totalValue"
                  inputmode="decimal"
                  required
                  placeholder="0.00"
                  class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary font-numeric"
                >
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                当日净入金
              </label>
              <div class="relative">
                <input
                  v-model="netDeposit"
                  inputmode="decimal"
                  placeholder="默认 0"
                  class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary font-numeric"
                >
              </div>
              <div class="text-[10px] text-muted-foreground">
                银证转入为正，转出为负；用于修正盈亏计算
              </div>
            </div>

            <div class="pt-2 flex flex-col gap-3">
              <Button class="w-full shadow-lg shadow-primary/20" :disabled="submitting || !accountId || !totalValue">
                {{ submitting ? '保存中...' : '保存快照' }}
              </Button>
              
              <div v-if="submitOk" class="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 py-2 text-xs font-medium text-green-600 dark:text-green-400">
                <AppIcon name="lucide:check-circle" :size="14" />
                已保存
              </div>
              <div v-if="submitError" class="flex items-center justify-center gap-2 rounded-lg bg-destructive/10 py-2 text-xs font-medium text-destructive">
                <AppIcon name="lucide:alert-circle" :size="14" />
                保存失败：{{ submitError }}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <!-- History List -->
      <Card class="lg:col-span-2 overflow-hidden border-border/50 bg-card/60 shadow-xl backdrop-blur-xl">
        <CardHeader class="border-b border-border/40 pb-4">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle class="text-lg font-medium flex items-center gap-2">
              <AppIcon name="lucide:history" :size="18" class="text-primary" />
              历史记录
            </CardTitle>
            <div class="flex flex-wrap items-center gap-3">
              <div class="hidden h-8 w-32 md:block opacity-70">
                <Sparkline :points="trendPoints" class="text-primary" />
              </div>
              <div class="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-1 text-xs backdrop-blur-md">
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-md transition-all font-medium"
                  :class="trendRange === 30 ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                  @click="trendRange = 30"
                >
                  30天
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-md transition-all font-medium"
                  :class="trendRange === 90 ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                  @click="trendRange = 90"
                >
                  90天
                </button>
              </div>
              <Button variant="outline" size="sm" class="h-8 text-xs border-border/50 bg-background/50 hover:bg-background" :disabled="recalculating || !accountId" @click="recalcDailyPnl">
                <AppIcon name="lucide:refresh-cw" :size="12" class="mr-1.5" :class="{ 'animate-spin': recalculating }" />
                {{ recalculating ? '计算中...' : '重算盈亏' }}
              </Button>
            </div>
          </div>
          <div v-if="recalcOk" class="mt-2 text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
            <AppIcon name="lucide:check" :size="12" /> 已重新计算
          </div>
          <div v-if="recalcError" class="mt-2 text-xs font-medium text-destructive flex items-center gap-1">
            <AppIcon name="lucide:alert-circle" :size="12" /> {{ recalcError }}
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <div v-if="!user" class="flex flex-col items-center justify-center py-16 text-center">
            <AppIcon name="lucide:lock" :size="48" class="mb-4 text-muted-foreground/30" />
            <p class="text-sm text-muted-foreground">请先登录后查看净值记录。</p>
          </div>

          <div v-else-if="recentError" class="m-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <div class="flex items-center gap-2 font-semibold">
              <AppIcon name="lucide:alert-circle" :size="16" />
              加载失败
            </div>
            <p class="mt-1 opacity-90">{{ recentError }}</p>
          </div>

          <div v-else-if="!recent.length" class="flex flex-col items-center justify-center py-16 text-center">
            <EmptyStateIllustration class="mb-6 w-40 opacity-50 grayscale" />
            <h3 class="text-lg font-medium text-foreground/80">暂无记录</h3>
            <p class="mt-2 text-sm text-muted-foreground">
              录入一条快照后会显示在这里。
            </p>
          </div>

          <div v-else class="relative w-full overflow-auto">
            <table class="w-full caption-bottom text-sm text-left">
              <thead class="bg-muted/30 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                <tr>
                  <th class="h-10 px-6 py-3">日期</th>
                  <th class="h-10 px-6 py-3 text-right">总资产</th>
                  <th class="h-10 px-6 py-3 text-right">当日盈亏</th>
                  <th class="hidden h-10 px-6 py-3 text-right md:table-cell">净入金</th>
                  <th class="hidden h-10 px-6 py-3 text-right md:table-cell">累计盈亏</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/30">
                <tr v-for="r in computedRecent.slice(0, 30)" :key="r.id" class="transition-colors hover:bg-muted/40">
                  <td class="px-6 py-4 tabular-nums text-muted-foreground font-medium">
                    {{ r.date }}
                  </td>
                  <td class="px-6 py-4 text-right font-bold tabular-nums font-numeric text-foreground">
                    {{ r.totalValueNum.toFixed(2) }}
                  </td>
                  <td class="px-6 py-4 text-right tabular-nums font-bold font-numeric" 
                    :class="{
                      'text-destructive': (r.dailyPnl ?? 0) < 0,
                      'text-emerald-600 dark:text-emerald-400': (r.dailyPnl ?? 0) > 0,
                      'text-muted-foreground': (r.dailyPnl ?? 0) === 0
                    }"
                  >
                    {{ r.dailyPnl === null ? '—' : (r.dailyPnl > 0 ? '+' : '') + r.dailyPnl.toFixed(2) }}
                  </td>
                  <td class="hidden px-6 py-4 text-right tabular-nums font-numeric text-muted-foreground md:table-cell">
                    {{ r.netDepositNum.toFixed(2) }}
                  </td>
                  <td class="hidden px-6 py-4 text-right tabular-nums font-bold font-numeric md:table-cell"
                    :class="{
                      'text-destructive': r.cumulativePnl < 0,
                      'text-emerald-600 dark:text-emerald-400': r.cumulativePnl > 0,
                      'text-muted-foreground': r.cumulativePnl === 0
                    }"
                  >
                    {{ (r.cumulativePnl > 0 ? '+' : '') + r.cumulativePnl.toFixed(2) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
