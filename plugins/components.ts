import AppIcon from '~/components/AppIcon.vue'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('AppIcon', AppIcon)
})
