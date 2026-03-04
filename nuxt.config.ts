import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  ssr: false,
  devtools: { enabled: true },
  devServer: {
    port: 3000
  },
  alias: {
    '@': fileURLToPath(new URL('.', import.meta.url)),
    '~': fileURLToPath(new URL('.', import.meta.url)),
  },
  css: ['~/app/assets/css/tailwind.css'],
  modules: [
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@nuxtjs/supabase'
  ],
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui'
  },
  supabase: {
    redirect: false
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  }
})
