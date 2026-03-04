<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import EmptyStateIllustration from '@/components/illustrations/EmptyStateIllustration.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type TxType = 'expense' | 'income' | 'transfer'
type TxView = 'all' | TxType

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
  transaction_tags?: {
    tag_id: string
    tags: Tag | null
  }[]
}

type Category = {
  id: string
  parent_id: string | null
  name: string
  created_at: string
}

type Tag = {
  id: string
  name: string
  color: string | null
  created_at: string
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
const tags = ref<Tag[]>([])
const tagsError = ref<string | null>(null)

const viewMode = ref<TxView>('all')
const filterAccountId = ref<string>('')
const filterTagId = ref<string>('')

const defaultCategorySeeds = [
  { name: '餐饮', children: ['早餐', '午餐', '晚餐', '咖啡/饮品'] },
  { name: '交通', children: ['公交地铁', '打车', '加油', '停车'] },
  { name: '居家', children: ['房租', '水电', '网费', '物业'] },
  { name: '购物', children: ['日用品', '服饰', '数码'] },
  { name: '娱乐', children: ['电影', '游戏', '运动'] },
  { name: '医疗', children: ['药品', '体检', '挂号'] },
  { name: '学习', children: ['书籍', '课程', '培训'] },
  { name: '旅行', children: ['机酒', '门票', '交通'] },
  { name: '收入', children: ['工资', '奖金', '投资收益', '其他收入'] },
]

const route = useRoute()
const router = useRouter()

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

const selectedTagIds = ref<string[]>([])
const editTagIds = ref<string[]>([])
const tagCreateName = ref('')
const tagCreating = ref(false)
const tagCreateError = ref<string | null>(null)

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

watch(
  () => route.query.create,
  (v) => {
    if (v === '1') createOpen.value = true
  },
  { immediate: true }
)

watch(createOpen, (open) => {
  if (open) return
  if (route.query.create !== '1') return
  const nextQuery = { ...route.query }
  delete (nextQuery as any).create
  router.replace({ query: nextQuery })
})

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

function toggleTagSelection(list: string[], tagId: string) {
  const idx = list.indexOf(tagId)
  if (idx >= 0) {
    list.splice(idx, 1)
    return
  }
  list.push(tagId)
}

const filteredTxs = computed(() => {
  let rows = viewMode.value === 'all' ? txs.value : txs.value.filter((t) => t.type === viewMode.value)
  if (filterAccountId.value) {
    rows = rows.filter((t) => t.account_id === filterAccountId.value || t.to_account_id === filterAccountId.value)
  }
  if (!filterTagId.value) return rows
  return rows.filter((t) => (t.transaction_tags ?? []).some((tt) => tt.tag_id === filterTagId.value))
})

function resetCreateForm() {
  txType.value = 'expense'
  amount.value = ''
  note.value = ''
  occurredAt.value = new Date().toISOString().slice(0, 10)
  toAccountId.value = ''
  categoryParentId.value = ''
  categoryChildId.value = ''
  selectedTagIds.value = []
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

function ensureEditTransferTarget() {
  if (editType.value !== 'transfer') return
  if (!accounts.value.length) return
  if (!editAccountId.value) {
    editAccountId.value = accounts.value[0]!.id
  }
  if (editToAccountId.value && editToAccountId.value !== editAccountId.value) return
  const candidate = accounts.value.find((a) => a.id !== editAccountId.value)
  if (candidate) {
    editToAccountId.value = candidate.id
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
  editTagIds.value = []
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
    .select('id,parent_id,name,created_at')
    .order('parent_id', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    categoriesError.value = error.message
    categories.value = []
    return
  }

  let rows = (data ?? []) as Category[]
  if (!rows.length) {
    await seedDefaultCategories()
    const { data: seeded, error: seededErr } = await supabase
      .from('categories')
      .select('id,parent_id,name,created_at')
      .order('parent_id', { ascending: true })
      .order('name', { ascending: true })
    if (seededErr) {
      categoriesError.value = seededErr.message
      categories.value = []
      return
    }
    rows = (seeded ?? []) as Category[]
  }

  const normalized = await normalizeCategoryDuplicates(rows)
  if (normalized) {
    const { data: refreshed, error: refreshedErr } = await supabase
      .from('categories')
      .select('id,parent_id,name,created_at')
      .order('parent_id', { ascending: true })
      .order('name', { ascending: true })
    if (refreshedErr) {
      categoriesError.value = refreshedErr.message
      categories.value = []
      return
    }
    categories.value = (refreshed ?? []) as Category[]
    return
  }

  categories.value = rows
}

async function loadTags() {
  if (!user.value) return
  tagsError.value = null
  const { data, error } = await supabase
    .from('tags')
    .select('id,name,color,created_at')
    .order('name', { ascending: true })
  if (error) {
    tagsError.value = error.message
    tags.value = []
    return
  }
  tags.value = (data ?? []) as Tag[]
}

async function seedDefaultCategories() {
  if (!user.value) return
  const parentNames = defaultCategorySeeds.map((c) => c.name)
  const { data: existingParents, error: existingErr } = await supabase
    .from('categories')
    .select('id,name')
    .is('parent_id', null)
    .in('name', parentNames)
  if (existingErr) {
    categoriesError.value = existingErr.message
    return
  }
  const existingMap = new Map((existingParents ?? []).map((p) => [p.name, p.id]))
  const missingParents = defaultCategorySeeds
    .filter((c) => !existingMap.has(c.name))
    .map((c) => ({ name: c.name, parent_id: null }))
  if (missingParents.length) {
    const { error: insertErr } = await supabase.from('categories').insert(missingParents)
    if (insertErr) {
      categoriesError.value = insertErr.message
      return
    }
  }
  const { data: parentsData, error: parentsErr } = await supabase
    .from('categories')
    .select('id,name')
    .is('parent_id', null)
    .in('name', parentNames)
  if (parentsErr) {
    categoriesError.value = parentsErr.message
    return
  }
  const parentIdMap = new Map((parentsData ?? []).map((p) => [p.name, p.id]))
  const parentIds = (parentsData ?? []).map((p) => p.id)
  const { data: existingChildren, error: childrenErr } = await supabase
    .from('categories')
    .select('id,name,parent_id')
    .in('parent_id', parentIds)
  if (childrenErr) {
    categoriesError.value = childrenErr.message
    return
  }
  const childKey = new Set((existingChildren ?? []).map((c) => `${c.parent_id}:${c.name}`))
  const childPayload: { name: string; parent_id: string }[] = []
  for (const seed of defaultCategorySeeds) {
    const parentId = parentIdMap.get(seed.name)
    if (!parentId) continue
    for (const child of seed.children) {
      const key = `${parentId}:${child}`
      if (!childKey.has(key)) {
        childPayload.push({ name: child, parent_id: parentId })
      }
    }
  }
  if (childPayload.length) {
    const { error: childInsertErr } = await supabase.from('categories').insert(childPayload)
    if (childInsertErr) {
      categoriesError.value = childInsertErr.message
    }
  }
}

async function normalizeCategoryDuplicates(rows: Category[]) {
  const parents = rows.filter((r) => !r.parent_id)
  const parentsByName: Record<string, Category[]> = {}
  for (const p of parents) {
    const name = p.name
    if (!parentsByName[name]) parentsByName[name] = []
    parentsByName[name].push(p)
  }
  const duplicates = Object.values(parentsByName).filter((g) => g.length > 1)
  if (!duplicates.length) return false
  for (const group of duplicates) {
    const sorted = group.slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
    const canonical = sorted[0]!
    const dupParents = sorted.slice(1)
    const canonicalChildren = rows.filter((r) => r.parent_id === canonical.id)
    for (const dup of dupParents) {
      const dupChildren = rows.filter((r) => r.parent_id === dup.id)
      for (const child of dupChildren) {
        const existing = canonicalChildren.find((c) => c.name === child.name)
        if (existing) {
          await supabase.from('transactions').update({ category_id: existing.id, category: existing.name }).eq('category_id', child.id)
          await supabase.from('categories').delete().eq('id', child.id)
        } else {
          await supabase.from('categories').update({ parent_id: canonical.id }).eq('id', child.id)
          canonicalChildren.push({ ...child, parent_id: canonical.id })
        }
      }
      await supabase.from('transactions').update({ category_id: canonical.id, category: canonical.name }).eq('category_id', dup.id)
      await supabase.from('categories').delete().eq('id', dup.id)
    }
  }
  return true
}

async function loadTransactions() {
  if (!user.value) return
  errorMessage.value = null
  loading.value = true

  const { data, error } = await supabase
    .from('transactions')
    .select('id,type,amount,currency,category_id,category,note,occurred_at,account_id,to_account_id,account:accounts!transactions_account_id_fkey(name,type,currency),to_account:accounts!transactions_to_account_id_fkey(name,type,currency),transaction_tags(tag_id,tags(id,name,color))')
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

  const { data: created, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select('id')
    .single()
  creating.value = false

  if (error) {
    createError.value = error.message
    return
  }

  if (created?.id && txType.value !== 'transfer' && selectedTagIds.value.length) {
    const tagPayload = selectedTagIds.value.map((tagId) => ({
      transaction_id: created.id,
      tag_id: tagId,
    }))
    const { error: tagErr } = await supabase.from('transaction_tags').insert(tagPayload)
    if (tagErr) {
      createError.value = tagErr.message
      return
    }
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

async function createTag() {
  if (!user.value) return
  const name = tagCreateName.value.trim()
  if (!name) return
  tagCreating.value = true
  tagCreateError.value = null
  const { error } = await supabase.from('tags').insert({ name })
  tagCreating.value = false
  if (error) {
    tagCreateError.value = error.message
    return
  }
  tagCreateName.value = ''
  await loadTags()
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

  editTagIds.value = (t.transaction_tags ?? []).map((tt) => tt.tag_id)
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

  const { error: clearErr } = await supabase.from('transaction_tags').delete().eq('transaction_id', editId.value)
  if (clearErr) {
    editError.value = clearErr.message
    return
  }
  if (editType.value !== 'transfer' && editTagIds.value.length) {
    const tagPayload = editTagIds.value.map((tagId) => ({
      transaction_id: editId.value,
      tag_id: tagId,
    }))
    const { error: tagErr } = await supabase.from('transaction_tags').insert(tagPayload)
    if (tagErr) {
      editError.value = tagErr.message
      return
    }
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
    tags.value = []
    return
  }
  loadAccounts()
  loadCategories()
  loadTags()
  loadTransactions()
})

watch([txType, accountId, accounts], () => {
  ensureTransferTarget()
})

watch([editType, editAccountId, accounts], () => {
  ensureEditTransferTarget()
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:arrow-right-left" :size="24" class="text-primary" />
          <h1 class="text-3xl font-bold tracking-tight text-foreground/90">
            收支明细
          </h1>
        </div>
        <p class="mt-2 text-base text-muted-foreground">
          查看和管理您的所有支出、收入及转账记录。
        </p>
      </div>
      <Button size="lg" class="shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" @click="createOpen = true">
        <span class="inline-flex items-center gap-2">
          <AppIcon name="lucide:plus" :size="18" />
          记一笔
        </span>
      </Button>
    </div>

    <Card class="border-border/50 bg-card/60 shadow-xl backdrop-blur-xl">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle class="text-lg font-medium text-foreground/80">交易列表</CardTitle>
          <div class="flex flex-wrap items-center gap-3">
            <!-- View Mode Toggle -->
            <div class="flex items-center rounded-xl border border-border/50 bg-background/50 p-1 shadow-sm backdrop-blur-md">
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="viewMode === 'all' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
                @click="viewMode = 'all'"
              >
                全部
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="viewMode === 'expense' ? 'bg-destructive text-destructive-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
                @click="viewMode = 'expense'"
              >
                支出
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="viewMode === 'income' ? 'bg-emerald-600 text-white shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
                @click="viewMode = 'income'"
              >
                收入
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="viewMode === 'transfer' ? 'bg-blue-600 text-white shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
                @click="viewMode = 'transfer'"
              >
                转账
              </button>
            </div>

            <!-- Filters -->
            <div class="flex items-center gap-2">
              <div class="relative">
                <select
                  v-model="filterAccountId"
                  class="h-9 appearance-none rounded-xl border border-border/50 bg-background/50 pl-3 pr-8 text-sm text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background/80 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">全部账户</option>
                  <option v-for="a in accounts" :key="a.id" :value="a.id">
                    {{ a.name }}
                  </option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="14" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              <div class="relative">
                <select
                  v-model="filterTagId"
                  class="h-9 appearance-none rounded-xl border border-border/50 bg-background/50 pl-3 pr-8 text-sm text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background/80 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">全部标签</option>
                  <option v-for="t in tags" :key="t.id" :value="t.id">
                    {{ t.name }}
                  </option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="14" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="!user" class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/30 py-16 text-center">
          <AppIcon name="lucide:lock" :size="48" class="mb-4 text-muted-foreground/50" />
          <h3 class="text-lg font-medium">请先登录</h3>
          <p class="text-sm text-muted-foreground">登录后即可查看您的交易流水</p>
        </div>

        <div v-else-if="errorMessage" class="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          <div class="flex items-center gap-2 font-semibold">
            <AppIcon name="lucide:alert-circle" :size="16" />
            加载失败
          </div>
          <p class="mt-1 opacity-90">{{ errorMessage }}</p>
        </div>

        <div v-else-if="loading" class="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <AppIcon name="lucide:loader-2" :size="32" class="animate-spin opacity-50" />
          <p class="mt-4 text-sm">正在加载交易记录...</p>
        </div>

        <div v-else>
          <div v-if="!filteredTxs.length" class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/30 py-16 text-center">
            <EmptyStateIllustration class="mb-6 w-48 opacity-50 grayscale" />
            <h3 class="text-lg font-semibold text-foreground/80">
              {{ viewMode === 'all' ? '暂无收支记录' : '暂无该类型记录' }}
            </h3>
            <p class="mt-2 text-sm text-muted-foreground max-w-sm">
              {{ viewMode === 'all' ? '你还没有记录任何交易。点击右上角“记一笔”开始。' : '切换到全部可查看其他交易。' }}
            </p>
          </div>

          <div v-else class="rounded-2xl border border-border/40 bg-background/40 overflow-hidden backdrop-blur-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead class="bg-muted/30 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  <tr v-if="viewMode === 'transfer'">
                    <th class="px-6 py-4">转出账户</th>
                    <th class="px-6 py-4">转入账户</th>
                    <th class="px-6 py-4 text-right">金额</th>
                    <th class="px-6 py-4 text-right">时间</th>
                    <th class="px-6 py-4 text-right w-[100px]">操作</th>
                  </tr>
                  <tr v-else>
                    <th class="px-6 py-4">分类 / 备注</th>
                    <th class="px-6 py-4">账户</th>
                    <th class="px-6 py-4 text-right">金额</th>
                    <th class="px-6 py-4 text-right">时间</th>
                    <th class="px-6 py-4 text-right w-[100px]">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/30">
                  <tr v-for="t in filteredTxs" :key="t.id" class="group transition-colors hover:bg-muted/40">
                    <template v-if="viewMode === 'transfer'">
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <AppIcon name="lucide:arrow-up-right" :size="18" />
                          </div>
                          <div class="flex flex-col">
                            <span class="font-medium text-foreground">{{ t.account?.name || '—' }}</span>
                            <span class="text-xs text-muted-foreground">{{ t.account?.currency || t.currency }}</span>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <AppIcon name="lucide:arrow-down-left" :size="18" />
                          </div>
                          <div class="flex flex-col">
                            <span class="font-medium text-foreground">{{ t.to_account?.name || '—' }}</span>
                            <span class="text-xs text-muted-foreground">{{ t.to_account?.currency || t.currency }}</span>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 text-right">
                        <span class="text-base font-bold font-numeric tabular-nums text-foreground">
                          {{ Number(t.amount).toFixed(2) }}
                          <span class="text-xs font-normal text-muted-foreground ml-0.5">{{ t.currency }}</span>
                        </span>
                      </td>
                      <td class="px-6 py-4 text-right text-muted-foreground tabular-nums">
                        {{ new Date(t.occurred_at).toLocaleDateString() }}
                      </td>
                      <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-primary" @click="openEdit(t)">
                            <AppIcon name="lucide:pencil" :size="15" />
                          </Button>
                          <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-destructive" @click="requestDelete(t)">
                            <AppIcon name="lucide:trash" :size="15" />
                          </Button>
                        </div>
                      </td>
                    </template>
                    <template v-else>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div 
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors"
                            :class="{
                              'bg-destructive/10 text-destructive': t.type === 'expense',
                              'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400': t.type === 'income',
                              'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400': t.type === 'transfer'
                            }"
                          >
                            <AppIcon :name="iconForTxType(t.type)" :size="20" />
                          </div>
                          <div class="flex flex-col min-w-0">
                            <span class="font-medium text-foreground truncate">
                              {{ t.category || categoryLabel(t.category_id) || (t.type === 'transfer' ? '转账' : '无分类') }}
                            </span>
                            <span v-if="t.note" class="text-xs text-muted-foreground truncate max-w-[180px]">
                              {{ t.note }}
                            </span>
                            <div v-if="t.transaction_tags?.length" class="mt-1 flex flex-wrap gap-1">
                              <span
                                v-for="tag in t.transaction_tags"
                                :key="tag.tag_id"
                                class="inline-flex items-center rounded-md border border-border/50 bg-background/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {{ tag.tags?.name || '标签' }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex flex-col text-sm">
                          <span class="font-medium text-foreground">{{ t.account?.name }}</span>
                          <span class="text-xs text-muted-foreground">{{ t.account?.currency }}</span>
                        </div>
                      </td>
                      <td class="px-6 py-4 text-right">
                        <span 
                          class="text-base font-bold font-numeric tabular-nums"
                          :class="{
                            'text-foreground': t.type === 'expense',
                            'text-emerald-600 dark:text-emerald-400': t.type === 'income',
                            'text-blue-600 dark:text-blue-400': t.type === 'transfer'
                          }"
                        >
                          {{ t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '') }}
                          {{ Number(t.amount).toFixed(2) }}
                          <span class="text-xs font-normal text-muted-foreground ml-0.5">{{ t.currency }}</span>
                        </span>
                      </td>
                      <td class="px-6 py-4 text-right text-muted-foreground tabular-nums">
                        {{ new Date(t.occurred_at).toLocaleDateString() }}
                      </td>
                      <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-primary" @click="openEdit(t)">
                            <AppIcon name="lucide:pencil" :size="15" />
                          </Button>
                          <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-destructive" @click="requestDelete(t)">
                            <AppIcon name="lucide:trash" :size="15" />
                          </Button>
                        </div>
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <div
      v-if="createOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-4 backdrop-blur-sm md:items-center"
      @click.self="createOpen = false"
    >
      <div class="w-full max-w-xl rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl backdrop-blur-xl md:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <div class="text-xs font-medium uppercase tracking-wider text-primary">
              新建
            </div>
            <div class="mt-1 text-2xl font-bold tracking-tight text-foreground">
              记一笔
            </div>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            @click="createOpen = false"
          >
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>

        <div v-if="accountsError" class="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          读取账户失败：{{ accountsError }}
        </div>

        <div v-else-if="!accounts.length" class="mb-5 rounded-xl border border-dashed border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground text-center">
          还没有可用账户。请先去“账户”创建一个现金/信用/股票账户。
        </div>

        <form class="space-y-6" @submit.prevent="createTransaction">
          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                类型
              </label>
              <div class="relative">
                <select
                  v-model="txType"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="expense">支出</option>
                  <option value="income">收入</option>
                  <option value="transfer">转账</option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {{ txType === 'transfer' ? '转出账户' : '账户' }}
              </label>
              <div class="relative">
                <select
                  v-model="accountId"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                  :disabled="!accounts.length"
                  required
                >
                  <option v-for="a in accounts" :key="a.id" :value="a.id">
                    {{ a.name }} · {{ a.currency }}
                  </option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div v-if="txType === 'transfer'" class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              转入账户
            </label>
            <div class="relative">
              <select
                v-model="toAccountId"
                class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                :disabled="!accounts.length"
                required
              >
                <option v-for="a in accounts" :key="a.id" :value="a.id">
                  {{ a.name }} · {{ a.currency }}
                </option>
              </select>
              <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                金额
              </label>
              <div class="relative">
                <input
                  v-model="amount"
                  inputmode="decimal"
                  required
                  placeholder="0.00"
                  class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 font-numeric"
                >
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                日期
              </label>
              <div class="relative">
                <input
                  v-model="occurredAt"
                  type="date"
                  required
                  class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                >
              </div>
            </div>
          </div>

          <div v-if="txType !== 'transfer'" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                分类
              </label>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                @click="categoryCreateOpen = true"
              >
                <AppIcon name="lucide:plus" :size="14" />
                新建分类
              </button>
            </div>

            <div v-if="categoriesError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              读取分类失败：{{ categoriesError }}
            </div>

            <div v-else class="grid gap-4 md:grid-cols-2">
              <div class="relative">
                <select
                  v-model="categoryParentId"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">选择一级分类（可选）</option>
                  <option v-for="c in categories.filter((x) => !x.parent_id)" :key="c.id" :value="c.id">
                    {{ c.name }}
                  </option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              <div class="relative">
                <select
                  v-model="categoryChildId"
                  :disabled="!categoryParentId || !categories.some((x) => x.parent_id === categoryParentId)"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">选择二级分类（可选）</option>
                  <option
                    v-for="c in categories.filter((x) => x.parent_id === categoryParentId)"
                    :key="c.id"
                    :value="c.id"
                  >
                    {{ c.name }}
                  </option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div v-if="txType !== 'transfer'" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                标签
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model="tagCreateName"
                  placeholder="新标签"
                  class="h-8 w-24 rounded-lg border border-border/50 bg-background/50 px-2 text-xs shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                >
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  :disabled="tagCreating || !tagCreateName.trim()"
                  @click="createTag"
                >
                  <AppIcon name="lucide:plus" :size="12" />
                  添加
                </button>
              </div>
            </div>

            <div v-if="tagsError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              读取标签失败：{{ tagsError }}
            </div>
            <div v-if="tagCreateError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              创建失败：{{ tagCreateError }}
            </div>

            <div v-else class="flex flex-wrap gap-2 min-h-[2rem]">
              <button
                v-for="t in tags"
                :key="t.id"
                type="button"
                class="rounded-full border px-3 py-1 text-xs transition-all duration-200"
                :class="selectedTagIds.includes(t.id)
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border/50 bg-background/50 text-muted-foreground hover:border-border hover:text-foreground'"
                @click="toggleTagSelection(selectedTagIds, t.id)"
              >
                {{ t.name }}
              </button>
              <span v-if="!tags.length" class="text-xs text-muted-foreground py-1">暂无标签</span>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              备注
            </label>
            <input
              v-model="note"
              placeholder="可选，例如 午餐、工资、转入"
              class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
            >
          </div>

          <div v-if="createError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            保存失败：{{ createError }}
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="createOpen = false">
              取消
            </Button>
            <Button
              type="submit"
              class="shadow-lg shadow-primary/20"
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
      class="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-4 backdrop-blur-sm md:items-center"
      @click.self="editOpen = false"
    >
      <div class="w-full max-w-xl rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl backdrop-blur-xl md:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <div class="text-xs font-medium uppercase tracking-wider text-primary">
              编辑
            </div>
            <div class="mt-1 text-2xl font-bold tracking-tight text-foreground">
              交易
            </div>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            @click="editOpen = false"
          >
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>

        <form class="space-y-6" @submit.prevent="saveEdit">
          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                类型
              </label>
              <div class="relative">
                <select
                  v-model="editType"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="expense">支出</option>
                  <option value="income">收入</option>
                  <option value="transfer">转账</option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {{ editType === 'transfer' ? '转出账户' : '账户' }}
              </label>
              <div class="relative">
                <select
                  v-model="editAccountId"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                  :disabled="!accounts.length"
                  required
                >
                  <option v-for="a in accounts" :key="a.id" :value="a.id">
                    {{ a.name }} · {{ a.currency }}
                  </option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div v-if="editType === 'transfer'" class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              转入账户
            </label>
            <div class="relative">
              <select
                v-model="editToAccountId"
                class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                :disabled="!accounts.length"
                required
              >
                <option v-for="a in accounts" :key="a.id" :value="a.id">
                  {{ a.name }} · {{ a.currency }}
                </option>
              </select>
              <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                金额
              </label>
              <input
                v-model="editAmount"
                inputmode="decimal"
                required
                placeholder="0.00"
                class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary font-numeric"
              >
            </div>
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                日期
              </label>
              <input
                v-model="editOccurredAt"
                type="date"
                required
                class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
              >
            </div>
          </div>

          <div v-if="editType !== 'transfer'" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                分类
              </label>
            </div>

            <div v-if="categoriesError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              读取分类失败：{{ categoriesError }}
            </div>

            <div v-else class="grid gap-4 md:grid-cols-2">
              <div class="relative">
                <select
                  v-model="editCategoryParentId"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">选择一级分类（可选）</option>
                  <option v-for="c in categories.filter((x) => !x.parent_id)" :key="c.id" :value="c.id">
                    {{ c.name }}
                  </option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              <div class="relative">
                <select
                  v-model="editCategoryChildId"
                  :disabled="!editCategoryParentId || !categories.some((x) => x.parent_id === editCategoryParentId)"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">选择二级分类（可选）</option>
                  <option
                    v-for="c in categories.filter((x) => x.parent_id === editCategoryParentId)"
                    :key="c.id"
                    :value="c.id"
                  >
                    {{ c.name }}
                  </option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div v-if="editType !== 'transfer'" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                标签
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model="tagCreateName"
                  placeholder="新标签"
                  class="h-8 w-24 rounded-lg border border-border/50 bg-background/50 px-2 text-xs shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                >
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  :disabled="tagCreating || !tagCreateName.trim()"
                  @click="createTag"
                >
                  <AppIcon name="lucide:plus" :size="12" />
                  添加
                </button>
              </div>
            </div>

            <div v-if="tagsError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              读取标签失败：{{ tagsError }}
            </div>
            <div v-if="tagCreateError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              创建失败：{{ tagCreateError }}
            </div>

            <div v-else class="flex flex-wrap gap-2 min-h-[2rem]">
              <button
                v-for="t in tags"
                :key="t.id"
                type="button"
                class="rounded-full border px-3 py-1 text-xs transition-all duration-200"
                :class="editTagIds.includes(t.id)
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border/50 bg-background/50 text-muted-foreground hover:border-border hover:text-foreground'"
                @click="toggleTagSelection(editTagIds, t.id)"
              >
                {{ t.name }}
              </button>
              <span v-if="!tags.length" class="text-xs text-muted-foreground py-1">暂无标签</span>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              备注
            </label>
            <input
              v-model="editNote"
              placeholder="可选，例如 午餐、工资、转入"
              class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
            >
          </div>

          <div v-if="editError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            保存失败：{{ editError }}
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="editOpen = false">
              取消
            </Button>
            <Button type="submit" class="shadow-lg shadow-primary/20" :disabled="editing || !editAccountId || !editAmount">
              {{ editing ? '保存中...' : '保存' }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="deleteOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-4 backdrop-blur-sm md:items-center"
      @click.self="deleteOpen = false"
    >
      <div class="w-full max-w-md rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl backdrop-blur-xl md:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-xs font-medium uppercase tracking-wider text-destructive">删除</div>
            <div class="mt-1 text-xl font-bold text-foreground">确认删除该笔交易？</div>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            @click="deleteOpen = false"
          >
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>
        <p class="mt-4 text-sm text-muted-foreground leading-relaxed">
          此操作无法撤销。该交易记录将从您的账户流水中永久移除。
        </p>
        <div v-if="deleteError" class="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {{ deleteError }}
        </div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="deleteOpen = false">取消</Button>
          <Button type="button" variant="destructive" class="shadow-lg shadow-destructive/20" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? '删除中...' : '确认删除' }}
          </Button>
        </div>
      </div>
    </div>

    <div
      v-if="categoryCreateOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-4 backdrop-blur-sm md:items-center"
      @click.self="categoryCreateOpen = false"
    >
      <div class="w-full max-w-xl rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl backdrop-blur-xl md:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <div class="text-xs font-medium uppercase tracking-wider text-primary">
              新建
            </div>
            <div class="mt-1 text-2xl font-bold tracking-tight text-foreground">
              分类
            </div>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            @click="categoryCreateOpen = false"
          >
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>

        <form class="space-y-6" @submit.prevent="createCategory">
          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              上级（可选）
            </label>
            <div class="relative">
              <select
                v-model="categoryCreateParentId"
                class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">一级分类</option>
                <option v-for="c in categories.filter((x) => !x.parent_id)" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
              <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              名称
            </label>
            <input
              v-model="categoryCreateName"
              required
              placeholder="例如 餐饮、交通、工资"
              class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
            >
          </div>

          <div v-if="categoryCreateError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            创建失败：{{ categoryCreateError }}
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="categoryCreateOpen = false">
              取消
            </Button>
            <Button type="submit" class="shadow-lg shadow-primary/20" :disabled="categoryCreating || !categoryCreateName.trim()">
              {{ categoryCreating ? '创建中...' : '创建' }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
