import { defineStore } from 'pinia'

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type RecurringTransaction = {
  id: string
  type: 'expense' | 'income' | 'transfer'
  amount: number
  currency: string
  category_id?: string | null
  category?: string | null
  note?: string | null
  account_id: string
  to_account_id?: string | null
  frequency: RecurringFrequency
  interval: number
  start_date: string
  next_run_date: string
  end_date?: string | null
  last_run_date?: string | null
  is_active: boolean
  created_at: string
}

export const useRecurringStore = defineStore('recurring', () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  
  const rules = ref<RecurringTransaction[]>([])
  const loading = ref(false)
  const processing = ref(false)

  function formatDate(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  function parseDate(base: string) {
    const parts = base.split('-')
    const y = Number(parts[0] || 0)
    const m = Number(parts[1] || 1)
    const d = Number(parts[2] || 1)
    return { y, m, d }
  }

  function addDays(base: string, days: number) {
    const { y, m, d } = parseDate(base)
    const dt = new Date(y, m - 1, d)
    dt.setDate(dt.getDate() + days)
    return formatDate(dt)
  }

  function addMonths(base: string, months: number) {
    const { y, m, d } = parseDate(base)
    const dt = new Date(y, m - 1, d)
    dt.setMonth(dt.getMonth() + months)
    return formatDate(dt)
  }

  function addYears(base: string, years: number) {
    const { y, m, d } = parseDate(base)
    const dt = new Date(y, m - 1, d)
    dt.setFullYear(dt.getFullYear() + years)
    return formatDate(dt)
  }

  async function loadRules() {
    if (!user.value) return
    loading.value = true
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .order('next_run_date', { ascending: true })
    
    if (!error && data) {
      rules.value = data.map(r => ({
        ...r,
        amount: Number(r.amount)
      })) as RecurringTransaction[]
    }
    loading.value = false
  }

  // Calculate next run date based on frequency and interval
  function calculateNextRun(currentRun: string, frequency: RecurringFrequency, interval: number): string {
    switch (frequency) {
      case 'daily': return addDays(currentRun, interval)
      case 'weekly': return addDays(currentRun, interval * 7)
      case 'monthly': return addMonths(currentRun, interval)
      case 'yearly': return addYears(currentRun, interval)
      default: return addDays(currentRun, 1)
    }
  }

  async function processDueRules() {
    if (!user.value || processing.value) return
    processing.value = true
    
    // Reload to get latest state
    await loadRules()
    
    const today = formatDate(new Date())
    const dueRules = rules.value.filter(r => r.is_active && r.next_run_date <= today)
    
    let processedCount = 0
    
    for (const rule of dueRules) {
      // Loop to catch up if missed multiple periods (e.g. offline for a month)
      // Limit to 12 iterations to prevent infinite loops or massive spam
      let currentRunDate = rule.next_run_date
      let iterations = 0
      
      while (currentRunDate <= today && iterations < 12) {
        // 1. Create Transaction
        const { error: txError } = await supabase.from('transactions').insert({
          user_id: user.value.id,
          type: rule.type,
          amount: rule.amount,
          currency: rule.currency,
          category_id: rule.category_id,
          category: rule.category,
          note: `[自动] ${rule.note || ''}`.trim(),
          account_id: rule.account_id,
          to_account_id: rule.to_account_id,
          occurred_at: new Date(currentRunDate + 'T12:00:00Z').toISOString(), // Noon UTC
        })
        
        if (txError) {
          console.error('Failed to execute recurring rule:', rule.id, txError)
          break // Stop processing this rule if error
        }
        
        // Update loop vars
        iterations++
        processedCount++
        
        // Calculate next
        const nextDate = calculateNextRun(currentRunDate, rule.frequency, rule.interval)
        currentRunDate = nextDate
        
        // Check end date
        if (rule.end_date && currentRunDate > rule.end_date) {
          // Rule expired
          await supabase.from('recurring_transactions').update({
            is_active: false,
            last_run_date: today // Mark as run
          }).eq('id', rule.id)
          break
        }
      }
      
      // 2. Update Rule next_run_date
      if (iterations > 0) {
        await supabase.from('recurring_transactions').update({
          last_run_date: today,
          next_run_date: currentRunDate
        }).eq('id', rule.id)
      }
    }
    
    processing.value = false
    if (processedCount > 0) {
      // Reload rules to reflect updates
      await loadRules()
      return processedCount
    }
    return 0
  }

  async function createRule(payload: Omit<RecurringTransaction, 'id' | 'created_at' | 'last_run_date'>) {
    const { error } = await supabase.from('recurring_transactions').insert(payload)
    if (!error) await loadRules()
    return error
  }

  async function updateRule(id: string, payload: Partial<RecurringTransaction>) {
    const { error } = await supabase.from('recurring_transactions').update(payload).eq('id', id)
    if (!error) await loadRules()
    return error
  }

  async function deleteRule(id: string) {
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id)
    if (!error) await loadRules()
    return error
  }

  return {
    rules,
    loading,
    processing,
    loadRules,
    processDueRules,
    createRule,
    updateRule,
    deleteRule
  }
})
