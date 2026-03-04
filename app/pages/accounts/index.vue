<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import EmptyStateIllustration from '@/components/illustrations/EmptyStateIllustration.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { storeToRefs } from 'pinia'
import { useAccountsStore, type Account, type AccountType } from '@/stores/accounts'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const accountsStore = useAccountsStore()
const { loading, errorMessage, accounts, balances, latestSnapshots } = storeToRefs(accountsStore)

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
  await accountsStore.load()
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

  await accountsStore.load()
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
  await accountsStore.load()
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
  await accountsStore.load()
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
  await accountsStore.load()
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
  await accountsStore.loadBalances()
}

watchEffect(() => {
  if (user.value) {
    accountsStore.load()
    return
  }
  accountsStore.clear()
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

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div v-if="!user" class="col-span-full rounded-xl border border-dashed border-border/70 bg-background/40 p-8 text-sm text-muted-foreground text-center">
        请先登录后查看账户。
      </div>

      <div v-else-if="errorMessage" class="col-span-full rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        加载失败：{{ errorMessage }}
      </div>

      <div v-else-if="loading" class="col-span-full grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 6" :key="i" class="h-36 animate-pulse rounded-xl bg-muted/50" />
      </div>

      <div v-else-if="!visibleAccounts.length" class="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/5 py-12 text-center">
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

      <Card 
        v-for="acc in visibleAccounts" 
        :key="acc.id" 
        class="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/60 bg-card/60 backdrop-blur-sm"
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
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <AppIcon :name="iconForType(acc.type)" :size="20" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="mt-4">
            <div class="text-xs text-muted-foreground">余额/净值</div>
            <div class="mt-1 text-2xl font-bold font-numeric tabular-nums tracking-tight">
              {{
                acc.type === 'stock'
                  ? `¥${(latestSnapshots[acc.id] ?? 0).toFixed(2)}`
                  : `¥${(balances[acc.id] ?? 0).toFixed(2)}`
              }}
            </div>
          </div>
          
          <div class="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
            <span class="inline-flex items-center gap-1.5 rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-muted-foreground">
              {{ labelForType(acc.type) }}
            </span>
            <div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="icon" class="h-8 w-8 rounded-lg hover:bg-background hover:text-foreground hover:shadow-sm" :title="'编辑账户'" :aria-label="'编辑账户'" @click="openEdit(acc)">
                <AppIcon name="lucide:pencil" :size="14" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 rounded-lg hover:bg-background hover:text-foreground hover:shadow-sm"
                :title="'调整余额'"
                :aria-label="'调整余额'"
                @click="requestAdjust(acc)"
              >
                <AppIcon name="lucide:settings-2" :size="14" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                class="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-700" 
                :title="acc.is_archived ? '恢复归档' : '归档账户'"
                :aria-label="acc.is_archived ? '恢复归档' : '归档账户'"
                @click="requestArchive(acc)"
              >
                <AppIcon :name="acc.is_archived ? 'lucide:rotate-ccw' : 'lucide:archive'" :size="14" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                :title="'删除账户'"
                :aria-label="'删除账户'"
                @click="requestDelete(acc)"
              >
                <AppIcon name="lucide:trash" :size="14" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
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
          <div class="text-xs font-medium uppercase tracking-wider text-destructive">删除账户</div>
          <div class="mt-1 text-xl font-bold text-foreground">
            {{ deleteTarget?.name || '账户' }}
          </div>
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
        删除账户会移除该账户本身，若存在流水记录将无法删除。
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
    v-if="archiveOpen"
    class="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-4 backdrop-blur-sm md:items-center"
    @click.self="archiveOpen = false"
  >
    <div class="w-full max-w-md rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl backdrop-blur-xl md:p-8 animate-in fade-in zoom-in-95 duration-200">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-xs font-medium uppercase tracking-wider text-primary">
            {{ archiveNextStatus ? '归档账户' : '恢复账户' }}
          </div>
          <div class="mt-1 text-xl font-bold text-foreground">
            {{ archiveTarget?.name || '账户' }}
          </div>
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          @click="archiveOpen = false"
        >
          <AppIcon name="lucide:x" :size="18" />
        </button>
      </div>
      <p class="mt-4 text-sm text-muted-foreground leading-relaxed">
        {{ archiveNextStatus ? '归档后会在默认视图隐藏，但历史流水与统计仍保留。' : '恢复后将重新在账户列表中显示。' }}
      </p>
      <div v-if="archiveError" class="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {{ archiveError }}
      </div>
      <div class="mt-6 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="archiveOpen = false">取消</Button>
        <Button type="button" class="shadow-lg shadow-primary/20" :disabled="archiving" @click="confirmArchive">
          {{ archiving ? '处理中...' : (archiveNextStatus ? '确认归档' : '确认恢复') }}
        </Button>
      </div>
    </div>
  </div>

  <div
    v-if="adjustOpen"
    class="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-4 backdrop-blur-sm md:items-center"
    @click.self="adjustOpen = false"
  >
    <div class="w-full max-w-md rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl backdrop-blur-xl md:p-8 animate-in fade-in zoom-in-95 duration-200">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-xs font-medium uppercase tracking-wider text-primary">余额调整</div>
          <div class="mt-1 text-xl font-bold text-foreground">{{ adjustTarget?.name || '账户' }}</div>
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          @click="adjustOpen = false"
        >
          <AppIcon name="lucide:x" :size="18" />
        </button>
      </div>
      <div class="mt-6 space-y-4">
        <div class="space-y-2">
          <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">调整金额</label>
          <div class="relative">
            <input
              v-model="adjustAmount"
              inputmode="decimal"
              placeholder="正数增加，负数减少"
              class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary font-numeric"
            >
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">备注</label>
          <input
            v-model="adjustNote"
            placeholder="可选"
            class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
          >
        </div>
      </div>
      <div v-if="adjustError" class="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {{ adjustError }}
      </div>
      <div class="mt-6 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="adjustOpen = false">取消</Button>
        <Button type="button" class="shadow-lg shadow-primary/20" :disabled="adjusting" @click="confirmAdjust">
          {{ adjusting ? '处理中...' : '确认调整' }}
        </Button>
      </div>
    </div>
  </div>

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
              创建账户
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

        <form class="space-y-6" @submit.prevent="createAccount">
          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              名称
            </label>
            <input
              v-model="name"
              required
              placeholder="例如 现金、招商信用卡、港股账户"
              class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
            >
          </div>

          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                类型
              </label>
              <div class="relative">
                <select
                  v-model="type"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="cash">现金</option>
                  <option value="credit">信用</option>
                  <option value="stock">股票</option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                币种
              </label>
              <div class="relative">
                <select
                  v-model="currency"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="CNY">CNY</option>
                  <option value="USD">USD</option>
                  <option value="HKD">HKD</option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div v-if="createError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            创建失败：{{ createError }}
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="createOpen = false">
              取消
            </Button>
            <Button type="submit" class="shadow-lg shadow-primary/20" :disabled="creating || !name.trim()">
              {{ creating ? '创建中...' : '创建' }}
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
              更新账户
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
          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              名称
            </label>
            <input
              v-model="editName"
              required
              placeholder="例如 现金、招商信用卡、港股账户"
              class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
            >
          </div>

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
                  <option value="cash">现金</option>
                  <option value="credit">信用</option>
                  <option value="stock">股票</option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                币种
              </label>
              <div class="relative">
                <select
                  v-model="editCurrency"
                  class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="CNY">CNY</option>
                  <option value="USD">USD</option>
                  <option value="HKD">HKD</option>
                </select>
                <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div v-if="editError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            更新失败：{{ editError }}
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="editOpen = false">
              取消
            </Button>
            <Button type="submit" class="shadow-lg shadow-primary/20" :disabled="editing || !editName.trim()">
              {{ editing ? '保存中...' : '保存' }}
            </Button>
          </div>
        </form>
      </div>
    </div>
</template>
