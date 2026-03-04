import { defineStore } from 'pinia'
import { computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = useSupabaseUser()
  const isAuthed = computed(() => Boolean(user.value))

  return { user, isAuthed }
})

