<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { Button } from '@/components/ui/button'
import { useRecurringStore, type RecurringTransaction, type RecurringFrequency } from '@/stores/recurring'
import { storeToRefs } from 'pinia'

const recurringStore = useRecurringStore()
const { rules, loading } = storeToRefs(recurringStore)

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Form State
const createOpen = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)

// Edit State
const editOpen = ref(false)
const editing = ref(false)
const editError = ref<string | null>(null)
const editId = ref<string | null>(null)

// Fields
const type = ref<'expense' | 'income' | 'transfer'>('expense')
const amount = ref('')
const note = ref('')
const categoryParentId = ref('')
const categoryChildId = ref('')
const accountId = ref('')
const toAccountId = ref('')
const frequency = ref<RecurringFrequency>('monthly')
const interval = ref(1)
const startDate = ref(formatDate(new Date()))
const endDate = ref('')

// Data for Selects
const accounts = ref<{id: string, name: string, currency: string}[]>([])
const categories = ref<{id: string, name: string, parent_id: string | null}[]>([])

// Load dependencies
onMounted(async () => {
  if (user.value) {
    await recurringStore.loadRules()
    
    const { data: accs } = await supabase.from('accounts').select('id,name,currency').eq('is_archived', false)
    if (accs) accounts.value = accs
    
    const { data: cats } = await supabase.from('categories').select('id,name,parent_id')
    if (cats) categories.value = cats
  }
})

const parents = computed(() => categories.value.filter(c => !c.parent_id))
const children = computed(() => {
  if (!categoryParentId.value) return []
  return categories.value.filter(c => c.parent_id === categoryParentId.value)
})

function getCategoryName(id?: string | null) {
  if (!id) return '-'
  const c = categories.value.find(x => x.id === id)
  return c ? c.name : '-'
}

function getAccountName(id: string) {
  const a = accounts.value.find(x => x.id === id)
  return a ? a.name : '-'
}

function resetForm() {
  type.value = 'expense'
  amount.value = ''
  note.value = ''
  categoryParentId.value = ''
  categoryChildId.value = ''
  accountId.value = accounts.value[0]?.id || ''
  toAccountId.value = ''
  frequency.value = 'monthly'
  interval.value = 1
  startDate.value = formatDate(new Date())
  endDate.value = ''
  createError.value = null
  editError.value = null
}

function openCreate() {
  resetForm()
  createOpen.value = true
}

function openEdit(rule: RecurringTransaction) {
  resetForm()
  editId.value = rule.id
  type.value = rule.type
  amount.value = rule.amount.toString()
  note.value = rule.note || ''
  accountId.value = rule.account_id
  toAccountId.value = rule.to_account_id || ''
  frequency.value = rule.frequency
  interval.value = rule.interval
  startDate.value = rule.start_date
  endDate.value = rule.end_date || ''
  
  if (rule.category_id) {
    const c = categories.value.find(x => x.id === rule.category_id)
    if (c) {
      if (c.parent_id) {
        categoryParentId.value = c.parent_id
        categoryChildId.value = c.id
      } else {
        categoryParentId.value = c.id
      }
    }
  }
  
  editOpen.value = true
}

async function submitCreate() {
  if (!user.value) return
  creating.value = true
  createError.value = null
  
  const finalCatId = categoryChildId.value || categoryParentId.value || null
  const finalCatName = finalCatId ? categories.value.find(c => c.id === finalCatId)?.name : null
  
  const payload = {
    user_id: user.value.id,
    type: type.value,
    amount: Number(amount.value),
    currency: accounts.value.find(a => a.id === accountId.value)?.currency || 'CNY',
    category_id: type.value === 'transfer' ? null : finalCatId,
    category: type.value === 'transfer' ? null : finalCatName,
    note: note.value || null,
    account_id: accountId.value,
    to_account_id: type.value === 'transfer' ? toAccountId.value : null,
    frequency: frequency.value,
    interval: Number(interval.value),
    start_date: startDate.value,
    next_run_date: startDate.value, // First run is start date
    end_date: endDate.value || null,
    is_active: true
  }
  
  const err = await recurringStore.createRule(payload as any)
  creating.value = false
  
  if (err) {
    createError.value = err.message
  } else {
    createOpen.value = false
  }
}

async function submitEdit() {
  if (!user.value || !editId.value) return
  editing.value = true
  editError.value = null
  
  const finalCatId = categoryChildId.value || categoryParentId.value || null
  const finalCatName = finalCatId ? categories.value.find(c => c.id === finalCatId)?.name : null
  
  const payload = {
    type: type.value,
    amount: Number(amount.value),
    category_id: type.value === 'transfer' ? null : finalCatId,
    category: type.value === 'transfer' ? null : finalCatName,
    note: note.value || null,
    account_id: accountId.value,
    to_account_id: type.value === 'transfer' ? toAccountId.value : null,
    frequency: frequency.value,
    interval: Number(interval.value),
    start_date: startDate.value,
    end_date: endDate.value || null,
    // Note: editing doesn't auto-reset next_run_date unless logic requires it. 
    // Usually we keep next_run_date as is, unless start_date is moved to future?
    // For simplicity, let's leave next_run_date alone.
  }
  
  const err = await recurringStore.updateRule(editId.value, payload as any)
  editing.value = false
  
  if (err) {
    editError.value = err.message
  } else {
    editOpen.value = false
  }
}

async function toggleActive(rule: RecurringTransaction) {
  await recurringStore.updateRule(rule.id, { is_active: !rule.is_active })
}

async function deleteRule(id: string) {
  if (confirm('确定删除此规则吗？历史生成的交易不会受影响。')) {
    await recurringStore.deleteRule(id)
  }
}

function frequencyLabel(f: RecurringFrequency, i: number) {
  const unit = f === 'daily' ? '天' : f === 'weekly' ? '周' : f === 'monthly' ? '月' : '年'
  return `每 ${i} ${unit}`
}

function formatDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:repeat" :size="20" class="text-primary" />
          <h1 class="text-2xl font-semibold tracking-tight">周期性交易</h1>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">设置自动记账规则，如房租、订阅费、固定工资等</p>
      </div>
      <Button @click="openCreate">
        <AppIcon name="lucide:plus" :size="16" class="mr-2" />
        新建规则
      </Button>
    </div>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-32 animate-pulse rounded-xl bg-muted/50" />
    </div>

    <div v-else-if="!rules.length" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/5 py-12 text-center">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
        <AppIcon name="lucide:calendar" :size="24" />
      </div>
      <h3 class="text-lg font-semibold">暂无规则</h3>
      <p class="mt-2 text-sm text-muted-foreground">添加您的第一条自动记账规则</p>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div 
        v-for="rule in rules" 
        :key="rule.id" 
        class="group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-5 transition-all hover:shadow-lg"
        :class="{ 'opacity-60 grayscale': !rule.is_active }"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl" :class="rule.type === 'expense' ? 'bg-emerald-500/10 text-emerald-600' : rule.type === 'income' ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'">
              <AppIcon :name="rule.type === 'expense' ? 'lucide:arrow-down-right' : rule.type === 'income' ? 'lucide:arrow-up-right' : 'lucide:arrow-right-left'" :size="20" />
            </div>
            <div>
              <div class="font-bold text-lg font-numeric">¥{{ rule.amount.toFixed(2) }}</div>
              <div class="text-xs text-muted-foreground">{{ frequencyLabel(rule.frequency, rule.interval) }}</div>
            </div>
          </div>
          <div class="flex items-center gap-1">
             <button @click="toggleActive(rule)" class="text-xs font-medium px-2 py-1 rounded-md transition-colors" :class="rule.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'">
               {{ rule.is_active ? '运行中' : '已暂停' }}
             </button>
          </div>
        </div>
        
        <div class="space-y-1 text-sm text-muted-foreground/80 mb-4">
          <div class="flex items-center gap-2">
            <AppIcon name="lucide:tag" :size="14" />
            <span>{{ rule.type === 'transfer' ? '转账' : (getCategoryName(rule.category_id) || '无分类') }}</span>
          </div>
          <div class="flex items-center gap-2">
            <AppIcon name="lucide:wallet" :size="14" />
            <span>{{ getAccountName(rule.account_id) }} {{ rule.to_account_id ? '→ ' + getAccountName(rule.to_account_id) : '' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <AppIcon name="lucide:clock" :size="14" />
            <span>下次执行: {{ rule.next_run_date }}</span>
          </div>
        </div>
        
        <div class="flex items-center justify-end gap-2 border-t border-border/40 pt-3 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="sm" @click="openEdit(rule)">编辑</Button>
          <Button variant="ghost" size="sm" class="text-destructive hover:text-destructive hover:bg-destructive/10" @click="deleteRule(rule.id)">删除</Button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="createOpen || editOpen" class="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-4 backdrop-blur-sm md:items-center" @click.self="createOpen = false; editOpen = false">
      <div class="w-full max-w-lg rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl backdrop-blur-xl md:p-8 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <div class="text-xs font-medium uppercase tracking-wider text-primary">{{ editOpen ? '编辑' : '新建' }}</div>
            <div class="mt-1 text-2xl font-bold tracking-tight text-foreground">周期性规则</div>
          </div>
          <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="createOpen = false; editOpen = false">
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>

        <div class="space-y-4">
          <!-- Type -->
          <div class="grid grid-cols-3 gap-2 p-1 bg-muted/50 rounded-xl">
            <button type="button" v-for="t in ['expense', 'income', 'transfer']" :key="t" @click="type = t as any" class="py-2 text-sm font-medium rounded-lg transition-all" :class="type === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'">
              {{ t === 'expense' ? '支出' : t === 'income' ? '收入' : '转账' }}
            </button>
          </div>

          <!-- Amount -->
          <div>
            <label class="text-xs font-medium uppercase text-muted-foreground">金额</label>
            <input v-model="amount" type="number" class="mt-1 h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-lg font-bold" placeholder="0.00" />
          </div>

          <!-- Category (if not transfer) -->
          <div v-if="type !== 'transfer'" class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-medium uppercase text-muted-foreground">一级分类</label>
              <select v-model="categoryParentId" class="mt-1 h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3">
                <option value="">请选择</option>
                <option v-for="c in parents" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-muted-foreground">二级分类</label>
              <select v-model="categoryChildId" class="mt-1 h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3">
                <option value="">请选择</option>
                <option v-for="c in children" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>

          <!-- Account -->
          <div class="grid gap-4" :class="type === 'transfer' ? 'grid-cols-2' : ''">
            <div>
              <label class="text-xs font-medium uppercase text-muted-foreground">{{ type === 'transfer' ? '转出账户' : '账户' }}</label>
              <select v-model="accountId" class="mt-1 h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3">
                <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
              </select>
            </div>
            <div v-if="type === 'transfer'">
              <label class="text-xs font-medium uppercase text-muted-foreground">转入账户</label>
              <select v-model="toAccountId" class="mt-1 h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3">
                <option value="">请选择</option>
                <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
              </select>
            </div>
          </div>

          <!-- Frequency -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-medium uppercase text-muted-foreground">重复频率</label>
              <select v-model="frequency" class="mt-1 h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3">
                <option value="daily">每天</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
                <option value="yearly">每年</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-muted-foreground">间隔 (每x{{ frequency === 'daily' ? '天' : frequency === 'weekly' ? '周' : frequency === 'monthly' ? '月' : '年' }})</label>
              <input v-model="interval" type="number" min="1" class="mt-1 h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4" />
            </div>
          </div>

          <!-- Date -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-medium uppercase text-muted-foreground">开始日期</label>
              <input v-model="startDate" type="date" class="mt-1 h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3" />
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-muted-foreground">结束日期 (可选)</label>
              <input v-model="endDate" type="date" class="mt-1 h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3" />
            </div>
          </div>

          <!-- Note -->
          <div>
            <label class="text-xs font-medium uppercase text-muted-foreground">备注</label>
            <input v-model="note" class="mt-1 h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4" placeholder="自动记账备注" />
          </div>
          
          <div v-if="createError || editError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {{ createError || editError }}
          </div>

          <div class="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" class="border-border/50" @click="createOpen = false; editOpen = false">取消</Button>
            <Button type="button" class="shadow-lg shadow-primary/20" :disabled="creating || editing || !amount" @click="editOpen ? submitEdit() : submitCreate()">
              {{ editing || creating ? '处理中...' : '保存规则' }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
