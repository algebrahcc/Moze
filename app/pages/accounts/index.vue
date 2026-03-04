<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import EmptyStateIllustration from '@/components/illustrations/EmptyStateIllustration.vue'

type AccountType = 'cash' | 'credit' | 'stock'

type Account = {
  id: string
  name: string
  type: AccountType
  currency: string
  is_archived: boolean
  created_at: string
}

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const accounts = ref<Account[]>([])
const balances = ref<Record<string, number>>({})
const latestSnapshots = ref<Record<string, number>>({})

const createOpen = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const name = ref('')
const type = ref<AccountType>('cash')
const currency = ref('CNY')

const editOpen = ref(false)
const editing = ref(false)
const editError = ref<string | null>(null)
const editingAccountId = ref<string | null>(null)
const editName = ref('')
const editType = ref<AccountType>('cash')
const editCurrency = ref('CNY')

const showArchived = ref(false)
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const deleteTarget = ref<Account | null>(null)
const archiveOpen = ref(false)
const archiving = ref(false)
const archiveError = ref<string | null>(null)
const archiveTarget = ref<Account | null>(null)
const archiveNextStatus = ref<boolean>(false)
const adjustOpen = ref(false)
const adjusting = ref(false)
const adjustError = ref<string | null>(null)
const adjustTarget = ref<Account | null>(null)
const adjustAmount = ref<string>('')
const adjustNote = ref<string>('')

const visibleAccounts = computed(() => {
  if (showArchived.value) return accounts.value
  return accounts.value.filter((a) => !a.is_archived)
})

function iconForType(t: AccountType) {
  if (t === 'cash') return 'lucide:banknote'
  if (t === 'credit') return 'lucide:credit-card'
  return 'lucide:candlestick-chart'
}

function labelForType(t: AccountType) {
  if (t === 'cash') return '现金'
  if (t === 'credit') return '信用'
  return '股票'
}

async function loadAccounts() {
  if (!user.value) return
  errorMessage.value = null
  loading.value = true

  const { data, error } = await supabase
    .from('accounts')
    .select('id,name,type,currency,is_archived,created_at')
    .order('is_archived', { ascending: true })
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    accounts.value = []
    return
  }

  accounts.value = (data ?? []) as Account[]
  await loadBalances()
}

async function loadBalances() {
  if (!user.value || !accounts.value.length) {
    balances.value = {}
    latestSnapshots.value = {}
    return
  }

  const accountIds = accounts.value.map((a) => a.id)
  const stockIds = accounts.value.filter((a) => a.type === 'stock').map((a) => a.id)

  const [{ data: txRows, error: txErr }, { data: snapshotRows, error: snapErr }] = await Promise.all([
    supabase
      .from('transactions')
      .select('type,amount,account_id,to_account_id')
      .order('occurred_at', { ascending: true }),
    stockIds.length
      ? supabase
          .from('asset_snapshots')
          .select('account_id,date,total_value')
          .in('account_id', stockIds)
          .order('date', { ascending: false })
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
      if (row.to_account_id) {
        map[row.to_account_id] = (map[row.to_account_id] ?? 0) + amt
      }
    }
  }

  const snapMap: Record<string, number> = {}
  for (const row of snapshotRows ?? []) {
    if (snapMap[row.account_id] === undefined) {
      snapMap[row.account_id] = Number(row.total_value ?? 0)
    }
  }

  balances.value = map
  latestSnapshots.value = snapMap
}

async function createAccount() {
  if (!user.value) return
  createError.value = null
  creating.value = true

  const payload = {
    name: name.value.trim(),
    type: type.value,
    currency: currency.value,
    is_archived: false,
  }

  const { error } = await supabase.from('accounts').insert(payload)
  creating.value = false

  if (error) {
    createError.value = error.message
    return
  }

  createOpen.value = false
  name.value = ''
  type.value = 'cash'
  currency.value = 'CNY'
  await loadAccounts()
}

async function setArchived(a: Account, archived: boolean) {
  if (!user.value) return
  const { error } = await supabase
    .from('accounts')
    .update({ is_archived: archived })
    .eq('id', a.id)

  if (error) {
    errorMessage.value = error.message
    return
  }

  await loadAccounts()
}

function openEdit(a: Account) {
  editingAccountId.value = a.id
  editName.value = a.name
  editType.value = a.type
  editCurrency.value = a.currency
  editError.value = null
  editOpen.value = true
}

async function saveEdit() {
  if (!user.value || !editingAccountId.value) return
  editError.value = null
  editing.value = true

  const payload = {
    name: editName.value.trim(),
    type: editType.value,
    currency: editCurrency.value,
  }

  const { error } = await supabase
    .from('accounts')
    .update(payload)
    .eq('id', editingAccountId.value)

  editing.value = false

  if (error) {
    editError.value = error.message
    return
  }

  editOpen.value = false
  editingAccountId.value = null
  await loadAccounts()
}

function requestDelete(a: Account) {
  deleteTarget.value = a
  deleteError.value = null
  deleteOpen.value = true
}

function requestArchive(a: Account) {
  archiveTarget.value = a
  archiveNextStatus.value = !a.is_archived
  archiveError.value = null
  archiveOpen.value = true
}

async function confirmDelete() {
  if (!user.value || !deleteTarget.value) return
  deleting.value = true
  deleteError.value = null

  const { count: txCount, error: txErr } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .or(`account_id.eq.${deleteTarget.value.id},to_account_id.eq.${deleteTarget.value.id}`)

  if (txErr) {
    deleting.value = false
    deleteError.value = txErr.message
    return
  }

  if ((txCount ?? 0) > 0) {
    deleting.value = false
    deleteError.value = '该账户存在流水记录，无法删除。请先归档或清理流水。'
    return
  }

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', deleteTarget.value.id)

  deleting.value = false

  if (error) {
    deleteError.value = error.message
    return
  }

  deleteOpen.value = false
  deleteTarget.value = null
  await loadAccounts()
}

async function confirmArchive() {
  if (!user.value || !archiveTarget.value) return
  archiving.value = true
  archiveError.value = null
  const { error } = await supabase
    .from('accounts')
    .update({ is_archived: archiveNextStatus.value })
    .eq('id', archiveTarget.value.id)
  archiving.value = false
  if (error) {
    archiveError.value = error.message
    return
  }
  archiveOpen.value = false
  archiveTarget.value = null
  await loadAccounts()
}

function requestAdjust(a: Account) {
  adjustTarget.value = a
  adjustAmount.value = ''
  adjustNote.value = ''
  adjustError.value = null
  adjustOpen.value = true
}

async function confirmAdjust() {
  if (!user.value || !adjustTarget.value) return
  adjustError.value = null
  adjusting.value = true

  const amountNum = Number(adjustAmount.value)
  if (!Number.isFinite(amountNum) || amountNum === 0) {
    adjusting.value = false
    adjustError.value = '请输入有效金额（可为正或负）。'
    return
  }

  const payload = {
    account_id: adjustTarget.value.id,
    to_account_id: null,
    type: amountNum > 0 ? 'income' : 'expense',
    amount: Math.abs(amountNum),
    currency: adjustTarget.value.currency,
    category_id: null,
    category: '余额调整',
    note: adjustNote.value.trim() || '余额调整',
    occurred_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('transactions').insert(payload)
  adjusting.value = false

  if (error) {
    adjustError.value = error.message
    return
  }

  adjustOpen.value = false
  adjustTarget.value = null
  await loadBalances()
}

watchEffect(() => {
  if (user.value) {
    loadAccounts()
    return
  }
  accounts.value = []
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:wallet-cards" :size="18" class="text-muted-foreground" />
          <h1 class="text-2xl font-semibold tracking-tight">
            资产账户
          </h1>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">
          现金/信用/股票
        </p>
      </div>
      <Button @click="createOpen = true">
        <span class="inline-flex items-center gap-2">
          <AppIcon name="lucide:plus" :size="16" />
          新建账户
        </span>
      </Button>
    </div>

    <Card>
      <CardHeader class="text-sm font-medium">
        <div class="flex items-center justify-between">
          <span>账户列表</span>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            @click="showArchived = !showArchived"
          >
            <AppIcon name="lucide:archive" :size="16" class="opacity-80" />
            {{ showArchived ? '隐藏归档' : '显示归档' }}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="!user" class="rounded-xl border border-dashed border-border/70 bg-background/40 p-8 text-sm text-muted-foreground">
          请先登录后查看账户。
        </div>

        <div v-else-if="errorMessage" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          加载失败：{{ errorMessage }}
        </div>

        <div v-else-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="i in 6" :key="i" class="h-32 animate-pulse rounded-xl bg-muted/50" />
        </div>

        <div v-else>
          <div v-if="!visibleAccounts.length" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/5 py-12 text-center">
            <EmptyStateIllustration class="mb-6 w-48 opacity-50" />
            <h3 class="text-lg font-semibold">暂无资产账户</h3>
            <p class="mt-2 text-sm text-muted-foreground max-w-sm">
              {{ accounts.length ? '已归档账户已隐藏，可在右上角切换显示。' : '你还没有创建任何账户。点击右上角“新建账户”开始记录你的资产。' }}
            </p>
            <Button class="mt-6" @click="createOpen = true">
              <AppIcon name="lucide:plus" :size="16" class="mr-2" />
              新建账户
            </Button>
          </div>

          <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card 
              v-for="acc in visibleAccounts" 
              :key="acc.id" 
              class="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/20"
              :class="{ 'opacity-60 grayscale': acc.is_archived }"
            >
              <CardHeader class="flex flex-row items-start justify-between space-y-0 pb-2">
                <div class="space-y-1">
                  <CardTitle class="text-base font-medium leading-none flex items-center gap-2">
                    {{ acc.name }}
                    <span v-if="acc.is_archived" class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">已归档</span>
                  </CardTitle>
                  <div class="text-xs text-muted-foreground font-mono">{{ acc.currency }}</div>
                </div>
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <AppIcon :name="iconForType(acc.type)" :size="16" />
                </div>
              </CardHeader>
              <CardContent>
                <div class="mt-2 flex items-center justify-between">
                  <span class="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                    {{ labelForType(acc.type) }}
                  </span>
                  <div class="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <Button variant="ghost" size="icon" class="h-7 w-7 rounded-lg border border-border/60 bg-background/70 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground" :title="'编辑账户'" :aria-label="'编辑账户'" @click="openEdit(acc)">
                      <AppIcon name="lucide:pencil" :size="14" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 rounded-lg border border-border/60 bg-background/70 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground"
                      :title="'调整余额'"
                      :aria-label="'调整余额'"
                      @click="requestAdjust(acc)"
                    >
                      <AppIcon name="lucide:settings-2" :size="14" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      class="h-7 w-7 rounded-lg border border-border/60 bg-background/70 text-amber-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700" 
                      :title="acc.is_archived ? '恢复归档' : '归档账户'"
                      :aria-label="acc.is_archived ? '恢复归档' : '归档账户'"
                      @click="requestArchive(acc)"
                    >
                      <AppIcon :name="acc.is_archived ? 'lucide:rotate-ccw' : 'lucide:archive'" :size="14" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 rounded-lg border border-border/60 bg-background/70 text-destructive hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      :title="'删除账户'"
                      :aria-label="'删除账户'"
                      @click="requestDelete(acc)"
                    >
                      <AppIcon name="lucide:trash" :size="14" />
                    </Button>
                  </div>
                </div>
                <div class="mt-4">
                  <div class="text-xs text-muted-foreground">余额/净值</div>
                  <div class="mt-1 text-lg font-semibold font-numeric tabular-nums">
                    {{
                      acc.type === 'stock'
                        ? `¥${(latestSnapshots[acc.id] ?? 0).toFixed(2)}`
                        : `¥${(balances[acc.id] ?? 0).toFixed(2)}`
                    }}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <div
    v-if="deleteOpen"
    class="fixed inset-0 z-50 flex items-end justify-center bg-background/40 p-4 backdrop-blur-sm md:items-center"
    @click.self="deleteOpen = false"
  >
    <div class="w-full max-w-md rounded-3xl border border-border/70 bg-card/95 p-6 shadow-[0_46px_110px_-60px_rgba(8,12,20,0.6)] backdrop-blur">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-xs uppercase tracking-[0.28em] text-muted-foreground">删除账户</div>
          <div class="mt-2 text-xl font-semibold">
            {{ deleteTarget?.name || '账户' }}
          </div>
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
        删除账户会移除该账户本身，若存在流水记录将无法删除。
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
    v-if="archiveOpen"
    class="fixed inset-0 z-50 flex items-end justify-center bg-background/40 p-4 backdrop-blur-sm md:items-center"
    @click.self="archiveOpen = false"
  >
    <div class="w-full max-w-md rounded-3xl border border-border/70 bg-card/95 p-6 shadow-[0_46px_110px_-60px_rgba(8,12,20,0.6)] backdrop-blur">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            {{ archiveNextStatus ? '归档账户' : '恢复账户' }}
          </div>
          <div class="mt-2 text-xl font-semibold">
            {{ archiveTarget?.name || '账户' }}
          </div>
        </div>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
          @click="archiveOpen = false"
        >
          <AppIcon name="lucide:x" :size="18" />
        </button>
      </div>
      <p class="mt-4 text-sm text-muted-foreground">
        {{ archiveNextStatus ? '归档后会在默认视图隐藏，但历史流水与统计仍保留。' : '恢复后将重新在账户列表中显示。' }}
      </p>
      <div v-if="archiveError" class="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {{ archiveError }}
      </div>
      <div class="mt-6 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" @click="archiveOpen = false">取消</Button>
        <Button type="button" :disabled="archiving" @click="confirmArchive">
          {{ archiving ? '处理中...' : (archiveNextStatus ? '确认归档' : '确认恢复') }}
        </Button>
      </div>
    </div>
  </div>

  <div
    v-if="adjustOpen"
    class="fixed inset-0 z-50 flex items-end justify-center bg-background/40 p-4 backdrop-blur-sm md:items-center"
    @click.self="adjustOpen = false"
  >
    <div class="w-full max-w-md rounded-3xl border border-border/70 bg-card/95 p-6 shadow-[0_46px_110px_-60px_rgba(8,12,20,0.6)] backdrop-blur">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-xs uppercase tracking-[0.28em] text-muted-foreground">余额调整</div>
          <div class="mt-2 text-xl font-semibold">{{ adjustTarget?.name || '账户' }}</div>
        </div>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
          @click="adjustOpen = false"
        >
          <AppIcon name="lucide:x" :size="18" />
        </button>
      </div>
      <div class="mt-4 space-y-3">
        <div class="space-y-2">
          <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">调整金额</label>
          <input
            v-model="adjustAmount"
            inputmode="decimal"
            placeholder="正数增加，负数减少"
            class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
        </div>
        <div class="space-y-2">
          <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">备注</label>
          <input
            v-model="adjustNote"
            placeholder="可选"
            class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
        </div>
      </div>
      <div v-if="adjustError" class="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {{ adjustError }}
      </div>
      <div class="mt-6 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" @click="adjustOpen = false">取消</Button>
        <Button type="button" :disabled="adjusting" @click="confirmAdjust">
          {{ adjusting ? '处理中...' : '确认调整' }}
        </Button>
      </div>
    </div>
  </div>

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
              创建账户
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

        <form class="space-y-5" @submit.prevent="createAccount">
          <div class="space-y-2">
            <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              名称
            </label>
            <input
              v-model="name"
              required
              placeholder="例如 现金、招商信用卡、港股账户"
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                类型
              </label>
              <select
                v-model="type"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="cash">
                  现金
                </option>
                <option value="credit">
                  信用
                </option>
                <option value="stock">
                  股票
                </option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                币种
              </label>
              <select
                v-model="currency"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="CNY">
                  CNY
                </option>
                <option value="USD">
                  USD
                </option>
                <option value="HKD">
                  HKD
                </option>
              </select>
            </div>
          </div>

          <div v-if="createError" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            创建失败：{{ createError }}
          </div>

          <div class="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" @click="createOpen = false">
              取消
            </Button>
            <Button type="submit" :disabled="creating || !name.trim()">
              {{ creating ? '创建中...' : '创建' }}
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
              更新账户
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
          <div class="space-y-2">
            <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              名称
            </label>
            <input
              v-model="editName"
              required
              placeholder="例如 现金、招商信用卡、港股账户"
              class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                类型
              </label>
              <select
                v-model="editType"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="cash">
                  现金
                </option>
                <option value="credit">
                  信用
                </option>
                <option value="stock">
                  股票
                </option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                币种
              </label>
              <select
                v-model="editCurrency"
                class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="CNY">
                  CNY
                </option>
                <option value="USD">
                  USD
                </option>
                <option value="HKD">
                  HKD
                </option>
              </select>
            </div>
          </div>

          <div v-if="editError" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            更新失败：{{ editError }}
          </div>

          <div class="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" @click="editOpen = false">
              取消
            </Button>
            <Button type="submit" :disabled="editing || !editName.trim()">
              {{ editing ? '保存中...' : '保存' }}
            </Button>
          </div>
        </form>
      </div>
    </div>
</template>
