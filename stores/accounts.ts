import { defineStore } from 'pinia'
import { useExchangeStore } from './exchange'

export type AccountType = 'cash' | 'credit' | 'stock'
export type AccountGroup = 'daily' | 'investment' | 'fixed' | 'liability'

export const ASSET_CLASSES = [
  { value: 'equities', label: '权益类 (Equities)' },
  { value: 'fixed_income', label: '固收类 (Fixed Income)' },
  { value: 'cash', label: '现金类 (Cash)' },
  { value: 'real_estate', label: '房地产 (Real Estate)' },
  { value: 'alternatives', label: '另类投资 (Alternatives)' },
  { value: 'crypto', label: '加密货币 (Crypto)' },
  { value: 'other', label: '其他 (Other)' },
] as const

export type AssetClass = typeof ASSET_CLASSES[number]['value']

export type Account = {
  id: string
  name: string
  type: AccountType
  account_group: AccountGroup
  credit_limit?: number | null
  statement_date?: number | null
  payment_due_date?: number | null
  currency: string
  is_archived: boolean
  asset_class?: 'equities' | 'fixed_income' | 'cash' | 'real_estate' | 'alternatives' | 'crypto' | 'other' | null
  created_at: string
}

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])
  const balances = ref<Record<string, number>>({})
  const latestSnapshots = ref<Record<string, number>>({})
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  const visibleAccounts = computed(() => accounts.value.filter((a) => !a.is_archived))
  
  const groupedAccounts = computed(() => {
    const groups: Record<AccountGroup, Account[]> = {
      daily: [],
      investment: [],
      fixed: [],
      liability: []
    }
    for (const acc of visibleAccounts.value) {
      const g = acc.account_group || 'daily' // fallback
      if (groups[g]) groups[g].push(acc)
      else groups.daily.push(acc)
    }
    return groups
  })

  const exchange = useExchangeStore()

  const totalAssets = computed(() => {
    let sum = 0
    for (const acc of visibleAccounts.value) {
      const bal = getBalance(acc.id)
      const val = bal > 0 ? exchange.convert(bal, acc.currency as any) : 0
      if (val > 0) sum += val
    }
    return sum
  })

  const totalLiabilities = computed(() => {
    let sum = 0
    for (const acc of visibleAccounts.value) {
      const bal = getBalance(acc.id)
      const val = bal < 0 ? exchange.convert(bal, acc.currency as any) : 0
      if (val < 0) sum += Math.abs(val)
    }
    return sum
  })

  const netWorth = computed(() => totalAssets.value - totalLiabilities.value)

  function getBalance(id: string) {
    // For stock accounts, prefer latest snapshot value if available
    const acc = accounts.value.find(a => a.id === id)
    if (acc?.type === 'stock') {
      return latestSnapshots.value[id] ?? balances.value[id] ?? 0
    }
    return balances.value[id] ?? 0
  }

  async function load() {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    if (!user.value) return

    loading.value = true
    errorMessage.value = null

    const { data, error } = await supabase
      .from('accounts')
      .select('id,name,type,account_group,credit_limit,statement_date,payment_due_date,currency,is_archived,asset_class,created_at')
      .order('is_archived', { ascending: true })
      .order('type', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      loading.value = false
      errorMessage.value = error.message
      accounts.value = []
      balances.value = {}
      latestSnapshots.value = {}
      return
    }

    accounts.value = (data ?? []) as Account[]
    await loadBalances()
    loading.value = false
  }

  async function loadBalances() {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    if (!user.value || !accounts.value.length) {
      balances.value = {}
      latestSnapshots.value = {}
      return
    }

    const accountIds = accounts.value.map((a) => a.id)
    const stockIds = accounts.value.filter((a) => a.type === 'stock').map((a) => a.id)

    // Parallel fetch transactions and snapshots
    const [{ data: txRows, error: txErr }, { data: snapshotRows, error: snapErr }] = await Promise.all([
      supabase.from('transactions').select('type,amount,account_id,to_account_id').order('occurred_at', { ascending: true }),
      stockIds.length
        ? supabase.from('asset_snapshots').select('account_id,date,total_value').in('account_id', stockIds).order('date', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ])

    if (txErr || snapErr) {
      errorMessage.value = txErr?.message || snapErr?.message || '读取余额失败'
      return
    }

    // Calculate balances from transactions
    const map: Record<string, number> = {}
    for (const id of accountIds) map[id] = 0
    
    // We need to calculate balance for ALL accounts first
    for (const row of txRows ?? []) {
      const amt = Number(row.amount ?? 0)
      if (row.type === 'expense') map[row.account_id] = (map[row.account_id] ?? 0) - amt
      if (row.type === 'income') map[row.account_id] = (map[row.account_id] ?? 0) + amt
      if (row.type === 'transfer') {
        map[row.account_id] = (map[row.account_id] ?? 0) - amt
        if (row.to_account_id) map[row.to_account_id] = (map[row.to_account_id] ?? 0) + amt
      }
    }

    balances.value = map

    // Store latest snapshots
    const latest: Record<string, number> = {}
    // snapshotRows is ordered by date desc, so first one for each account is latest
    for (const row of snapshotRows ?? []) {
      if (latest[row.account_id] === undefined) {
        latest[row.account_id] = Number(row.total_value ?? 0)
      }
    }
    latestSnapshots.value = latest
  }

  function clear() {
    accounts.value = []
    balances.value = {}
    latestSnapshots.value = {}
  }

  return { 
    accounts, 
    balances, 
    latestSnapshots, 
    loading, 
    errorMessage, 
    visibleAccounts,
    groupedAccounts,
    totalAssets,
    totalLiabilities,
    netWorth,
    load, 
    loadBalances, 
    clear,
    getBalance
  }
})
