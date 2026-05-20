import type { Package } from './types'

export const DEFAULT_CONTRACT_MONTHS = 1

/** ราคาแพ็กเกจในระบบ = ราคาต่อเดือน */
export function monthlyPriceFromPackage(pkg: Package): number {
  return pkg.base_price
}

export function lineUnitPriceForContract(monthlyPrice: number, contractMonths: number): number {
  const months = Math.max(1, Math.floor(contractMonths) || DEFAULT_CONTRACT_MONTHS)
  return monthlyPrice * months
}

export function parseContractMonths(value: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_CONTRACT_MONTHS
  return Math.floor(n)
}
