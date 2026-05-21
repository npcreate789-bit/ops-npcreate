import type { CSSProperties } from 'react'
import './table-skeleton.css'

interface TableSkeletonProps {
  /** จำนวนแถวจำลอง */
  rows?: number
  /** จำนวนคอลัมน์ — ขึ้นกับตารางจริง */
  columns?: number
  /** label สำหรับ screen reader */
  ariaLabel?: string
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  ariaLabel = 'กำลังโหลดรายการ',
}: TableSkeletonProps) {
  const gridStyle = { '--cols': columns } as CSSProperties
  return (
    <div className="table-skeleton" role="status" aria-label={ariaLabel} style={gridStyle}>
      <div className="table-skeleton__head" style={gridStyle}>
        {Array.from({ length: columns }, (_, i) => (
          <span key={`h-${i}`} className="table-skeleton__cell table-skeleton__cell--head" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div className="table-skeleton__row" key={`r-${r}`} style={gridStyle}>
          {Array.from({ length: columns }, (_, c) => (
            <span
              key={`c-${r}-${c}`}
              className="table-skeleton__cell"
              style={{ animationDelay: `${(r + c) * 40}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
