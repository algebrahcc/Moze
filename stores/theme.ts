import { defineStore } from 'pinia'
import { computed, watch } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const mode = useCookie<ThemeMode>('moze_theme', {
    default: () => 'system',
  })

  const resolved = ref<ResolvedTheme>('light')
  const initialized = ref(false)

  function computeResolved(): ResolvedTheme {
    if (!process.client) return 'light'
    if (mode.value === 'light' || mode.value === 'dark') return mode.value
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  function apply() {
    if (!process.client) return
    const next = computeResolved()
    resolved.value = next
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  function setMode(next: ThemeMode) {
    mode.value = next
  }

  function cycleMode() {
    const next: ThemeMode = mode.value === 'system' ? 'light' : mode.value === 'light' ? 'dark' : 'system'
    mode.value = next
  }

  function init() {
    if (!process.client || initialized.value) return
    initialized.value = true

    apply()

    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
    const handler = () => {
      if (mode.value === 'system') apply()
    }
    if (mql?.addEventListener) mql.addEventListener('change', handler)

    onScopeDispose(() => {
      if (mql?.removeEventListener) mql.removeEventListener('change', handler)
    })
  }

  watch(mode, () => apply(), { immediate: true })

  const label = computed(() => {
    if (mode.value === 'system') return '跟随系统'
    if (mode.value === 'light') return '亮色'
    return '暗色'
  })

  return { mode, resolved, label, init, setMode, cycleMode }
})

