<script setup lang="ts">
import { useAccountsStore } from '@/stores/accounts'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import AppIcon from '@/components/AppIcon.vue'

const accountsStore = useAccountsStore()
const { accounts, balances } = storeToRefs(accountsStore)

const todos = computed(() => {
  const list = []
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize today to start of day
  
  // Credit card repayments
  const creditAccounts = accounts.value.filter(a => a.type === 'credit' && !a.is_archived)
  for (const acc of creditAccounts) {
    const balance = balances.value[acc.id] || 0
    if (balance < 0) { // Owe money
       // Calculate due date
       // If payment_due_date is set
       if (acc.payment_due_date) {
         let dueDate = new Date(today.getFullYear(), today.getMonth(), acc.payment_due_date)
         
         // If today is past due date, assume it's next month's due date
         if (today.getDate() > acc.payment_due_date) {
           dueDate = new Date(today.getFullYear(), today.getMonth() + 1, acc.payment_due_date)
         }
         
         // Calculate days left
         const diffTime = dueDate.getTime() - today.getTime()
         const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
         
         list.push({
           id: `repay-${acc.id}`,
           type: 'repayment',
           title: `还款提醒：${acc.name}`,
           desc: `还款日 ${acc.payment_due_date}号`,
           date: `${dueDate.getMonth() + 1}-${dueDate.getDate()}`,
           daysLeft: days,
           amount: Math.abs(balance),
           urgent: days <= 3
         })
       } else {
         // No due date set, just show balance
         list.push({
           id: `repay-${acc.id}`,
           type: 'repayment',
           title: `欠款提醒：${acc.name}`,
           desc: '未设置还款日',
           amount: Math.abs(balance),
           urgent: false
         })
       }
    }
  }
  
  return list.sort((a, b) => {
    if (a.urgent && !b.urgent) return -1
    if (!a.urgent && b.urgent) return 1
    return (a.daysLeft ?? 999) - (b.daysLeft ?? 999)
  })
})
</script>

<template>
  <Card class="h-full bg-card/60 backdrop-blur-sm">
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-base">
        <AppIcon name="lucide:list-todo" :size="18" />
        待办事项
      </CardTitle>
    </CardHeader>
    <CardContent>
       <div v-if="!todos.length" class="text-sm text-muted-foreground text-center py-8">
         暂无待办事项
       </div>
       <div v-else class="space-y-3">
         <div v-for="item in todos" :key="item.id" class="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50" :class="item.urgent ? 'border-destructive/50 bg-destructive/5' : 'border-border/50'">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-full" :class="item.urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'">
                <AppIcon name="lucide:credit-card" :size="14" />
              </div>
              <div>
                <div class="font-medium">{{ item.title }}</div>
                <div class="text-xs text-muted-foreground">{{ item.desc }}</div>
              </div>
            </div>
            <div class="text-right">
               <div class="font-bold" :class="item.urgent ? 'text-destructive' : ''">
                 {{ item.daysLeft !== undefined ? (item.daysLeft === 0 ? '今天' : `${item.daysLeft}天后`) : '' }}
               </div>
               <div class="text-xs font-mono font-medium">¥{{ item.amount.toFixed(2) }}</div>
            </div>
         </div>
       </div>
    </CardContent>
  </Card>
</template>
