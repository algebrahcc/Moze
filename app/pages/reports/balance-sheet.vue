<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { useAccountsStore } from '@/stores/accounts'
import { storeToRefs } from 'pinia'

const accountsStore = useAccountsStore()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { groupedAccounts } = storeToRefs(accountsStore)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const balances = ref<Record<string, number>>({})

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)

function endOfMonth(y: number, m: number) {
  return new Date(y, m, 0, 23, 59, 59)
}
function prevMonthDate(y: number, m: number) {
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return endOfMonth(d.getFullYear(), d.getMonth() + 1)
}
function sameMonthLastYear(y: number, m: number) {
  return endOfMonth(y - 1, m)
}

async function loadBalancesAt(date: Date) {
  if (!user.value) return {}
  const { data: accounts } = await supabase.from('accounts').select('id,type').eq('is_archived', false)
  const ids = (accounts ?? []).map((a: any) => a.id)
  const stockIds = (accounts ?? []).filter((a: any) => a.type === 'stock').map((a: any) => a.id)

  const [{ data: txRows }, { data: snaps }] = await Promise.all([
    supabase.from('transactions').select('type,amount,account_id,to_account_id,occurred_at').lte('occurred_at', date.toISOString()),
    stockIds.length
      ? supabase.from('asset_snapshots').select('account_id,date,total_value').in('account_id', stockIds).lte('date', date.toISOString()).order('date', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const map: Record<string, number> = {}
  for (const id of ids) map[id] = 0
  for (const row of txRows ?? []) {
    const amt = Number(row.amount ?? 0)
    if (row.type === 'expense') map[row.account_id] = (map[row.account_id] ?? 0) - amt
    if (row.type === 'income') map[row.account_id] = (map[row.account_id] ?? 0) + amt
    if (row.type === 'transfer') {
      map[row.account_id] = (map[row.account_id] ?? 0) - amt
      if (row.to_account_id) map[row.to_account_id] = (map[row.to_account_id] ?? 0) + amt
    }
  }
  const latest: Record<string, number> = {}
  for (const row of snaps ?? []) {
    if (latest[row.account_id] === undefined) latest[row.account_id] = Number(row.total_value ?? 0)
  }
  for (const id of stockIds) {
    if (latest[id] !== undefined) map[id] = latest[id]
  }
  return map
}

const currentBalances = ref<Record<string, number>>({})
const previousBalances = ref<Record<string, number>>({})
const yoyBalances = ref<Record<string, number>>({})

const totalAssets = computed(() => Object.values(currentBalances.value).filter(v => v > 0).reduce((a, b) => a + b, 0))
const totalLiabilities = computed(() => Object.values(currentBalances.value).filter(v => v < 0).reduce((a, b) => a + Math.abs(b), 0))
const netWorth = computed(() => totalAssets.value - totalLiabilities.value)

const prevAssets = computed(() => Object.values(previousBalances.value).filter(v => v > 0).reduce((a, b) => a + b, 0))
const prevLiabilities = computed(() => Object.values(previousBalances.value).filter(v => v < 0).reduce((a, b) => a + Math.abs(b), 0))
const prevNet = computed(() => prevAssets.value - prevLiabilities.value)

const yoyAssets = computed(() => Object.values(yoyBalances.value).filter(v => v > 0).reduce((a, b) => a + b, 0))
const yoyLiabilities = computed(() => Object.values(yoyBalances.value).filter(v => v < 0).reduce((a, b) => a + Math.abs(b), 0))
const yoyNet = computed(() => yoyAssets.value - yoyLiabilities.value)

const deltaNetMoM = computed(() => netWorth.value - prevNet.value)
const deltaNetYoY = computed(() => netWorth.value - yoyNet.value)
const pctMoM = computed(() => prevNet.value !== 0 ? (deltaNetMoM.value / Math.abs(prevNet.value)) * 100 : 0)
const pctYoY = computed(() => yoyNet.value !== 0 ? (deltaNetYoY.value / Math.abs(yoyNet.value)) * 100 : 0)

async function reload() {
  if (!user.value) return
  loading.value = true
  errorMessage.value = null
  const end = endOfMonth(selectedYear.value, selectedMonth.value)
  const prev = prevMonthDate(selectedYear.value, selectedMonth.value)
  const same = sameMonthLastYear(selectedYear.value, selectedMonth.value)
  try {
    currentBalances.value = await loadBalancesAt(end)
    previousBalances.value = await loadBalancesAt(prev)
    yoyBalances.value = await loadBalancesAt(same)
    balances.value = currentBalances.value
  } catch (e: any) {
    errorMessage.value = e?.message || '加载失败'
  }
  loading.value = false
}

onMounted(async () => {
  await reload()
})
</script>

<template>
  <div class="space-y-8 pb-10">
    <div class="flex items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:wallet" :size="24" class="text-primary" />
          <h1 class="text-3xl font-bold tracking-tight">资产负债表</h1>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">按账户分组汇总资产与负债，计算净资产</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="relative">
          <select v-model="selectedYear" class="h-10 appearance-none rounded-xl border border-border/50 bg-background/50 pl-4 pr-10 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary">
            <option v-for="y in [selectedYear, selectedYear-1, selectedYear-2, selectedYear-3, selectedYear-4]" :key="y" :value="y">{{ y }}年</option>
          </select>
          <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <div class="relative">
          <select v-model="selectedMonth" @change="reload" class="h-10 appearance-none rounded-xl border border-border/50 bg-background/50 pl-4 pr-10 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary">
            <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
          </select>
          <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-border/50 bg-card/60 p-4">
        <div class="text-xs text-muted-foreground">总资产</div>
        <div class="text-2xl font-bold font-numeric text-red-600">¥{{ totalAssets.toFixed(2) }}</div>
      </div>
      <div class="rounded-2xl border border-border/50 bg-card/60 p-4">
        <div class="text-xs text-muted-foreground">总负债</div>
        <div class="text-2xl font-bold font-numeric text-emerald-600">¥{{ totalLiabilities.toFixed(2) }}</div>
      </div>
      <div class="rounded-2xl border border-border/50 bg-card/60 p-4">
        <div class="text-xs text-muted-foreground">净资产</div>
        <div class="text-2xl font-bold font-numeric">¥{{ netWorth.toFixed(2) }}</div>
      </div>
      <div class="rounded-2xl border border-border/50 bg-card/60 p-4">
        <div class="text-xs text-muted-foreground">本期/上期</div>
        <div class="text-2xl font-bold font-numeric" :class="deltaNetMoM >= 0 ? 'text-red-600' : 'text-emerald-600'">
          {{ deltaNetMoM >= 0 ? '+' : '' }}¥{{ deltaNetMoM.toFixed(2) }}
        </div>
        <div class="text-xs text-muted-foreground">环比 {{ pctMoM.toFixed(1) }}%</div>
      </div>
      <div class="rounded-2xl border border-border/50 bg-card/60 p-4">
        <div class="text-xs text-muted-foreground">本期/去年同期</div>
        <div class="text-2xl font-bold font-numeric" :class="deltaNetYoY >= 0 ? 'text-red-600' : 'text-emerald-600'">
          {{ deltaNetYoY >= 0 ? '+' : '' }}¥{{ deltaNetYoY.toFixed(2) }}
        </div>
        <div class="text-xs text-muted-foreground">同比 {{ pctYoY.toFixed(1) }}%</div>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
      {{ errorMessage }}
    </div>
    <div v-else-if="loading" class="flex items-center justify-center py-16 text-muted-foreground">
      <AppIcon name="lucide:loader-2" :size="32" class="animate-spin opacity-50" />
    </div>
    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <AppIcon name="lucide:wallet" :size="16" />
            <span class="text-sm font-semibold">日常账户</span>
          </div>
        </div>
        <div class="space-y-3">
          <div v-for="acc in groupedAccounts.daily" :key="acc.id" class="flex items-center justify-between text-sm">
            <span class="font-medium">{{ acc.name }}</span>
            <span :class="(balances[acc.id] ?? 0) >= 0 ? 'text-red-600' : 'text-emerald-600' " class="font-numeric">{{ (balances[acc.id] ?? 0).toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <AppIcon name="lucide:trending-up" :size="16" />
            <span class="text-sm font-semibold">投资账户</span>
          </div>
        </div>
        <div class="space-y-3">
          <div v-for="acc in groupedAccounts.investment" :key="acc.id" class="flex items-center justify-between text-sm">
            <span class="font-medium">{{ acc.name }}</span>
            <span :class="(balances[acc.id] ?? 0) >= 0 ? 'text-red-600' : 'text-emerald-600' " class="font-numeric">{{ (balances[acc.id] ?? 0).toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <AppIcon name="lucide:home" :size="16" />
            <span class="text-sm font-semibold">固定资产</span>
          </div>
        </div>
        <div class="space-y-3">
          <div v-for="acc in groupedAccounts.fixed" :key="acc.id" class="flex items-center justify-between text-sm">
            <span class="font-medium">{{ acc.name }}</span>
            <span :class="(balances[acc.id] ?? 0) >= 0 ? 'text-red-600' : 'text-emerald-600' " class="font-numeric">{{ (balances[acc.id] ?? 0).toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl md:col-span-2 lg:col-span-3">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <AppIcon name="lucide:credit-card" :size="16" />
            <span class="text-sm font-semibold">负债账户</span>
          </div>
        </div>
        <div class="space-y-3">
          <div v-for="acc in groupedAccounts.liability" :key="acc.id" class="flex items-center justify-between text-sm">
            <span class="font-medium">{{ acc.name }}</span>
            <span class="font-numeric text-emerald-600">{{ Math.abs(balances[acc.id] ?? 0).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
