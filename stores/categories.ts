import { defineStore } from 'pinia'

export type Category = {
  id: string
  parent_id: string | null
  name: string
  created_at: string
}

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

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

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

  async function seedDefaultCategories() {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
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
    const supabase = useSupabaseClient()
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

  async function load() {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
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

  function clear() {
    categories.value = []
    errorMessage.value = null
    loading.value = false
  }

  return { categories, loading, errorMessage, parents, childrenMap, load, clear }
})
