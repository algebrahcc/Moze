import { defineStore } from 'pinia'

export type Currency = 'CNY' | 'USD' | 'HKD'

export const useExchangeStore = defineStore('exchange', () => {
  const baseCurrency = ref<Currency>('CNY')
  const rates = ref<Record<Currency, number>>({
    CNY: 1,
    USD: 7.2,
    HKD: 0.92,
  })

  function setBaseCurrency(c: Currency) {
    baseCurrency.value = c
  }

  function setRate(c: Currency, rate: number) {
    rates.value[c] = rate
  }

  function convert(amount: number, from: Currency) {
    const rate = rates.value[from] ?? 1
    return amount * rate
  }

  return {
    baseCurrency,
    rates,
    setBaseCurrency,
    setRate,
    convert,
  }
})
