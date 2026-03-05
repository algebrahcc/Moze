<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { Button } from '@/components/ui/button'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

type TagRow = {
  id: string
  name: string
  color: string | null
  created_at: string
}

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const tags = ref<TagRow[]>([])

const createOpen = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const createName = ref('')
const createColor = ref('#10b981')

const editOpen = ref(false)
const editing = ref(false)
const editError = ref<string | null>(null)
const editId = ref<string | null>(null)
const editName = ref('')
const editColor = ref('#10b981')

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const deleteId = ref<string | null>(null)

async function loadTags() {
  if (!user.value) {
    tags.value = []
    return
  }
  loading.value = true
  errorMessage.value = null
  const { data, error } = await supabase
    .from('tags')
    .select('id,name,color,created_at')
    .order('name', { ascending: true })
  loading.value = false
  if (error) {
    errorMessage.value = error.message
    tags.value = []
    return
  }
  tags.value = (data ?? []) as TagRow[]
}

async function createTag() {
  if (!user.value) return
  creating.value = true
  createError.value = null
  const payload = { name: createName.value.trim(), color: (createColor.value || '').trim() || null }
  const { error } = await supabase.from('tags').insert(payload)
  creating.value = false
  if (error) {
    createError.value = error.message
    return
  }
  createOpen.value = false
  createName.value = ''
  createColor.value = '#10b981'
  await loadTags()
}

function openEdit(t: TagRow) {
  editId.value = t.id
  editName.value = t.name
  editColor.value = t.color || '#10b981'
  editError.value = null
  editOpen.value = true
}

async function saveEdit() {
  if (!user.value || !editId.value) return
  editing.value = true
  editError.value = null
  const payload = { name: editName.value.trim(), color: (editColor.value || '').trim() || null }
  const { error } = await supabase.from('tags').update(payload).eq('id', editId.value)
  editing.value = false
  if (error) {
    editError.value = error.message
    return
  }
  editOpen.value = false
  editId.value = null
  await loadTags()
}

function requestDelete(t: TagRow) {
  deleteId.value = t.id
  deleteError.value = null
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!user.value || !deleteId.value) return
  deleting.value = true
  deleteError.value = null
  const { error } = await supabase.from('tags').delete().eq('id', deleteId.value)
  deleting.value = false
  if (error) {
    deleteError.value = error.message
    return
  }
  deleteOpen.value = false
  deleteId.value = null
  await loadTags()
}

watchEffect(() => {
  if (user.value) loadTags()
  else {
    tags.value = []
  }
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:book-open" :size="20" class="text-muted-foreground" />
          <h1 class="text-2xl font-semibold tracking-tight">标签管理</h1>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">用于辅助筛选与报表分析的轻量标签</p>
      </div>
      <div class="flex items-center gap-2">
        <Button size="sm" @click="createOpen = true">
          <AppIcon name="lucide:plus" :size="16" class="mr-2" />
          新建标签
        </Button>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      {{ errorMessage }}
    </div>

    <div v-else-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-24 animate-pulse rounded-xl bg-muted/50" />
    </div>

    <div v-else>
      <div v-if="!tags.length" class="rounded-xl border border-dashed border-border/60 bg-muted/5 p-8 text-sm text-muted-foreground text-center">
        暂无标签，点击右上角“新建标签”进行创建。
      </div>
      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="t in tags"
          :key="t.id"
          class="group flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <div class="flex items-center gap-3">
            <div class="h-8 w-8 rounded-lg border" :style="{ borderColor: t.color || '#e5e7eb', background: (t.color || '#e5e7eb') + '20' }" />
            <div class="min-w-0">
              <div class="text-sm font-semibold">{{ t.name }}</div>
              <div class="text-xs text-muted-foreground">{{ t.color || '未设置颜色' }}</div>
            </div>
          </div>
          <div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon" class="h-8 w-8 rounded-lg hover:bg-background hover:text-foreground hover:shadow-sm" title="编辑" @click="openEdit(t)">
              <AppIcon name="lucide:pen-line" :size="14" />
            </Button>
            <Button variant="ghost" size="icon" class="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" title="删除" @click="requestDelete(t)">
              <AppIcon name="lucide:trash" :size="14" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="createOpen" class="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-4 backdrop-blur-sm md:items-center" @click.self="createOpen = false">
      <div class="w-full max-w-md rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl backdrop-blur-xl md:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-xs font-medium uppercase tracking-wider text-primary">新建</div>
            <div class="mt-1 text-xl font-bold text-foreground">创建标签</div>
          </div>
          <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="createOpen = false">
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>

        <div class="mt-6 space-y-4">
          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">名称</label>
            <input v-model="createName" placeholder="如 工作、家庭、学习..." class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">颜色</label>
            <input v-model="createColor" placeholder="#10b981" class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary font-mono" />
          </div>
          <div v-if="createError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {{ createError }}
          </div>
          <div class="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="createOpen = false">取消</Button>
            <Button type="button" class="shadow-lg shadow-primary/20" :disabled="creating || !createName.trim()" @click="createTag">
              {{ creating ? '创建中...' : '创建' }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="editOpen" class="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-4 backdrop-blur-sm md:items-center" @click.self="editOpen = false">
      <div class="w-full max-w-md rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl backdrop-blur-xl md:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-xs font-medium uppercase tracking-wider text-primary">编辑</div>
            <div class="mt-1 text-xl font-bold text-foreground">修改标签</div>
          </div>
          <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="editOpen = false">
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>

        <div class="mt-6 space-y-4">
          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">名称</label>
            <input v-model="editName" class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">颜色</label>
            <input v-model="editColor" class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary font-mono" />
          </div>
          <div v-if="editError" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {{ editError }}
          </div>
          <div class="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" class="border-border/50 hover:bg-muted/50" @click="editOpen = false">取消</Button>
            <Button type="button" class="shadow-lg shadow-primary/20" :disabled="editing || !editName.trim()" @click="saveEdit">
              {{ editing ? '保存中...' : '保存' }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Modal -->
    <div v-if="deleteOpen" class="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-4 backdrop-blur-sm md:items-center" @click.self="deleteOpen = false">
      <div class="w-full max-w-md rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl backdrop-blur-xl md:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-xs font-medium uppercase tracking-wider text-destructive">删除标签</div>
            <div class="mt-1 text-xl font-bold text-foreground">确认删除</div>
          </div>
          <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="deleteOpen = false">
            <AppIcon name="lucide:x" :size="18" />
          </button>
        </div>
        <p class="mt-4 text-sm text-muted-foreground leading-relaxed">删除后不可恢复。</p>
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
  </div>
</template>
