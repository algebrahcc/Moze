<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

type Category = {
  id: string
  parent_id: string | null
  name: string
  created_at: string
}

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const categories = ref<Category[]>([])

const createOpen = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const createName = ref('')
const createParentId = ref<string>('')

const editOpen = ref(false)
const editing = ref(false)
const editError = ref<string | null>(null)
const editId = ref<string | null>(null)
const editName = ref('')
const editParentId = ref<string>('')

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const deleteTarget = ref<Category | null>(null)

const parents = computed(() => categories.value.filter((c) => !c.parent_id))
const childrenMap = computed(() => {
  const map: Record<string, Category[]> = {}
  for (const c of categories.value) {
    const parentId = c.parent_id
    if (!parentId) continue
    if (!map[parentId]) map[parentId] = []
    map[parentId].push(c)
  }
  return map
})

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

async function seedDefaultCategories() {
  if (!user.value) return
  const parentNames = defaultCategorySeeds.map((c) => c.name)
  const { data: existingParents, error: existingErr } = await supabase
    .from('categories')
    .select('id,name')
    .is('parent_id', null)
    .in('name', parentNames)
  if (existingErr) {
    errorMessage.value = existingErr.message
    return
  }
  const existingMap = new Map((existingParents ?? []).map((p) => [p.name, p.id]))
  const missingParents = defaultCategorySeeds
    .filter((c) => !existingMap.has(c.name))
    .map((c) => ({ name: c.name, parent_id: null }))
  if (missingParents.length) {
    const { error: insertErr } = await supabase.from('categories').insert(missingParents)
    if (insertErr) {
      errorMessage.value = insertErr.message
      return
    }
  }
  const { data: parentsData, error: parentsErr } = await supabase
    .from('categories')
    .select('id,name')
    .is('parent_id', null)
    .in('name', parentNames)
  if (parentsErr) {
    errorMessage.value = parentsErr.message
    return
  }
  const parentIdMap = new Map((parentsData ?? []).map((p) => [p.name, p.id]))
  const parentIds = (parentsData ?? []).map((p) => p.id)
  const { data: existingChildren, error: childrenErr } = await supabase
    .from('categories')
    .select('id,name,parent_id')
    .in('parent_id', parentIds)
  if (childrenErr) {
    errorMessage.value = childrenErr.message
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
      errorMessage.value = childInsertErr.message
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

async function loadCategories() {
  if (!user.value) return
  loading.value = true
  errorMessage.value = null

  const { data, error } = await supabase
    .from('categories')
    .select('id,parent_id,name,created_at')
    .order('parent_id', { ascending: true })
    .order('name', { ascending: true })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
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
      errorMessage.value = seededErr.message
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
      errorMessage.value = refreshedErr.message
      categories.value = []
      return
    }
    categories.value = (refreshed ?? []) as Category[]
    return
  }

  categories.value = rows
}

async function createCategory() {
  if (!user.value) return
  createError.value = null
  creating.value = true

  const payload = {
    parent_id: createParentId.value || null,
    name: createName.value.trim(),
  }

  const { error } = await supabase.from('categories').insert(payload)
  creating.value = false

  if (error) {
    createError.value = error.message
    return
  }

  createOpen.value = false
  createName.value = ''
  createParentId.value = ''
  await loadCategories()
}

function openEdit(c: Category) {
  editId.value = c.id
  editName.value = c.name
  editParentId.value = c.parent_id ?? ''
  editError.value = null
  editOpen.value = true
}

async function saveEdit() {
  if (!user.value || !editId.value) return
  editError.value = null
  editing.value = true

  const payload = {
    name: editName.value.trim(),
    parent_id: editParentId.value || null,
  }

  const { error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', editId.value)

  editing.value = false

  if (error) {
    editError.value = error.message
    return
  }

  editOpen.value = false
  editId.value = null
  await loadCategories()
}

function requestDelete(c: Category) {
  deleteTarget.value = c
  deleteError.value = null
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!user.value || !deleteTarget.value) return
  deleting.value = true
  deleteError.value = null

  const { count: childCount, error: childErr } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', deleteTarget.value.id)

  if (childErr) {
    deleting.value = false
    deleteError.value = childErr.message
    return
  }

  if ((childCount ?? 0) > 0) {
    deleting.value = false
    deleteError.value = '存在子分类，无法删除。'
    return
  }

  const { count: txCount, error: txErr } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', deleteTarget.value.id)

  if (txErr) {
    deleting.value = false
    deleteError.value = txErr.message
    return
  }

  if ((txCount ?? 0) > 0) {
    deleting.value = false
    deleteError.value = '该分类已有流水使用，无法删除。'
    return
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', deleteTarget.value.id)

  deleting.value = false

  if (error) {
    deleteError.value = error.message
    return
  }

  deleteOpen.value = false
  deleteTarget.value = null
  await loadCategories()
}

watchEffect(() => {
  if (user.value) {
    loadCategories()
    return
  }
  categories.value = []
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:receipt" :size="18" class="text-muted-foreground" />
          <h1 class="text-2xl font-semibold tracking-tight">
            分类管理
          </h1>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">
          管理一级/二级分类
        </p>
      </div>
      <Button @click="createOpen = true">
        <span class="inline-flex items-center gap-2">
          <AppIcon name="lucide:plus" :size="16" />
          新建分类
        </span>
      </Button>
    </div>

    <Card>
      <CardHeader class="text-sm font-medium">
        分类列表
      </CardHeader>
      <CardContent>
        <div v-if="!user" class="rounded-xl border border-dashed border-border/70 bg-background/40 p-8 text-sm text-muted-foreground">
          请先登录后查看分类。
        </div>
        <div v-else-if="errorMessage" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          加载失败：{{ errorMessage }}
        </div>
        <div v-else-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="i in 6" :key="i" class="h-24 animate-pulse rounded-xl bg-muted/50" />
        </div>
        <div v-else class="space-y-4">
          <div v-if="!parents.length" class="rounded-xl border border-dashed border-border/60 bg-muted/5 py-12 text-center text-sm text-muted-foreground">
            还没有分类，请点击右上角“新建分类”。
          </div>
          <div v-else class="grid gap-4 md:grid-cols-2">
            <Card v-for="p in parents" :key="p.id" class="border-border/70 bg-card/90">
              <CardHeader class="flex flex-row items-center justify-between space-y-0">
                <div class="space-y-1">
                  <CardTitle class="text-base font-medium">{{ p.name }}</CardTitle>
                  <div class="text-xs text-muted-foreground">一级分类</div>
                </div>
                <div class="flex gap-1">
                  <Button variant="ghost" size="icon" class="h-7 w-7" @click="openEdit(p)">
                    <AppIcon name="lucide:pencil" :size="14" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive hover:text-destructive" @click="requestDelete(p)">
                    <AppIcon name="lucide:trash" :size="14" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div v-if="!childrenMap[p.id]?.length" class="text-xs text-muted-foreground">
                  暂无二级分类
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="c in childrenMap[p.id]"
                    :key="c.id"
                    class="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2"
                  >
                    <span class="text-sm">{{ c.name }}</span>
                    <div class="flex gap-1">
                      <Button variant="ghost" size="icon" class="h-7 w-7" @click="openEdit(c)">
                        <AppIcon name="lucide:pencil" :size="14" />
                      </Button>
                      <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive hover:text-destructive" @click="requestDelete(c)">
                        <AppIcon name="lucide:trash" :size="14" />
                      </Button>
                    </div>
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
    v-if="createOpen"
    class="fixed inset-0 z-50 flex items-end justify-center bg-background/40 p-4 backdrop-blur-sm md:items-center"
    @click.self="createOpen = false"
  >
    <div class="w-full max-w-xl rounded-3xl border border-border/70 bg-card/95 p-6 shadow-[0_46px_110px_-60px_rgba(8,12,20,0.6)] backdrop-blur md:p-8">
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <div class="text-xs uppercase tracking-[0.28em] text-muted-foreground">新建</div>
          <div class="mt-2 text-2xl font-semibold tracking-tight">分类</div>
        </div>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
          @click="createOpen = false"
        >
          <AppIcon name="lucide:x" :size="18" />
        </button>
      </div>

      <form class="space-y-5" @submit.prevent="createCategory">
        <div class="space-y-2">
          <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">上级（可选）</label>
          <select
            v-model="createParentId"
            class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">一级分类</option>
            <option v-for="c in parents" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">名称</label>
          <input
            v-model="createName"
            required
            placeholder="例如 餐饮、交通、工资"
            class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
        </div>
        <div v-if="createError" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          创建失败：{{ createError }}
        </div>
        <div class="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" @click="createOpen = false">取消</Button>
          <Button type="submit" :disabled="creating || !createName.trim()">
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
          <div class="text-xs uppercase tracking-[0.28em] text-muted-foreground">编辑</div>
          <div class="mt-2 text-2xl font-semibold tracking-tight">分类</div>
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
          <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">上级（可选）</label>
          <select
            v-model="editParentId"
            class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">一级分类</option>
            <option v-for="c in parents.filter((p) => p.id !== editId)" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-xs uppercase tracking-[0.22em] text-muted-foreground">名称</label>
          <input
            v-model="editName"
            required
            placeholder="例如 餐饮、交通、工资"
            class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
        </div>
        <div v-if="editError" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          保存失败：{{ editError }}
        </div>
        <div class="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" @click="editOpen = false">取消</Button>
          <Button type="submit" :disabled="editing || !editName.trim()">
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
          <div class="mt-2 text-xl font-semibold">{{ deleteTarget?.name || '分类' }}</div>
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
</template>
