import type { ProductLine } from './types'

export function emptyProductLine(): ProductLine {
  return { id: crypto.randomUUID(), sku: null, spend: null, orders: null, gmv: null }
}

/** แถวที่มียอดแต่ไม่มี SKU */
export function validateProductLineRows(lines: ProductLine[]): string | null {
  const hasOrphanAmounts = lines.some((line) => {
    const hasSku = Boolean(line.sku?.trim())
    const hasAmount =
      (line.spend ?? 0) > 0 || (line.orders ?? 0) > 0 || (line.gmv ?? 0) > 0
    return hasAmount && !hasSku
  })
  if (hasOrphanAmounts) {
    return 'กรุณาระบุรหัส SKU ในแถวที่มียอด Spend / ออเดอร์ / GMV'
  }
  return null
}

export function normalizeProductLines(raw: unknown): ProductLine[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const skuRaw =
        row.sku != null && String(row.sku).trim()
          ? String(row.sku).trim()
          : row.product_name != null && String(row.product_name).trim()
            ? String(row.product_name).trim()
            : ''
      const spend =
        row.spend != null && row.spend !== '' && Number.isFinite(Number(row.spend))
          ? Math.max(0, Number(row.spend))
          : null
      if (!skuRaw) return null
      const line: ProductLine = {
        id: typeof row.id === 'string' ? row.id : undefined,
        sku: skuRaw,
        spend,
        orders:
          row.orders != null && row.orders !== '' && Number.isFinite(Number(row.orders))
            ? Math.max(0, Math.trunc(Number(row.orders)))
            : null,
        gmv:
          row.gmv != null && row.gmv !== '' && Number.isFinite(Number(row.gmv))
            ? Math.max(0, Number(row.gmv))
            : null,
      }
      return line
    })
    .filter((line): line is ProductLine => line != null)
}

export function sumProductLineSpend(lines: ProductLine[]): number {
  return normalizeProductLines(lines).reduce((sum, row) => sum + (row.spend ?? 0), 0)
}

export function sumProductLineGmv(lines: ProductLine[]): number {
  return normalizeProductLines(lines).reduce((sum, row) => sum + (row.gmv ?? 0), 0)
}

export function sumProductLineOrders(lines: ProductLine[]): number {
  return normalizeProductLines(lines).reduce((sum, row) => sum + (row.orders ?? 0), 0)
}

export function productLinesForForm(
  metric: {
    product_lines?: ProductLine[] | null
    top_product?: string | null
    spend?: number
    gmv?: number
    orders?: number
  } | null,
): ProductLine[] {
  const fromJson = normalizeProductLines(metric?.product_lines)
  if (fromJson.length) {
    return fromJson.map((line) => ({ ...line, id: line.id ?? crypto.randomUUID() }))
  }
  if (metric?.top_product?.trim()) {
    return [
      {
        id: crypto.randomUUID(),
        sku: metric.top_product.trim(),
        spend: metric.spend != null && metric.spend > 0 ? metric.spend : null,
        orders: metric.orders != null && metric.orders > 0 ? metric.orders : null,
        gmv: metric.gmv != null && metric.gmv > 0 ? metric.gmv : null,
      },
    ]
  }
  if (
    metric &&
    ((metric.spend ?? 0) > 0 || (metric.gmv ?? 0) > 0 || (metric.orders ?? 0) > 0)
  ) {
    return [
      {
        id: crypto.randomUUID(),
        sku: null,
        spend: (metric.spend ?? 0) > 0 ? metric.spend! : null,
        orders: (metric.orders ?? 0) > 0 ? metric.orders! : null,
        gmv: (metric.gmv ?? 0) > 0 ? metric.gmv! : null,
      },
    ]
  }
  return [emptyProductLine()]
}

/** Legacy top_product — best SKU by orders / GMV / spend. */
export function summarizeTopSku(lines: ProductLine[]): string | null {
  const filled = normalizeProductLines(lines)
  if (!filled.length) return null
  const sorted = [...filled].sort(
    (a, b) =>
      (b.orders ?? 0) - (a.orders ?? 0) ||
      (b.gmv ?? 0) - (a.gmv ?? 0) ||
      (b.spend ?? 0) - (a.spend ?? 0) ||
      (a.sku ?? '').localeCompare(b.sku ?? '', 'th'),
  )
  return sorted[0].sku
}

export function formatSkuLinesSummary(lines: ProductLine[]): string {
  const filled = normalizeProductLines(lines)
  if (!filled.length) return '—'
  const total = sumProductLineSpend(filled)
  const totalLabel = `${total.toLocaleString('th-TH')} บาท`
  if (filled.length === 1) return `${filled[0].sku} · ${totalLabel}`
  const top = summarizeTopSku(filled)
  return `${top} +${filled.length - 1} SKU · ${totalLabel}`
}

export function metricProductsSummary(metric: {
  product_lines?: ProductLine[] | null
  top_product?: string | null
  spend?: number
}): string {
  const fromJson = normalizeProductLines(metric.product_lines)
  if (fromJson.length) return formatSkuLinesSummary(fromJson)
  if (metric.top_product?.trim()) return metric.top_product.trim()
  if (metric.spend != null && metric.spend > 0) {
    return `${metric.spend.toLocaleString('th-TH')} บาท`
  }
  return '—'
}
