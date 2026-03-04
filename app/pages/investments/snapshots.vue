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
  <div class="space-y-8">
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:trending-up" :size="18" class="text-muted-foreground" />
          <h1 class="text-2xl font-semibold tracking-tight">
            投资账户净值
          </h1>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">
          按日期记录总资产与净入金，自动计算盈亏
        </p>
      </div>
    </div>

    <Card>
      <CardHeader class="text-sm font-medium">
        录入快照
      </CardHeader>
      <CardContent>
        <div v-if="accountsError" class="mb-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          读取账户失败：{{ accountsError }}
        </div>

        <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitSnapshot">
          <div class="space-y-3">
            <label class="text-sm font-medium">
              股票账户
            </label>
            <select
              v-model="accountId"
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            >
              <option v-for="a in accounts" :key="a.id" :value="a.id">
                {{ a.name }}
              </option>
            </select>
            <div v-if="!accounts.length && !accountsError" class="text-sm text-muted-foreground">
              暂无股票账户，请先在“账户”中创建 type=stock 的账户。
            </div>
          </div>

          <div class="space-y-3">
            <label class="text-sm font-medium">
              日期
            </label>
            <input
              v-model="date"
              type="date"
              required
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
          </div>

          <div class="space-y-3">
            <label class="text-sm font-medium">
              当日总资产
            </label>
            <input
              v-model="totalValue"
              inputmode="decimal"
              required
              placeholder="例如 120000"
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
          </div>

          <div class="space-y-3">
            <label class="text-sm font-medium">
              当日净入金
            </label>
            <input
              v-model="netDeposit"
              inputmode="decimal"
              placeholder="默认 0"
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
            <div class="text-sm text-muted-foreground">
              银证转入为正，转出为负；用于修正盈亏计算
            </div>
          </div>

          <div class="md:col-span-2 flex flex-col gap-2">
            <Button :disabled="submitting || !accountId || !totalValue">
              {{ submitting ? '保存中...' : '保存' }}
            </Button>
            <div v-if="submitOk" class="text-sm text-muted-foreground">
              已保存。
            </div>
            <div v-if="submitError" class="text-sm text-destructive">
              保存失败：{{ submitError }}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle>最近记录</CardTitle>
          <div class="flex items-center gap-3">
            <div class="hidden h-8 w-28 md:block">
              <Sparkline :points="trendPoints" class="text-primary" />
            </div>
            <div class="flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 p-1 text-xs">
              <button
                type="button"
                class="px-2 py-1 rounded-md transition"
                :class="trendRange === 30 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                @click="trendRange = 30"
              >
                30天
              </button>
              <button
                type="button"
                class="px-2 py-1 rounded-md transition"
                :class="trendRange === 90 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                @click="trendRange = 90"
              >
                90天
              </button>
            </div>
            <Button variant="outline" size="sm" :disabled="recalculating || !accountId" @click="recalcDailyPnl">
              {{ recalculating ? '计算中...' : '重新计算盈亏' }}
            </Button>
          </div>
        </div>
        <div v-if="recalcOk" class="mt-2 text-xs text-green-600">已重新计算。</div>
        <div v-if="recalcError" class="mt-2 text-xs text-destructive">计算失败：{{ recalcError }}</div>
      </CardHeader>
      <CardContent>
        <div v-if="!user" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/5 py-12 text-center">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AppIcon name="lucide:lock" :size="24" class="opacity-50" />
          </div>
          <p class="mt-4 text-sm text-muted-foreground">请先登录后查看净值记录。</p>
        </div>

        <div v-else-if="recentError" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          加载失败：{{ recentError }}
        </div>

        <div v-else-if="!recent.length" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/5 py-12 text-center">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AppIcon name="lucide:trending-up" :size="24" class="opacity-50" />
          </div>
          <h3 class="mt-4 text-lg font-semibold">暂无记录</h3>
          <p class="mt-2 text-sm text-muted-foreground max-w-sm">
            录入一条快照后会显示在这里。
          </p>
        </div>

        <div v-else class="overflow-hidden rounded-xl border border-border/50">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th class="px-6 py-3 font-medium tracking-wider">日期</th>
                  <th class="px-6 py-3 font-medium tracking-wider text-right">总资产</th>
                  <th class="px-6 py-3 font-medium tracking-wider text-right">当日盈亏</th>
                  <th class="hidden px-6 py-3 font-medium tracking-wider text-right md:table-cell">净入金</th>
                  <th class="hidden px-6 py-3 font-medium tracking-wider text-right md:table-cell">累计盈亏</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/50 bg-card">
                <tr v-for="r in computedRecent.slice(0, 30)" :key="r.id" class="group transition-colors hover:bg-muted/50">
                  <td class="px-6 py-4 tabular-nums text-muted-foreground">
                    {{ r.date }}
                  </td>
                  <td class="px-6 py-4 text-right font-medium tabular-nums text-foreground">
                    {{ r.totalValueNum.toFixed(2) }}
                  </td>
                  <td class="px-6 py-4 text-right tabular-nums font-medium" 
                    :class="{
                      'text-destructive': (r.dailyPnl ?? 0) < 0,
                      'text-green-600': (r.dailyPnl ?? 0) > 0,
                      'text-muted-foreground': (r.dailyPnl ?? 0) === 0
                    }"
                  >
                    {{ r.dailyPnl === null ? '—' : (r.dailyPnl > 0 ? '+' : '') + r.dailyPnl.toFixed(2) }}
                  </td>
                  <td class="hidden px-6 py-4 text-right tabular-nums text-muted-foreground md:table-cell">
                    {{ r.netDepositNum.toFixed(2) }}
                  </td>
                  <td class="hidden px-6 py-4 text-right tabular-nums font-medium md:table-cell"
                    :class="{
                      'text-destructive': r.cumulativePnl < 0,
                      'text-green-600': r.cumulativePnl > 0,
                      'text-muted-foreground': r.cumulativePnl === 0
                    }"
                  >
                    {{ (r.cumulativePnl > 0 ? '+' : '') + r.cumulativePnl.toFixed(2) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
