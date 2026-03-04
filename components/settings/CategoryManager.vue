<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { storeToRefs } from 'pinia'
import { useCategoriesStore, type Category } from '@/stores/categories'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const categoriesStore = useCategoriesStore()
const { loading, errorMessage, parents, childrenMap } = storeToRefs(categoriesStore)

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
  await categoriesStore.load()
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

  const { error } = await supabase.from('categories').update(payload).eq('id', editId.value)

  editing.value = false

  if (error) {
    editError.value = error.message
    return
  }

  editOpen.value = false
  editId.value = null
  await categoriesStore.load()
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

  const { error } = await supabase.from('categories').delete().eq('id', deleteTarget.value.id)

  deleting.value = false

  if (error) {
    deleteError.value = error.message
    return
  }

  deleteOpen.value = false
  deleteTarget.value = null
  await categoriesStore.load()
}

const iconMap: Record<string, string> = {
  餐饮: 'lucide:utensils',
  交通: 'lucide:car',
  居家: 'lucide:home',
  购物: 'lucide:shopping-bag',
  娱乐: 'lucide:gamepad-2',
  医疗: 'lucide:stethoscope',
  学习: 'lucide:book-open',
  旅行: 'lucide:plane',
  收入: 'lucide:wallet',
}

function getCategoryIcon(name: string) {
  return iconMap[name] || 'lucide:folder'
}

watchEffect(() => {
  if (user.value) {
    categoriesStore.load()
    return
  }
  categoriesStore.clear()
})
</script>

<template>
  <div class="space-y-8 pb-10">
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:layers" :size="24" class="text-primary" />
          <h1 class="text-3xl font-bold tracking-tight text-foreground/90">
            分类管理
          </h1>
        </div>
        <p class="mt-2 text-base text-muted-foreground">
          管理您的收支分类体系
        </p>
      </div>
      <Button size="lg" class="shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" @click="createOpen = true">
        <span class="inline-flex items-center gap-2">
          <AppIcon name="lucide:plus" :size="18" />
          新建分类
        </span>
      </Button>
    </div>

    <div v-if="!user" class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/30 py-16 text-center">
      <AppIcon name="lucide:lock" :size="48" class="mb-4 text-muted-foreground/50" />
      <h3 class="text-lg font-medium">请先登录</h3>
      <p class="text-sm text-muted-foreground">登录后即可管理您的分类</p>
    </div>

    <div v-else-if="errorMessage" class="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
      <div class="flex items-center gap-2 font-semibold">
        <AppIcon name="lucide:alert-circle" :size="16" />
        加载失败
      </div>
      <p class="mt-1 opacity-90">{{ errorMessage }}</p>
    </div>

    <div v-else-if="loading" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-32 animate-pulse rounded-2xl bg-muted/50" />
    </div>

    <div v-else class="space-y-6">
      <div v-if="!parents.length" class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/30 py-16 text-center">
        <EmptyStateIllustration class="mb-6 w-48 opacity-50 grayscale" />
        <h3 class="text-lg font-medium text-foreground/80">还没有分类</h3>
        <p class="mt-2 text-sm text-muted-foreground">
          点击右上角“新建分类”开始创建。
        </p>
      </div>

      <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="p in parents"
          :key="p.id"
          class="group border-border/50 bg-card/60 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl hover:-translate-y-1"
        >
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-border/40">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <AppIcon :name="getCategoryIcon(p.name)" :size="20" />
              </div>
              <div>
                <CardTitle class="text-base font-bold text-foreground">{{ p.name }}</CardTitle>
                <div class="text-xs text-muted-foreground mt-0.5">一级分类</div>
              </div>
            </div>
            <div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-primary" @click="openEdit(p)">
                <AppIcon name="lucide:pencil" :size="14" />
              </Button>
              <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-destructive" @click="requestDelete(p)">
                <AppIcon name="lucide:trash" :size="14" />
              </Button>
            </div>
          </CardHeader>
          <CardContent class="pt-4">
            <div v-if="!childrenMap[p.id]?.length" class="flex flex-col items-center justify-center py-4 text-xs text-muted-foreground">
              <AppIcon name="lucide:folder-open" :size="24" class="mb-2 opacity-30" />
              暂无二级分类
            </div>
            <div v-else class="space-y-1">
              <div
                v-for="c in childrenMap[p.id]"
                :key="c.id"
                class="group/item flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                <div class="flex items-center gap-2 text-foreground/80">
                  <div class="h-1.5 w-1.5 rounded-full bg-border/80" />
                  {{ c.name }}
                </div>
                <div class="flex gap-1 opacity-0 transition-opacity group-hover/item:opacity-100">
                  <Button variant="ghost" size="icon" class="h-6 w-6 text-muted-foreground hover:text-primary" @click="openEdit(c)">
                    <AppIcon name="lucide:pencil" :size="12" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-6 w-6 text-muted-foreground hover:text-destructive" @click="requestDelete(c)">
                    <AppIcon name="lucide:trash" :size="12" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <div class="text-xs font-medium uppercase tracking-wider text-primary">新建</div>
          <div class="mt-1 text-2xl font-bold tracking-tight text-foreground">分类</div>
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          @click="createOpen = false"
        >
          <AppIcon name="lucide:x" :size="18" />
        </button>
      </div>

      <form class="space-y-6" @submit.prevent="createCategory">
        <div class="space-y-2">
          <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">上级（可选）</label>
          <div class="relative">
            <select
              v-model="createParentId"
              class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">一级分类</option>
              <option v-for="c in parents" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
            <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">名称</label>
          <input
            v-model="createName"
            required
            placeholder="例如 餐饮、交通、工资"
            class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
          >
        </div>
        <div v-if="createError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          创建失败：{{ createError }}
        </div>
        <div class="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="createOpen = false">取消</Button>
          <Button type="submit" class="shadow-lg shadow-primary/20" :disabled="creating || !createName.trim()">
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
          <div class="text-xs font-medium uppercase tracking-wider text-primary">编辑</div>
          <div class="mt-1 text-2xl font-bold tracking-tight text-foreground">分类</div>
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
          <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">上级（可选）</label>
          <div class="relative">
            <select
              v-model="editParentId"
              class="h-11 w-full appearance-none rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">一级分类</option>
              <option v-for="c in parents.filter((p) => p.id !== editId)" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
            <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">名称</label>
          <input
            v-model="editName"
            required
            placeholder="例如 餐饮、交通、工资"
            class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
          >
        </div>
        <div v-if="editError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          保存失败：{{ editError }}
        </div>
        <div class="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="editOpen = false">取消</Button>
          <Button type="submit" class="shadow-lg shadow-primary/20" :disabled="editing || !editName.trim()">
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
          <div class="mt-1 text-xl font-bold text-foreground">{{ deleteTarget?.name || '分类' }}</div>
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
        删除后将无法恢复。
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
</template>

