<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { useToast } from '@/app/composables/useToast'

definePageMeta({
  layout: 'auth',
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()
const email = ref('')
const password = ref('')
const loading = ref(false)
const oauthRedirecting = ref(false)
const sent = ref(false)
const signupSent = ref(false)
const resetSent = ref(false)
const errorMessage = ref<string | null>(null)
const mode = ref<'password' | 'signup'>('password')

async function signInWithPassword() {
  errorMessage.value = null
  sent.value = false
  signupSent.value = false
  resetSent.value = false
  loading.value = true

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value,
  })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    toast({ title: '登录失败', description: error.message, variant: 'error' })
    return
  }

  await navigateTo('/dashboard')
}

async function signUpWithPassword() {
  errorMessage.value = null
  sent.value = false
  signupSent.value = false
  resetSent.value = false
  if (!email.value.trim()) {
    errorMessage.value = '请输入邮箱'
    return
  }
  loading.value = true

  const origin = useRequestURL().origin
  const { error } = await supabase.auth.signUp({
    email: email.value.trim(),
    password: password.value,
    options: {
      emailRedirectTo: origin,
    },
  })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    toast({ title: '注册失败', description: error.message, variant: 'error' })
    return
  }

  signupSent.value = true
  toast({ title: '注册成功', description: '请检查邮箱完成验证。', variant: 'success' })
}

async function resetPassword() {
  errorMessage.value = null
  sent.value = false
  signupSent.value = false
  resetSent.value = false
  if (!email.value.trim()) {
    errorMessage.value = '请输入邮箱'
    return
  }
  loading.value = true
  const origin = useRequestURL().origin
  const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: `${origin}/login`,
  })
  loading.value = false
  if (error) {
    errorMessage.value = error.message
    toast({ title: '发送失败', description: error.message, variant: 'error' })
    return
  }
  resetSent.value = true
  toast({ title: '已发送', description: '重置密码邮件已发送，请检查邮箱。', variant: 'success' })
}

async function signInWithGithub() {
  errorMessage.value = null
  loading.value = true
  oauthRedirecting.value = true
  
  const origin = useRequestURL().origin
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/dashboard`,
    },
  })
  
  if (error) {
    loading.value = false
    oauthRedirecting.value = false
    errorMessage.value = 'GitHub 登录失败：' + error.message
    toast({ title: 'GitHub 登录失败', description: error.message, variant: 'error' })
  }
}

watchEffect(() => {
  if (user.value) {
    navigateTo('/dashboard')
  }
})
</script>

<template>
  <div class="flex min-h-screen w-full flex-col lg:flex-row bg-background">
    <!-- Left Side: Branding & Illustration -->
    <div class="relative hidden w-full flex-col justify-between overflow-hidden bg-zinc-900 p-10 text-white lg:flex lg:w-1/2 xl:w-2/3">
      <!-- Gradient Background -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-zinc-900 to-zinc-900" />
      <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 grayscale" />

      <div class="relative z-10 flex h-full flex-col justify-between">
        <!-- Top Left: App Name -->
        <div class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
            <AppIcon name="lucide:wallet" :size="18" class="text-white" />
          </div>
          <div class="text-lg font-bold tracking-tight text-white">
            Moze
          </div>
        </div>

        <!-- Center: Quote -->
        <div class="max-w-md space-y-4">
           <blockquote class="text-2xl font-light leading-relaxed text-zinc-100">
             &ldquo;Don't save what is left after spending, but spend what is left after saving.&rdquo;
           </blockquote>
           <div class="text-sm font-medium text-zinc-400 uppercase tracking-widest">
             Warren Buffett
           </div>
        </div>

        <!-- Bottom: Footer -->
        <div class="text-xs text-zinc-500 font-mono">
          &copy; 2026 Moze Inc.
        </div>
      </div>
    </div>

    <!-- Right Side: Auth Form -->
    <div class="flex w-full flex-col items-center justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-8 xl:w-1/3 bg-background/50 backdrop-blur-3xl">
      <div class="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[380px]">
        <div class="flex flex-col space-y-2 text-center">
          <h1 class="text-3xl font-bold tracking-tight text-foreground">
            {{ mode === 'signup' ? '创建账号' : '欢迎回来' }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ mode === 'signup' ? '输入邮箱开始您的理财之旅' : '输入邮箱登录您的账号' }}
          </p>
        </div>

        <div class="grid gap-6">
          <form @submit.prevent="mode === 'signup' ? signUpWithPassword() : signInWithPassword()">
            <div class="grid gap-4">
              <div class="space-y-2">
                <label for="email" class="text-xs font-medium uppercase tracking-wider text-muted-foreground">邮箱</label>
                <div class="relative">
                  <input
                    id="email"
                    v-model="email"
                    type="email"
                    placeholder="name@example.com"
                    auto-capitalize="none"
                    auto-complete="email"
                    auto-correct="off"
                    :disabled="loading"
                    required
                    class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 pl-10 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                  <AppIcon name="lucide:mail" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label for="password" class="text-xs font-medium uppercase tracking-wider text-muted-foreground">密码</label>
                  <button
                    v-if="mode === 'password'"
                    type="button"
                    class="text-xs text-primary hover:underline underline-offset-4 transition-colors"
                    :disabled="loading"
                    @click="resetPassword"
                  >
                    忘记密码?
                  </button>
                </div>
                <div class="relative">
                  <input
                    id="password"
                    v-model="password"
                    type="password"
                    :disabled="loading"
                    required
                    minlength="6"
                    class="h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 pl-10 text-sm shadow-sm outline-none transition-all hover:bg-background/80 focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                  <AppIcon name="lucide:lock" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <Button :disabled="loading" type="submit" class="h-11 shadow-lg shadow-primary/20 text-base font-medium">
                <AppIcon v-if="loading" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
                {{ mode === 'signup' ? '注册账号' : '立即登录' }}
              </Button>
            </div>
          </form>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t border-border/50" />
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-background px-2 text-muted-foreground">
                其他方式
              </span>
            </div>
          </div>
          
          <div class="grid grid-cols-1 gap-4">
             <Button variant="outline" class="h-11 border-border/50 hover:bg-muted/50 gap-2 text-foreground/80" :disabled="loading" @click="signInWithGithub">
                <AppIcon name="lucide:github" :size="20" />
                GitHub 登录
             </Button>
          </div>

          <div class="text-center">
            <button
              type="button"
              class="text-sm text-muted-foreground hover:text-foreground transition-colors"
              :disabled="loading"
              @click="mode = mode === 'signup' ? 'password' : 'signup'"
            >
              {{ mode === 'signup' ? '已有账号？去登录' : '没有账号？去注册' }}
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
          {{ errorMessage }}
        </div>
        <div v-if="sent" class="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center text-sm text-green-600 dark:text-green-400">
          魔法链接已发送！请检查你的邮箱。
        </div>
        <div v-if="signupSent" class="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center text-sm text-green-600 dark:text-green-400">
          账号已创建！请检查你的邮箱进行验证。
        </div>
        <div v-if="resetSent" class="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center text-sm text-green-600 dark:text-green-400">
          重置密码邮件已发送，请检查邮箱。
        </div>

        <p class="px-8 text-center text-xs text-muted-foreground leading-relaxed">
          点击登录即表示您同意我们的
          <a href="#" class="underline underline-offset-4 hover:text-primary transition-colors">
            服务条款
          </a>
          和
          <a href="#" class="underline underline-offset-4 hover:text-primary transition-colors">
            隐私政策
          </a>
          。
        </p>
      </div>
    </div>

    <div v-if="oauthRedirecting" class="fixed inset-0 z-[90] flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div class="w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
        <div class="flex items-center gap-3">
          <AppIcon name="lucide:loader-2" :size="18" class="animate-spin text-muted-foreground" />
          <div class="text-sm font-semibold">正在跳转到 GitHub…</div>
        </div>
        <div class="mt-2 text-xs text-muted-foreground">
          若长时间无响应，请检查网络或 Supabase 的 GitHub Provider 配置。
        </div>
      </div>
    </div>
  </div>
</template>
