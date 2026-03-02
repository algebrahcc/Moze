<script setup lang="ts">
// Simple, abstract SVG illustration for login/finance concept
</script>

<template>
  <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto max-w-[400px]">
    <!-- Background Circle -->
    <circle cx="200" cy="200" r="160" fill="url(#paint0_linear)" fill-opacity="0.1" />
    
    <!-- Abstract Chart Elements -->
    <path d="M100 240 L160 180 L220 220 L320 120" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" class="text-primary animate-draw" />
    <circle cx="100" cy="240" r="6" fill="currentColor" class="text-primary" />
    <circle cx="160" cy="180" r="6" fill="currentColor" class="text-primary" />
    <circle cx="220" cy="220" r="6" fill="currentColor" class="text-primary" />
    <circle cx="320" cy="120" r="8" fill="currentColor" class="text-primary" />

    <!-- Coin/Wallet Concept -->
    <rect x="140" y="260" width="120" height="80" rx="12" fill="currentColor" class="text-muted-foreground opacity-20" />
    <rect x="150" y="250" width="100" height="10" rx="4" fill="currentColor" class="text-muted-foreground opacity-10" />
    
    <!-- Floating Elements -->
    <circle cx="280" cy="160" r="20" fill="currentColor" class="text-accent opacity-20 animate-bounce-slow" />
    <circle cx="120" cy="140" r="12" fill="currentColor" class="text-secondary opacity-30 animate-bounce-delayed" />

    <defs>
      <linearGradient id="paint0_linear" x1="200" y1="40" x2="200" y2="360" gradientUnits="userSpaceOnUse">
        <stop stop-color="currentColor" class="text-primary" />
        <stop offset="1" stop-color="currentColor" class="text-background" stop-opacity="0" />
      </linearGradient>
    </defs>
  </svg>
</template>

<style scoped>
.animate-draw {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw 2s ease-out forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

.animate-bounce-slow {
  animation: bounce 3s infinite ease-in-out;
}

.animate-bounce-delayed {
  animation: bounce 4s infinite ease-in-out 1s;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
