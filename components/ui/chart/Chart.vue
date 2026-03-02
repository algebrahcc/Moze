<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  type ChartData,
  type ChartOptions
} from 'chart.js'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import { computed } from 'vue'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const props = defineProps<{
  type: 'line' | 'bar' | 'doughnut'
  data: ChartData<'line' | 'bar' | 'doughnut'>
  options?: ChartOptions<'line' | 'bar' | 'doughnut'>
  height?: number
}>()

const defaultOptions = computed<ChartOptions>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false, // Default hidden for cleaner look
    },
    tooltip: {
      backgroundColor: 'hsl(var(--popover))',
      titleColor: 'hsl(var(--popover-foreground))',
      bodyColor: 'hsl(var(--popover-foreground))',
      borderColor: 'hsl(var(--border))',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
      usePointStyle: true,
    }
  },
  scales: props.type !== 'doughnut' ? {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: 'hsl(var(--muted-foreground))',
        font: {
          family: 'inherit',
          size: 11
        }
      }
    },
    y: {
      grid: {
        color: 'hsl(var(--border) / 0.4)',
        borderDash: [4, 4],
      },
      ticks: {
        color: 'hsl(var(--muted-foreground))',
        font: {
          family: 'inherit',
          size: 11
        }
      },
      border: {
        display: false
      }
    }
  } : undefined,
  ...props.options
}))

const chartComponent = computed(() => {
  if (props.type === 'line') return Line
  if (props.type === 'bar') return Bar
  return Doughnut
})
</script>

<template>
  <div :style="{ height: `${height ?? 240}px`, width: '100%' }">
    <component 
      :is="chartComponent" 
      :data="data" 
      :options="defaultOptions" 
    />
  </div>
</template>