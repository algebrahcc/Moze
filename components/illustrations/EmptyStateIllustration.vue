<script setup lang="ts">
// Simple, abstract SVG illustration for empty states
</script>

<template>
  <svg width="240" height="160" viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto opacity-70">
    <!-- Box -->
    <rect x="80" y="60" width="80" height="60" rx="8" fill="currentColor" class="text-muted opacity-30" />
    <path d="M80 76 L120 100 L160 76" stroke="currentColor" stroke-width="2" class="text-muted opacity-40" />
    
    <!-- Lid/Flaps -->
    <path d="M80 60 L60 40 L140 40 L160 60" fill="currentColor" class="text-muted opacity-20" />
    <path d="M160 60 L180 40 L220 40" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4" class="text-muted opacity-20" />

    <!-- Dust/Wind -->
    <path d="M40 120 Q60 110 80 120" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-muted opacity-20" />
    <path d="M180 130 Q200 140 220 130" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-muted opacity-20" />
    
    <!-- Question Mark / Search -->
    <circle cx="120" cy="50" r="16" stroke="currentColor" stroke-width="3" class="text-primary opacity-60" />
    <path d="M132 62 L144 74" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="text-primary opacity-60" />
  </svg>
</template>
