<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Line, Column, Pie, Area } from '@antv/g2plot'
import ChartLegend from '../chart/ChartLegend.vue'

type PlotType = 'line' | 'stacked' | 'grouped' | 'donut' | 'area'

const props = withDefaults(defineProps<{
  type: PlotType
  data: Array<Record<string, any>>
  height?: number
  colors?: readonly string[] | string[]
  legendItems?: { label: string; color: string }[]
}>(), {
  height: 240,
})

const containerRef = ref<HTMLDivElement | null>(null)
let plot: Line | Column | Pie | Area | null = null
const normalizedColors = computed(() => (props.colors ? [...props.colors] : undefined))

function destroyPlot() {
  plot?.destroy()
  plot = null
}

function baseTooltip() {
  return {
    domStyles: {
      'g2-tooltip': {
        background: 'var(--chart-tooltip-bg)',
        color: 'var(--chart-tooltip-fg)',
        border: '1px solid var(--chart-tooltip-border)',
        borderRadius: '8px',
        boxShadow: '0 18px 40px -28px rgba(15,23,42,0.6)',
        padding: '10px 12px',
      },
      'g2-tooltip-title': {
        color: 'var(--chart-tooltip-fg)',
        fontWeight: '600',
        marginBottom: '6px',
      },
      'g2-tooltip-name': {
        color: 'var(--chart-tooltip-fg)',
      },
      'g2-tooltip-value': {
        color: 'var(--chart-tooltip-fg)',
        fontWeight: '600',
      },
    },
  }
}

function createPlot() {
  if (!containerRef.value) return
  destroyPlot()

  if (props.type === 'line') {
    plot = new Line(containerRef.value, {
      data: props.data,
      xField: 'x',
      yField: 'y',
      seriesField: 'series',
      smooth: true,
      color: normalizedColors.value,
      point: {
        size: 3,
        shape: 'circle',
      },
      lineStyle: {
        lineWidth: 2,
      },
      tooltip: baseTooltip(),
      legend: false,
      padding: [12, 12, 24, 8],
      animation: { appear: { duration: 320 } },
    })
  } else if (props.type === 'stacked') {
    plot = new Column(containerRef.value, {
      data: props.data,
      xField: 'x',
      yField: 'y',
      seriesField: 'series',
      isStack: true,
      color: normalizedColors.value,
      columnStyle: {
        radius: [6, 6, 0, 0],
      },
      tooltip: baseTooltip(),
      legend: false,
      padding: [12, 12, 24, 8],
      animation: { appear: { duration: 320 } },
    })
  } else if (props.type === 'grouped') {
    plot = new Column(containerRef.value, {
      data: props.data,
      xField: 'x',
      yField: 'y',
      seriesField: 'series',
      isGroup: true,
      color: normalizedColors.value,
      columnStyle: {
        radius: [4, 4, 0, 0],
      },
      tooltip: baseTooltip(),
      legend: false,
      padding: [12, 12, 24, 8],
      animation: { appear: { duration: 320 } },
    })
  } else if (props.type === 'area') {
    plot = new Area(containerRef.value, {
      data: props.data,
      xField: 'x',
      yField: 'y',
      seriesField: 'series',
      smooth: true,
      color: normalizedColors.value,
      areaStyle: () => {
        return {
          fill: `l(270) 0:${normalizedColors.value?.[0] || 'rgba(34, 197, 94, 0.4)'} 1:rgba(255,255,255,0.01)`,
        }
      },
      line: {
        size: 2,
      },
      tooltip: baseTooltip(),
      legend: false,
      padding: [12, 12, 24, 8],
      animation: { appear: { duration: 320 } },
    })
  } else {
    plot = new Pie(containerRef.value, {
      data: props.data,
      angleField: 'value',
      colorField: 'type',
      radius: 0.85,
      innerRadius: 0.64,
      color: normalizedColors.value,
      tooltip: baseTooltip(),
      legend: false,
      label: false,
      padding: [12, 12, 12, 12],
      animation: { appear: { duration: 320 } },
      statistic: {
        title: {
          offsetY: -4,
          style: {
            fontSize: '12px',
            fontWeight: 'normal',
            color: 'hsl(var(--muted-foreground))',
          },
        },
        content: {
          offsetY: 4,
          style: {
            fontSize: '18px',
            fontWeight: '600',
            color: 'hsl(var(--foreground))',
            fontFamily: 'var(--font-sans)',
          },
        },
      },
      interactions: [{ type: 'element-active' }],
    })
  }

  plot?.render()
}

onMounted(() => {
  createPlot()
})

onBeforeUnmount(() => {
  destroyPlot()
})

watch(
  () => props.type,
  () => {
    createPlot()
  }
)

watch(
  () => props.data,
  (next) => {
    if (!plot) return
    plot.changeData(next)
  },
  { deep: true }
)
</script>

<template>
  <div class="flex h-full w-full flex-col items-center gap-3">
    <div ref="containerRef" class="w-full" :style="{ height: `${height}px` }" />
    <ChartLegend v-if="legendItems?.length" :items="legendItems" position="bottom" />
  </div>
</template>
