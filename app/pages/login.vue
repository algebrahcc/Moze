<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

definePageMeta({
  layout: 'auth',
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const email = ref('')
const password = ref('')
const loading = ref(false)
const sent = ref(false)
const signupSent = ref(false)
const resetSent = ref(false)
const errorMessage = ref<string | null>(null)
const mode = ref<'password' | 'magic' | 'signup'>('password')

async function sendMagicLink() {
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
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value.trim(),
    options: {
      emailRedirectTo: origin,
    },
  })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  sent.value = true
}

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
    return
  }

  signupSent.value = true
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
    return
  }
  resetSent.value = true
}

watchEffect(() => {
  if (user.value) {
    navigateTo('/dashboard')
  }
})
</script>

<template>
  <div class="flex min-h-screen w-full flex-col lg:flex-row">
    <!-- Left Side: Branding & Illustration -->
    <div class="relative hidden w-full flex-col justify-between overflow-hidden bg-zinc-50 p-10 text-zinc-900 lg:flex lg:w-1/2 xl:w-2/3">
      <!-- Minimalist Background -->
      <div class="absolute inset-0 bg-zinc-50/50" />

      <div class="relative z-10 flex h-full flex-col justify-between px-6 py-6">
        <!-- Top Left: App Name -->
        <div class="text-xl font-bold tracking-tight text-zinc-900">
          Moze / 默资记账
        </div>

        <!-- Center Left: Quote -->
        <div class="max-w-md space-y-4">
           <blockquote class="text-2xl font-light leading-relaxed text-zinc-800">
             &ldquo;Don't save what is left after spending, but spend what is left after saving.&rdquo;
           </blockquote>
           <div class="text-sm font-medium text-zinc-500 uppercase tracking-widest">
             Warren Buffett
           </div>
        </div>

        <!-- Bottom Left: Brand Logo/Mark -->
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AppIcon name="lucide:layout-dashboard" :size="24" />
          </div>
          <div class="text-xs text-zinc-500 font-mono">
            &copy; 2026 Moze Inc.
          </div>
        </div>
      </div>
      
      <!-- Right Border Divider -->
      <div class="absolute right-0 top-0 h-full w-[1px] bg-zinc-200" />
    </div>

    <!-- Right Side: Auth Form -->
    <div class="flex w-full flex-col items-center justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-8 xl:w-1/3">
      <div class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div class="flex flex-col space-y-2 text-center">
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ mode === 'signup' ? '创建账号' : '欢迎回来' }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ mode === 'signup' ? '输入邮箱创建你的账号' : '输入邮箱登录你的账号' }}
          </p>
        </div>

        <div class="grid gap-6">
          <form v-if="mode === 'password' || mode === 'signup'" @submit.prevent="mode === 'signup' ? signUpWithPassword() : signInWithPassword()">
            <div class="grid gap-4">
              <div class="grid gap-2">
                <label for="email" class="text-sm font-medium">邮箱</label>
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
                  class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
              </div>
              <div class="grid gap-2">
                <label for="password" class="text-sm font-medium">密码</label>
                <input
                  id="password"
                  v-model="password"
                  type="password"
                  :disabled="loading"
                  required
                  minlength="6"
                  class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
              </div>
              <Button :disabled="loading" type="submit">
                <AppIcon v-if="loading" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
                {{ mode === 'signup' ? '邮箱注册' : '邮箱登录' }}
              </Button>
              <div v-if="mode === 'password'" class="flex items-center justify-between text-sm text-muted-foreground">
                <span />
                <button
                  type="button"
                  class="hover:text-primary transition-colors"
                  :disabled="loading"
                  @click="resetPassword"
                >
                  忘记密码
                </button>
              </div>
            </div>
          </form>

          <form v-if="mode === 'magic'" @submit.prevent="sendMagicLink">
            <div class="grid gap-4">
              <div class="grid gap-2">
                <label for="email-magic" class="text-sm font-medium">邮箱</label>
                <input
                  id="email-magic"
                  v-model="email"
                  type="email"
                  placeholder="name@example.com"
                  auto-capitalize="none"
                  auto-complete="email"
                  auto-correct="off"
                  :disabled="loading"
                  required
                  class="h-12 w-full rounded-xl border border-input bg-background/90 px-4 text-sm shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
              </div>
              <Button :disabled="loading" type="submit">
                <AppIcon v-if="loading" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
                发送魔法链接
              </Button>
            </div>
          </form>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t" />
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-background px-2 text-muted-foreground">
                或者切换方式
              </span>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
             <Button variant="outline" :disabled="loading" @click="mode = mode === 'magic' ? 'password' : 'magic'">
                {{ mode === 'magic' ? '密码登录' : '魔法链接' }}
             </Button>
             <Button variant="outline" :disabled="loading" @click="mode = mode === 'signup' ? 'password' : 'signup'">
                {{ mode === 'signup' ? '去登录' : '去注册' }}
             </Button>
          </div>
        </div>

        <p v-if="errorMessage" class="px-8 text-center text-sm text-destructive">
          {{ errorMessage }}
        </p>
        <p v-if="sent" class="px-8 text-center text-sm text-green-600">
          魔法链接已发送！请检查你的邮箱。
        </p>
        <p v-if="signupSent" class="px-8 text-center text-sm text-green-600">
          账号已创建！请检查你的邮箱进行验证。
        </p>
        <p v-if="resetSent" class="px-8 text-center text-sm text-green-600">
          重置密码邮件已发送，请检查邮箱。
        </p>

        <p class="px-8 text-center text-sm text-muted-foreground">
          点击继续即表示你同意我们的
          <a href="#" class="underline underline-offset-4 hover:text-primary">
            服务条款
          </a>
          和
          <a href="#" class="underline underline-offset-4 hover:text-primary">
            隐私政策
          </a>
          。
        </p>
      </div>
    </div>
  </div>
</template>
