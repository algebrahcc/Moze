<script setup lang="ts">
import AppIcon from '../../../../components/AppIcon.vue'
import EmptyStateIllustration from '../../../../components/illustrations/EmptyStateIllustration.vue'

type TxType = 'expense' | 'income' | 'transfer'

type AccountOption = {
  id: string
  name: string
  type: string
  currency: string
}

type TxRow = {
  id: string
  type: TxType
  amount: string
  currency: string
  category_id?: string | null
  category: string | null
  note: string | null
  occurred_at: string
  account_id?: string | null
  to_account_id?: string | null
  account?: {
    name: string
    type: string
    currency: string
  } | null
  to_account?: {
    name: string
    type: string
    currency: string
  } | null
}

type Category = {
  id: string
  parent_id: string | null
  name: string
}

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const txs = ref<TxRow[]>([])

const accounts = ref<AccountOption[]>([])
const accountsError = ref<string | null>(null)

const categories = ref<Category[]>([])
const categoriesError = ref<string | null>(null)

const createOpen = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)

const txType = ref<TxType>('expense')
const accountId = ref<string>('')
const toAccountId = ref<string>('')
const amount = ref<string>('')
const note = ref<string>('')
const occurredAt = ref<string>(new Date().toISOString().slice(0, 10))

const categoryParentId = ref<string>('')
const categoryChildId = ref<string>('')

const categoryCreateOpen = ref(false)
const categoryCreating = ref(false)
const categoryCreateError = ref<string | null>(null)
const categoryCreateName = ref('')
const categoryCreateParentId = ref<string>('')

const editOpen = ref(false)
const editing = ref(false)
const editError = ref<string | null>(null)
const editId = ref<string | null>(null)
const editType = ref<TxType>('expense')
const editAccountId = ref<string>('')
const editToAccountId = ref<string>('')
const editAmount = ref<string>('')
const editNote = ref<string>('')
const editOccurredAt = ref<string>(new Date().toISOString().slice(0, 10))
const editCategoryParentId = ref<string>('')
const editCategoryChildId = ref<string>('')

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const deleteTarget = ref<TxRow | null>(null)

function labelForTxType(t: TxType) {
  if (t === 'expense') return '支出'
  if (t === 'income') return '收入'
  return '转账'
}

function iconForTxType(t: TxType) {
  if (t === 'expense') return 'lucide:arrow-down-right'
  if (t === 'income') return 'lucide:arrow-up-right'
  return 'lucide:repeat'
}

function categoryLabel(id?: string | null) {
  if (!id) return null
  const c = categories.value.find((x) => x.id === id)
  if (!c) return null
  if (!c.parent_id) return c.name
  const p = categories.value.find((x) => x.id === c.parent_id)
  return p ? `${p.name} / ${c.name}` : c.name
}

function selectedCategoryId() {
  if (categoryChildId.value) return categoryChildId.value
  if (categoryParentId.value) return categoryParentId.value
  return null
}

function selectedEditCategoryId() {
  if (editCategoryChildId.value) return editCategoryChildId.value
  if (editCategoryParentId.value) return editCategoryParentId.value
  return null
}

function resetCreateForm() {
  txType.value = 'expense'
  amount.value = ''
  note.value = ''
  occurredAt.value = new Date().toISOString().slice(0, 10)
  toAccountId.value = ''
  categoryParentId.value = ''
  categoryChildId.value = ''
}

function ensureTransferTarget() {
  if (txType.value !== 'transfer') return
  if (!accounts.value.length) return
  if (!accountId.value) {
    accountId.value = accounts.value[0]!.id
  }
  if (toAccountId.value && toAccountId.value !== accountId.value) return
  const candidate = accounts.value.find((a) => a.id !== accountId.value)
  if (candidate) {
    toAccountId.value = candidate.id
  }
}

function resetEditForm() {
  editId.value = null
  editType.value = 'expense'
  editAccountId.value = ''
  editToAccountId.value = ''
  editAmount.value = ''
  editNote.value = ''
  editOccurredAt.value = new Date().toISOString().slice(0, 10)
  editCategoryParentId.value = ''
  editCategoryChildId.value = ''
}

async function loadAccounts() {
  if (!user.value) return
  accountsError.value = null
  const { data, error } = await supabase
    .from('accounts')
    .select('id,name,type,currency')
    .eq('is_archived', false)
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    accountsError.value = error.message
    accounts.value = []
    return
  }

  accounts.value = (data ?? []) as AccountOption[]
  if (!accountId.value && accounts.value.length) {
    accountId.value = accounts.value[0]!.id
  }
  if (!toAccountId.value && accounts.value.length) {
    toAccountId.value = accounts.value[0]!.id
  }
}

async function loadCategories() {
  if (!user.value) return
  categoriesError.value = null
  const { data, error } = await supabase
    .from('categories')
    .select('id,parent_id,name')
    .order('parent_id', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    categoriesError.value = error.message
    categories.value = []
    return
  }

  categories.value = (data ?? []) as Category[]
}

async function loadTransactions() {
  if (!user.value) return
  errorMessage.value = null
  loading.value = true

  const { data, error } = await supabase
    .from('transactions')
    .select('id,type,amount,currency,category_id,category,note,occurred_at,account_id,to_account_id,account:accounts!transactions_account_id_fkey(name,type,currency),to_account:accounts!transactions_to_account_id_fkey(name,type,currency)')
    .order('occurred_at', { ascending: false })
    .limit(50)

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    txs.value = []
    return
  }

  txs.value = (data ?? []) as TxRow[]
}

async function createTransaction() {
  if (!user.value) return
  createError.value = null
  creating.value = true

  if (txType.value === 'transfer') {
    if (!toAccountId.value) {
      creating.value = false
      createError.value = '请选择转入账户。'
      return
    }
    if (toAccountId.value === accountId.value) {
      creating.value = false
      createError.value = '转入账户不能与转出账户相同。'
      return
    }
    const fromCur = accounts.value.find((a) => a.id === accountId.value)?.currency
    const toCur = accounts.value.find((a) => a.id === toAccountId.value)?.currency
    if (fromCur && toCur && fromCur !== toCur) {
      creating.value = false
      createError.value = '暂不支持不同币种账户之间转账。'
      return
    }
  }

  const categoryId = selectedCategoryId()
  const categoryName = txType.value === 'transfer' ? null : (categoryLabel(categoryId) ?? null)
  const payload = {
    account_id: accountId.value,
    to_account_id: txType.value === 'transfer' ? toAccountId.value : null,
    type: txType.value,
    amount: Number(amount.value),
    currency: accounts.value.find((a) => a.id === accountId.value)?.currency ?? 'CNY',
    category_id: txType.value === 'transfer' ? null : categoryId,
    category: categoryName,
    note: note.value.trim() || null,
    occurred_at: new Date(`${occurredAt.value}T12:00:00Z`).toISOString(),
  }

  const { error } = await supabase.from('transactions').insert(payload)
  creating.value = false

  if (error) {
    createError.value = error.message
    return
  }

  resetCreateForm()
  createOpen.value = false
  await loadTransactions()
}

async function createCategory() {
  if (!user.value) return
  categoryCreateError.value = null
  categoryCreating.value = true

  const payload = {
    parent_id: categoryCreateParentId.value || null,
    name: categoryCreateName.value.trim(),
  }

  const { error } = await supabase.from('categories').insert(payload)
  categoryCreating.value = false

  if (error) {
    categoryCreateError.value = error.message
    return
  }

  categoryCreateOpen.value = false
  categoryCreateName.value = ''
  categoryCreateParentId.value = ''
  await loadCategories()
}

function openEdit(t: TxRow) {
  editId.value = t.id
  editType.value = t.type
  editAccountId.value = (t as any).account_id ?? accountId.value
  editToAccountId.value = t.to_account_id ?? toAccountId.value
  editAmount.value = String(t.amount ?? '')
  editNote.value = t.note ?? ''
  editOccurredAt.value = new Date(t.occurred_at).toISOString().slice(0, 10)

  if (t.type === 'transfer') {
    editCategoryParentId.value = ''
    editCategoryChildId.value = ''
  } else if (t.category_id) {
    const c = categories.value.find((x) => x.id === t.category_id)
    if (c?.parent_id) {
      editCategoryParentId.value = c.parent_id
      editCategoryChildId.value = c.id
    } else {
      editCategoryParentId.value = t.category_id
      editCategoryChildId.value = ''
    }
  } else {
    editCategoryParentId.value = ''
    editCategoryChildId.value = ''
  }

  editError.value = null
  editOpen.value = true
}

async function saveEdit() {
  if (!user.value || !editId.value) return
  editError.value = null
  editing.value = true

  if (editType.value === 'transfer') {
    if (!editToAccountId.value) {
      editing.value = false
      editError.value = '请选择转入账户。'
      return
    }
    if (editToAccountId.value === editAccountId.value) {
      editing.value = false
      editError.value = '转入账户不能与转出账户相同。'
      return
    }
  }

  const payload = {
    type: editType.value,
    account_id: editAccountId.value,
    to_account_id: editType.value === 'transfer' ? editToAccountId.value : null,
    amount: Number(editAmount.value),
    currency: accounts.value.find((a) => a.id === editAccountId.value)?.currency ?? 'CNY',
    category_id: editType.value === 'transfer' ? null : selectedEditCategoryId(),
    category: editType.value === 'transfer' ? null : (categoryLabel(selectedEditCategoryId()) ?? null),
    note: editNote.value.trim() || null,
    occurred_at: new Date(`${editOccurredAt.value}T12:00:00Z`).toISOString(),
  }

  const { error } = await supabase.from('transactions').update(payload).eq('id', editId.value)
  editing.value = false

  if (error) {
    editError.value = error.message
    return
  }

  editOpen.value = false
  resetEditForm()
  await loadTransactions()
}

function requestDelete(t: TxRow) {
  deleteTarget.value = t
  deleteError.value = null
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!user.value || !deleteTarget.value) return
  deleting.value = true
  deleteError.value = null

  const { error } = await supabase.from('transactions').delete().eq('id', deleteTarget.value.id)
  deleting.value = false

  if (error) {
    deleteError.value = error.message
    return
  }

  deleteOpen.value = false
  deleteTarget.value = null
  await loadTransactions()
}

watchEffect(() => {
  if (!user.value) {
    txs.value = []
    accounts.value = []
    categories.value = []
    return
  }
  loadAccounts()
  loadCategories()
  loadTransactions()
})

watch([txType, accountId, accounts], () => {
  ensureTransferTarget()
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:arrow-right-left" :size="18" class="text-muted-foreground" />
          <h1 class="text-2xl font-semibold tracking-tight">
            收支
          </h1>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">
          支出/收入/转账
        </p>
      </div>
      <Button @click="createOpen = true">
        <span class="inline-flex items-center gap-2">
          <AppIcon name="lucide:plus" :size="16" />
          记一笔
        </span>
      </Button>
    </div>

    <Card>
      <CardHeader class="text-sm font-medium">
        交易列表
      </CardHeader>
      <CardContent>
        <div v-if="!user" class="rounded-xl border border-dashed border-border/70 bg-background/40 p-8 text-sm text-muted-foreground">
          请先登录后查看流水。
        </div>

        <div v-else-if="errorMessage" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          加载失败：{{ errorMessage }}
        </div>

        <div v-else-if="loading" class="rounded-xl border border-border/70 bg-background/40 p-8 text-sm text-muted-foreground">
          加载中...
        </div>

    <div v-else>
       <div v-if="!txs.length" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/5 py-12 text-center">
         <EmptyStateIllustration class="mb-6 w-48 opacity-50" />
         <h3 class="text-lg font-semibold">暂无收支记录</h3>
         <p class="mt-2 text-sm text-muted-foreground max-w-sm">
           你还没有记录任何交易。点击右上角“记一笔”开始。
         </p>
       </div>

       <Card v-else class="overflow-hidden">
         <div class="overflow-x-auto">
           <table class="w-full text-sm text-left">
             <thead class="bg-muted/50 text-xs uppercase text-muted-foreground">
               <tr>
                 <th class="px-6 py-3 font-medium tracking-wider">类型/分类</th>
                 <th class="px-6 py-3 font-medium tracking-wider">账户</th>
                 <th class="px-6 py-3 font-medium tracking-wider text-right">金额</th>
                 <th class="px-6 py-3 font-medium tracking-wider text-right">时间</th>
                <th class="px-6 py-3 font-medium tracking-wider text-right">操作</th>
               </tr>
             </thead>
             <tbody class="divide-y divide-border/50 bg-card">
               <tr v-for="t in txs" :key="t.id" class="group transition-colors hover:bg-muted/50">
                 <td class="px-6 py-4">
                   <div class="flex items-center gap-3">
                     <div 
                       class="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background transition-colors group-hover:border-border"
                       :class="{
                         'text-destructive': t.type === 'expense',
                         'text-green-600': t.type === 'income',
                         'text-blue-600': t.type === 'transfer'
                       }"
                     >
                       <AppIcon :name="iconForTxType(t.type)" :size="16" />
                     </div>
                     <div class="flex flex-col">
                       <span class="font-medium text-foreground">
                        {{ t.category || categoryLabel(t.category_id) || (t.type === 'transfer' ? '转账' : '无分类') }}
                       </span>
                       <span v-if="t.note" class="text-xs text-muted-foreground truncate max-w-[150px]">
                         {{ t.note }}
                       </span>
                     </div>
                   </div>
                 </td>
                 <td class="px-6 py-4">
                   <div class="flex flex-col text-xs text-muted-foreground">
                     <span class="font-medium text-foreground">{{ t.account?.name }}</span>
                     <span v-if="t.type === 'transfer'" class="flex items-center gap-1 mt-0.5">
                       <AppIcon name="lucide:arrow-right" :size="10" />
                       {{ t.to_account?.name }}
                     </span>
                   </div>
                 </td>
                 <td class="px-6 py-4 text-right">
                   <span 
                     class="font-medium font-numeric tabular-nums"
                     :class="{
                       'text-foreground': t.type === 'expense',
                       'text-green-600': t.type === 'income',
                       'text-blue-600': t.type === 'transfer'
                     }"
                   >
                     {{ t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '') }}
                     {{ Number(t.amount).toFixed(2) }}
                     <span class="text-xs text-muted-foreground font-normal ml-0.5">{{ t.currency }}</span>
                   </span>
                 </td>
                 <td class="px-6 py-4 text-right text-muted-foreground tabular-nums">
                   {{ new Date(t.occurred_at).toLocaleDateString() }}
                 </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" class="h-7 w-7" @click="openEdit(t)">
                      <AppIcon name="lucide:pencil" :size="14" />
                    </Button>
                    <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive hover:text-destructive" @click="requestDelete(t)">
                      <AppIcon name="lucide:trash" :size="14" />
                    </Button>
                  </div>
                </td>
               </tr>
             </tbody>
           </table>
         </div>
       </Card>
    </div>
      </CardContent>
    </Card>

    <div
      v-if="createOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-background/40 p-4 backdrop-blur-sm md:items-center"
      @click.self="createOpen = false"
    >
      <div class="w-full max-w-xl rounded-3xl border border-border/70 bg-card/95 p-6 shadow-[0_46px_110px_-60px_rgba(8,12,20,0.6)] backdrop-blur md:p-8">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <div class="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              新建
            </div>
            <div class="mt-2 text-2xl font-semibold tracking-tight">
              记一笔
            </div>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
            @click="createOpen = false"
          >
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>

        <div v-if="accountsError" class="mb-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          读取账户失败：{{ accountsError }}
        </div>

        <div v-else-if="!accounts.length" class="mb-5 rounded-xl border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
          还没有可用账户。请先去“账户”创建一个现金/信用/股票账户。
        </div>

        <form class="space-y-5" @submit.prevent="createTransaction">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                类型
              </label>
              <select
                v-model="txType"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="expense">
                  支出
                </option>
                <option value="income">
                  收入
                </option>
                <option value="transfer">
                  转账
                </option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {{ txType === 'transfer' ? '转出账户' : '账户' }}
              </label>
              <select
                v-model="accountId"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                :disabled="!accounts.length"
                required
              >
                <option v-for="a in accounts" :key="a.id" :value="a.id">
                  {{ a.name }} · {{ a.currency }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="txType === 'transfer'" class="space-y-2">
            <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              转入账户
            </label>
            <select
              v-model="toAccountId"
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              :disabled="!accounts.length"
              required
            >
              <option v-for="a in accounts" :key="a.id" :value="a.id">
                {{ a.name }} · {{ a.currency }}
              </option>
            </select>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                金额
              </label>
              <input
                v-model="amount"
                inputmode="decimal"
                required
                placeholder="例如 128.50"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
            </div>
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                日期
              </label>
              <input
                v-model="occurredAt"
                type="date"
                required
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
            </div>
          </div>

          <div v-if="txType !== 'transfer'" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                分类
              </label>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                @click="categoryCreateOpen = true"
              >
                <AppIcon name="lucide:plus" :size="16" class="opacity-80" />
                新建分类
              </button>
            </div>

            <div v-if="categoriesError" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              读取分类失败：{{ categoriesError }}
            </div>

            <div v-else class="grid gap-4 md:grid-cols-2">
              <select
                v-model="categoryParentId"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">
                  选择一级分类（可选）
                </option>
                <option v-for="c in categories.filter((x) => !x.parent_id)" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>

              <select
                v-model="categoryChildId"
                :disabled="!categoryParentId || !categories.some((x) => x.parent_id === categoryParentId)"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <option value="">
                  选择二级分类（可选）
                </option>
                <option
                  v-for="c in categories.filter((x) => x.parent_id === categoryParentId)"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              备注
            </label>
            <input
              v-model="note"
              placeholder="可选，例如 午餐、工资、转入"
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
          </div>

          <div v-if="createError" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            保存失败：{{ createError }}
          </div>

          <div class="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" @click="createOpen = false">
              取消
            </Button>
            <Button
              type="submit"
              :disabled="creating
                || !accounts.length
                || !accountId
                || !amount
                || (txType === 'transfer' && (!toAccountId || toAccountId === accountId))"
            >
              {{ creating ? '保存中...' : '保存' }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="editOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-background/40 p-4 backdrop-blur-sm md:items-center"
      @click.self="editOpen = false"
    >
      <div class="w-full max-w-xl rounded-3xl border border-border/70 bg-card/95 p-6 shadow-[0_46px_110px_-60px_rgba(8,12,20,0.6)] backdrop-blur md:p-8">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <div class="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              编辑
            </div>
            <div class="mt-2 text-2xl font-semibold tracking-tight">
              交易
            </div>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
            @click="editOpen = false"
          >
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>

        <form class="space-y-5" @submit.prevent="saveEdit">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                类型
              </label>
              <select
                v-model="editType"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="expense">支出</option>
                <option value="income">收入</option>
                <option value="transfer">转账</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {{ editType === 'transfer' ? '转出账户' : '账户' }}
              </label>
              <select
                v-model="editAccountId"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                :disabled="!accounts.length"
                required
              >
                <option v-for="a in accounts" :key="a.id" :value="a.id">
                  {{ a.name }} · {{ a.currency }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="editType === 'transfer'" class="space-y-2">
            <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              转入账户
            </label>
            <select
              v-model="editToAccountId"
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              :disabled="!accounts.length"
              required
            >
              <option v-for="a in accounts" :key="a.id" :value="a.id">
                {{ a.name }} · {{ a.currency }}
              </option>
            </select>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                金额
              </label>
              <input
                v-model="editAmount"
                inputmode="decimal"
                required
                placeholder="例如 128.50"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
            </div>
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                日期
              </label>
              <input
                v-model="editOccurredAt"
                type="date"
                required
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
            </div>
          </div>

          <div v-if="editType !== 'transfer'" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                分类
              </label>
            </div>

            <div v-if="categoriesError" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              读取分类失败：{{ categoriesError }}
            </div>

            <div v-else class="grid gap-4 md:grid-cols-2">
              <select
                v-model="editCategoryParentId"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">
                  选择一级分类（可选）
                </option>
                <option v-for="c in categories.filter((x) => !x.parent_id)" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>

              <select
                v-model="editCategoryChildId"
                :disabled="!editCategoryParentId || !categories.some((x) => x.parent_id === editCategoryParentId)"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <option value="">
                  选择二级分类（可选）
                </option>
                <option
                  v-for="c in categories.filter((x) => x.parent_id === editCategoryParentId)"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              备注
            </label>
            <input
              v-model="editNote"
              placeholder="可选，例如 午餐、工资、转入"
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
          </div>

          <div v-if="editError" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            保存失败：{{ editError }}
          </div>

          <div class="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" @click="editOpen = false">
              取消
            </Button>
            <Button type="submit" :disabled="editing || !editAccountId || !editAmount">
              {{ editing ? '保存中...' : '保存' }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="deleteOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-background/40 p-4 backdrop-blur-sm md:items-center"
      @click.self="deleteOpen = false"
    >
      <div class="w-full max-w-md rounded-3xl border border-border/70 bg-card/95 p-6 shadow-[0_46px_110px_-60px_rgba(8,12,20,0.6)] backdrop-blur">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-xs uppercase tracking-[0.28em] text-muted-foreground">删除</div>
            <div class="mt-2 text-xl font-semibold">该笔交易</div>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
            @click="deleteOpen = false"
          >
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>
        <p class="mt-4 text-sm text-muted-foreground">
          删除后将无法恢复。
        </p>
        <div v-if="deleteError" class="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {{ deleteError }}
        </div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" @click="deleteOpen = false">取消</Button>
          <Button type="button" variant="destructive" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? '删除中...' : '确认删除' }}
          </Button>
        </div>
      </div>
    </div>

    <div
      v-if="categoryCreateOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-background/40 p-4 backdrop-blur-sm md:items-center"
      @click.self="categoryCreateOpen = false"
    >
      <div class="w-full max-w-xl rounded-3xl border border-border/70 bg-card/95 p-6 shadow-[0_46px_110px_-60px_rgba(8,12,20,0.6)] backdrop-blur md:p-8">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <div class="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              新建
            </div>
            <div class="mt-2 text-2xl font-semibold tracking-tight">
              分类
            </div>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
            @click="categoryCreateOpen = false"
          >
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>

        <form class="space-y-5" @submit.prevent="createCategory">
          <div class="space-y-2">
            <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              上级（可选）
            </label>
            <select
              v-model="categoryCreateParentId"
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">
                一级分类
              </option>
              <option v-for="c in categories.filter((x) => !x.parent_id)" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              名称
            </label>
            <input
              v-model="categoryCreateName"
              required
              placeholder="例如 餐饮、交通、工资"
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
          </div>

          <div v-if="categoryCreateError" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            创建失败：{{ categoryCreateError }}
          </div>

          <div class="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" @click="categoryCreateOpen = false">
              取消
            </Button>
            <Button type="submit" :disabled="categoryCreating || !categoryCreateName.trim()">
              {{ categoryCreating ? '创建中...' : '创建' }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
