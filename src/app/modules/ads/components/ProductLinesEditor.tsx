import {
  emptyProductLine,
  normalizeProductLines,
  sumProductLineGmv,
  sumProductLineOrders,
  sumProductLineSpend,
} from '../productLines'
import type { ProductLine } from '../types'
import '../ads.css'

interface ProductLinesEditorProps {
  lines: ProductLine[]
  disabled?: boolean
  onChange: (lines: ProductLine[]) => void
}

function formatTotal(n: number): string {
  return n > 0 ? n.toLocaleString('th-TH') : '—'
}

export function ProductLinesEditor({ lines, disabled, onChange }: ProductLinesEditorProps) {
  function updateRow(index: number, patch: Partial<ProductLine>) {
    const next = lines.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
  }

  function addRow() {
    onChange([...lines, emptyProductLine()])
  }

  function removeRow(index: number) {
    if (lines.length <= 1) {
      onChange([emptyProductLine()])
      return
    }
    onChange(lines.filter((_, i) => i !== index))
  }

  const displayLines = (lines.length ? lines : [emptyProductLine()]).map((line) =>
    line.id ? line : { ...line, id: crypto.randomUUID() },
  )
  const filled = normalizeProductLines(lines)
  const totalSpend = sumProductLineSpend(lines)
  const totalOrders = sumProductLineOrders(lines)
  const totalGmv = sumProductLineGmv(lines)

  return (
    <div className="ads-product-lines">
      <p className="muted ads-product-lines-hint">
        กรอก Spend / ออเดอร์ / GMV ต่อ SKU — ระบบรวมอัตโนมัติเป็น Spend, GMV และออเดอร์ของวัน
      </p>
      <div className="crm-table-wrap ads-product-lines-scroll">
        <table className="crm-table ads-product-lines-table">
          <thead>
            <tr>
              <th className="ads-col-sku">SKU / รหัส</th>
              <th className="ads-col-amount">ค่าใช้จ่าย (บาท)</th>
              <th className="ads-col-amount">ออเดอร์</th>
              <th className="ads-col-amount">GMV (บาท)</th>
              <th className="ads-col-actions" aria-label="ลบ" />
            </tr>
          </thead>
          <tbody>
            {displayLines.map((line, index) => {
              const rowMissingSku =
                !line.sku?.trim() &&
                ((line.spend ?? 0) > 0 || (line.orders ?? 0) > 0 || (line.gmv ?? 0) > 0)
              return (
              <tr key={line.id ?? `row-${index}`}>
                <td className="ads-col-sku">
                  <input
                    className={rowMissingSku ? 'crm-input crm-input--invalid' : 'crm-input'}
                    value={line.sku ?? ''}
                    disabled={disabled}
                    placeholder="SKU"
                    onChange={(e) =>
                      updateRow(index, { sku: e.target.value.trim() || null })
                    }
                  />
                </td>
                <td className="ads-col-amount">
                  <input
                    type="number"
                    className="crm-input ads-number-input ads-product-lines-input--amount"
                    min={0}
                    step="0.01"
                    value={line.spend ?? ''}
                    disabled={disabled}
                    placeholder="0"
                    onChange={(e) => {
                      const v = e.target.value.trim()
                      updateRow(index, {
                        spend: v === '' ? null : Math.max(0, Number(v) || 0),
                      })
                    }}
                  />
                </td>
                <td className="ads-col-amount">
                  <input
                    type="number"
                    className="crm-input ads-number-input ads-product-lines-input--amount"
                    min={0}
                    step={1}
                    value={line.orders ?? ''}
                    disabled={disabled}
                    placeholder="0"
                    onChange={(e) => {
                      const v = e.target.value.trim()
                      updateRow(index, {
                        orders: v === '' ? null : Math.max(0, Math.trunc(Number(v) || 0)),
                      })
                    }}
                  />
                </td>
                <td className="ads-col-amount">
                  <input
                    type="number"
                    className="crm-input ads-number-input ads-product-lines-input--amount"
                    min={0}
                    step="0.01"
                    value={line.gmv ?? ''}
                    disabled={disabled}
                    placeholder="0"
                    onChange={(e) => {
                      const v = e.target.value.trim()
                      updateRow(index, {
                        gmv: v === '' ? null : Math.max(0, Number(v) || 0),
                      })
                    }}
                  />
                </td>
                <td className="ads-col-actions">
                  {!disabled && (
                    <button
                      type="button"
                      className="crm-btn crm-btn--ghost ads-product-lines-remove"
                      onClick={() => removeRow(index)}
                      title="ลบแถว"
                    >
                      ลบ
                    </button>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
          {filled.length > 0 && (
            <tfoot>
              <tr className="ads-product-lines-total-row">
                <td>รวมทั้งวัน</td>
                <td className="ads-col-amount">
                  <strong>{formatTotal(totalSpend)}</strong>
                </td>
                <td className="ads-col-amount">
                  <strong>{formatTotal(totalOrders)}</strong>
                </td>
                <td className="ads-col-amount">
                  <strong>{formatTotal(totalGmv)}</strong>
                </td>
                <td className="ads-col-actions">
                  {filled.length > 1 && (
                    <span className="muted ads-product-lines-sku-count">{filled.length} SKU</span>
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {!disabled && (
        <button type="button" className="crm-btn crm-btn--ghost" onClick={addRow}>
          + เพิ่ม SKU
        </button>
      )}
    </div>
  )
}
