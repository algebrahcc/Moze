<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { BaseChart } from '@/components/ui/chart'
import { useReports } from '@/app/composables/useReports'

const { selectedYear } = useReports()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const monthlyTrendData = ref<{ label: string; income: number; expense: number }[]>([])
const classified = ref<{ label: string; operating: number; investing: number; financing: number }[]>([])

const months = Array.from({ length: 12 }, (_, i) => i + 1)
function label(m: number) { return `${m}月` }

async function loadYearTx() {
  if (!user.value) return
  loading.value = true
  errorMessage.value = null
  const year = selectedYear.value
  const start = new Date(year, 0, 1).toISOString()
  const end = new Date(year + 1, 0, 1).toISOString()
  const [{ data: tx }, { data: accs }] = await Promise.all([
    supabase.from('transactions').select('type,amount,account_id,to_account_id,occurred_at').gte('occurred_at', start).lt('occurred_at', end),
    supabase.from('accounts').select('id,account_group'),
  ])
  const groupMap = new Map<string, string>()
  for (const a of accs ?? []) groupMap.set(String((a as any).id), String((a as any).account_group))
  const buckets = months.map((m) => ({ label: label(m), income: 0, expense: 0 }))
  const cf = months.map((m) => ({ label: label(m), operating: 0, investing: 0, financing: 0 }))
  for (const t of tx ?? []) {
    const d = new Date((t as any).occurred_at)
    const idx = d.getMonth()
    const amt = Number((t as any).amount ?? 0)
    if ((t as any).type === 'income') buckets[idx]!.income += amt
    if ((t as any).type === 'expense') buckets[idx]!.expense += amt
    const fromGroup = groupMap.get(String((t as any).account_id)) || 'daily'
    const toGroup = groupMap.get(String((t as any).to_account_id || '')) || ''
    let type: 'operating' | 'investing' | 'financing' = 'operating'
    if (fromGroup === 'liability' || toGroup === 'liability') type = 'financing'
    else if (fromGroup === 'investment' || toGroup === 'investment') type = 'investing'
    if ((t as any).type === 'income') cf[idx]![type] += amt
    if ((t as any).type === 'expense') cf[idx]![type] -= amt
    if ((t as any).type === 'transfer') {
      const signFrom = -amt
      const signTo = +amt
      if (fromGroup === 'liability') cf[idx]!.financing += signFrom
      else if (fromGroup === 'investment') cf[idx]!.investing += signFrom
      else cf[idx]!.operating += signFrom
      if (toGroup) {
        if (toGroup === 'liability') cf[idx]!.financing += signTo
        else if (toGroup === 'investment') cf[idx]!.investing += signTo
        else cf[idx]!.operating += signTo
      }
    }
  }
  monthlyTrendData.value = buckets
  classified.value = cf
  loading.value = false
}

onMounted(() => {
  loadYearTx()
})
watch(selectedYear, () => {
  loadYearTx()
})

const netFlowData = computed(() => monthlyTrendData.value.map((d) => ({ x: d.label, y: d.income - d.expense, series: '净流' })))
const operatingData = computed(() => classified.value.map((d) => ({ x: d.label, y: d.operating, series: '经营' })))
const investingData = computed(() => classified.value.map((d) => ({ x: d.label, y: d.investing, series: '投资' })))
const financingData = computed(() => classified.value.map((d) => ({ x: d.label, y: d.financing, series: '筹资' })))
</script>

<template>
  <div class="space-y-8 pb-10">
    <div class="flex items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <AppIcon name="lucide:repeat" :size="24" class="text-primary" />
          <h1 class="text-3xl font-bold tracking-tight">现金流量表</h1>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">按月度统计现金净流入/净流出</p>
      </div>
      <div class="relative">
        <select v-model="selectedYear" class="h-10 appearance-none rounded-xl border border-border/50 bg-background/50 pl-4 pr-10 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary backdrop-blur-md">
          <option v-for="y in [selectedYear, selectedYear-1, selectedYear-2, selectedYear-3, selectedYear-4]" :key="y" :value="y">{{ y }}年</option>
        </select>
        <AppIcon name="lucide:chevron-down" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
      {{ errorMessage }}
    </div>
    <div v-else-if="loading" class="flex items-center justify-center py-16 text-muted-foreground">
      <AppIcon name="lucide:loader-2" :size="32" class="animate-spin opacity-50" />
    </div>
    <div v-else class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl">
        <div class="h-[300px] w-full">
          <ClientOnly>
            <BaseChart type="line" :data="netFlowData" :colors="['#64748b']" :legend-items="[{label:'净流',color:'#64748b'}]" />
          </ClientOnly>
        </div>
      </div>
      <div class="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-muted-foreground">
              <th class="px-3 py-2 text-left">月份</th>
              <th class="px-3 py-2 text-right">净流</th>
              <th class="px-3 py-2 text-right">收入</th>
              <th class="px-3 py-2 text-right">支出</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in monthlyTrendData" :key="d.label" class="border-t border-border/40">
              <td class="px-3 py-2">{{ d.label }}</td>
              <td class="px-3 py-2 text-right font-numeric" :class="(d.income - d.expense) >= 0 ? 'text-red-600' : 'text-emerald-600'">{{ (d.income - d.expense).toFixed(2) }}</td>
              <td class="px-3 py-2 text-right font-numeric text-red-600">{{ d.income.toFixed(2) }}</td>
              <td class="px-3 py-2 text-right font-numeric text-emerald-600">{{ d.expense.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl lg:col-span-2">
        <div class="h-[300px] w-full">
          <ClientOnly>
            <BaseChart type="grouped" :data="[...operatingData, ...investingData, ...financingData]" :colors="['#ef4444','#22c55e','#3b82f6']" :legend-items="[{label:'经营',color:'#ef4444'},{label:'投资',color:'#22c55e'},{label:'筹资',color:'#3b82f6'}]" />
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>
