import { defineStore } from 'pinia'

export type AccountType = 'cash' | 'credit' | 'stock'

export type Account = {
  id: string
  name: string
  type: AccountType
  currency: string
  is_archived: boolean
  created_at: string
}

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])
  const balances = ref<Record<string, number>>({})
  const latestSnapshots = ref<Record<string, number>>({})
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  const visibleAccounts = computed(() => accounts.value.filter((a) => !a.is_archived))

  async function load() {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    if (!user.value) return

    loading.value = true
    errorMessage.value = null

    const { data, error } = await supabase
      .from('accounts')
      .select('id,name,type,currency,is_archived,created_at')
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

    const map: Record<string, number> = {}
    for (const id of accountIds) map[id] = 0
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

    const latest: Record<string, number> = {}
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
    loading.value = false
    errorMessage.value = null
  }

  return { accounts, visibleAccounts, balances, latestSnapshots, loading, errorMessage, load, loadBalances, clear }
})

