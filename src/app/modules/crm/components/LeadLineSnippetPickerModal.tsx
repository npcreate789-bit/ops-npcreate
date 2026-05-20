import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  serviceInterestLabel,
  type ServicePackageOption,
} from '../../../../shared/packages/serviceInterests'
import { listLineSnippets, recordLineSnippetUse } from '../api/lineSnippets'
import {
  applyLineSnippetPlaceholders,
  leadToSnippetPlaceholderContext,
  lineSnippetPlaceholderWarnings,
} from '../lineSnippetPlaceholders'
import { LINE_SNIPPET_CATEGORY_LABELS } from '../types/lineSnippets'
import type { Lead } from '../types'
import type { LineMessageSnippet } from '../types/lineSnippets'

const GENERAL_FILTER = '__general__'

type SnippetSort = 'usage' | 'newest' | 'title'

function previewBody(body: string, max = 120): string {
  const oneLine = body.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= max) return oneLine
  return `${oneLine.slice(0, max - 1)}…`
}

interface LeadLineSnippetPickerModalProps {
  open: boolean
  lead: Lead
  servicesInterested: string[]
  serviceOptions: ServicePackageOption[]
  canManage?: boolean
  onClose: () => void
  onSelect: (text: string) => void
}

export function LeadLineSnippetPickerModal({
  open,
  lead,
  servicesInterested,
  serviceOptions,
  canManage = false,
  onClose,
  onSelect,
}: LeadLineSnippetPickerModalProps) {
  const [snippets, setSnippets] = useState<LineMessageSnippet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>(GENERAL_FILTER)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SnippetSort>('usage')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const placeholderCtx = useMemo(
    () => leadToSnippetPlaceholderContext(lead, serviceOptions),
    [lead, serviceOptions],
  )

  const filterOptions = useMemo(() => {
    const selected = servicesInterested.map((code) => ({
      id: code,
      label: serviceInterestLabel(code, serviceOptions),
    }))
    return [{ id: GENERAL_FILTER, label: 'ทั่วไป' }, ...selected]
  }, [servicesInterested, serviceOptions])

  useEffect(() => {
    if (!filterOptions.some((f) => f.id === filter)) {
      setFilter(filterOptions[0]?.id ?? GENERAL_FILTER)
    }
  }, [filterOptions, filter])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setSearch('')
    setSelectedId(null)
    setHint(null)
    listLineSnippets({ activeOnly: true, currentlyValid: true, sortByUsage: true })
      .then((rows) => {
        if (!cancelled) setSnippets(rows)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'โหลดชุดข้อความไม่สำเร็จ')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filteredSnippets = useMemo(() => {
    const code = filter === GENERAL_FILTER ? null : filter
    let rows = snippets.filter((s) => (code ? s.package_code === code : s.package_code === null))
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.body.toLowerCase().includes(q) ||
          LINE_SNIPPET_CATEGORY_LABELS[s.category].toLowerCase().includes(q),
      )
    }
    const sorted = [...rows]
    if (sort === 'usage') {
      sorted.sort((a, b) => b.use_count - a.use_count || b.sort_order - a.sort_order)
    } else if (sort === 'newest') {
      sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    } else {
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'th'))
    }
    return sorted
  }, [snippets, filter, search, sort])

  const selected = filteredSnippets.find((s) => s.id === selectedId) ?? null
  const selectedBody = selected
    ? applyLineSnippetPlaceholders(selected.body, placeholderCtx)
    : ''

  const manageHref =
    filter === GENERAL_FILTER
      ? '/app/sales/line-snippets/new'
      : `/app/sales/line-snippets/new?package=${encodeURIComponent(filter)}`

  function confirmSelect(snippet: LineMessageSnippet) {
    const text = applyLineSnippetPlaceholders(snippet.body, placeholderCtx)
    const warnings = lineSnippetPlaceholderWarnings(snippet.body, placeholderCtx)
    setHint(warnings[0] ?? null)
    void recordLineSnippetUse(snippet.id).catch(() => {})
    onSelect(text)
    onClose()
  }

  function handleConfirm() {
    if (!selected) return
    confirmSelect(selected)
  }

  if (!open) return null

  return createPortal(
    <div className="crm-line-snippets-modal crm-line-snippets-modal--picker" role="presentation">
      <button
        type="button"
        className="crm-line-snippets-modal__backdrop"
        aria-label="ปิด"
        onClick={onClose}
      />
      <div
        className="crm-line-snippets-modal__panel crm-line-snippets-modal__panel--picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="line-snippet-picker-title"
      >
        <header className="crm-line-snippets-modal__head">
          <h3 id="line-snippet-picker-title">เลือกชุดข้อความ</h3>
          <button
            type="button"
            className="crm-line-snippets-modal__close"
            onClick={onClose}
            aria-label="ปิด"
          >
            ×
          </button>
        </header>

        <div className="crm-line-snippets-picker__toolbar">
          <label className="crm-line-snippets-picker__search">
            <input
              type="search"
              placeholder="ค้นหาด้วยชื่อ"
              aria-label="ค้นหาด้วยชื่อ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            className="crm-line-snippets-picker__filter"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setSelectedId(null)
            }}
            aria-label="กรองตามบริการ"
          >
            {filterOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
                {opt.id === filter ? ` (${filteredSnippets.length})` : ''}
              </option>
            ))}
          </select>
          <select
            className="crm-line-snippets-picker__sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SnippetSort)}
            aria-label="เรียงลำดับ"
          >
            <option value="usage">เรียงตาม: ใช้บ่อยสุด</option>
            <option value="newest">เรียงตาม: สร้างล่าสุด</option>
            <option value="title">เรียงตาม: ชื่อ</option>
          </select>
        </div>

        {hint ? (
          <p className="crm-line-snippets-picker__hint muted" role="status">
            {hint}
          </p>
        ) : null}

        <div className="crm-line-snippets-picker__body">
          <div className="crm-line-snippets-picker__list-wrap">
            <ul className="crm-line-snippets-picker__list" role="listbox" aria-label="รายการชุดข้อความ">
              {loading ? (
                <li className="crm-line-snippets-picker__empty muted">กำลังโหลด…</li>
              ) : error ? (
                <li className="crm-line-snippets-picker__empty crm-line-snippets-picker__empty--error">
                  {error}
                </li>
              ) : filteredSnippets.length === 0 ? (
                <li className="crm-line-snippets-picker__empty muted">
                  {search.trim()
                    ? 'ไม่พบชุดข้อความที่ตรงกับคำค้น'
                    : 'ยังไม่มีข้อความสำหรับหัวข้อนี้'}
                </li>
              ) : (
                filteredSnippets.map((snippet) => {
                  const resolved = applyLineSnippetPlaceholders(snippet.body, placeholderCtx)
                  const isSelected = selectedId === snippet.id
                  return (
                    <li key={snippet.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`crm-line-snippets-picker__item${
                          isSelected ? ' crm-line-snippets-picker__item--selected' : ''
                        }`}
                        onClick={() => setSelectedId(snippet.id)}
                        onDoubleClick={() => confirmSelect(snippet)}
                      >
                        <span className="crm-line-snippets-picker__item-title">{snippet.title}</span>
                        <span className="crm-line-snippets-picker__item-preview muted">
                          {previewBody(resolved, 80)}
                        </span>
                        {snippet.use_count > 0 ? (
                          <span className="crm-line-snippets-picker__item-meta muted">
                            ใช้ {snippet.use_count.toLocaleString('th-TH')} ครั้ง
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
            {canManage ? (
              <Link
                to={manageHref}
                className="crm-line-snippets-picker__create btn btn--ghost"
                onClick={onClose}
              >
                + สร้างชุดข้อความ
              </Link>
            ) : null}
          </div>

          <aside className="crm-line-snippets-picker__preview" aria-label="ดูตัวอย่าง">
            <h4 className="crm-line-snippets-picker__preview-title">ดูตัวอย่าง</h4>
            <div className="crm-line-snippets-picker__preview-box">
              {selected ? (
                <>
                  <p className="crm-line-snippets-picker__preview-name">{selected.title}</p>
                  <p className="crm-line-snippets-picker__preview-text">{selectedBody}</p>
                  <span className="crm-line-snippets-picker__preview-tag muted">
                    {LINE_SNIPPET_CATEGORY_LABELS[selected.category]}
                  </span>
                </>
              ) : (
                <p className="crm-line-snippets-picker__preview-placeholder muted">
                  เลือกรายการจากด้านซ้ายเพื่อดูตัวอย่าง
                </p>
              )}
            </div>
          </aside>
        </div>

        <footer className="crm-line-snippets-modal__actions">
          <Link
            to="/app/sales/line-snippets"
            className="crm-line-snippets-picker__manage-link"
            onClick={onClose}
          >
            จัดการชุดข้อความ
          </Link>
          <div className="crm-line-snippets-modal__actions-right">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              ยกเลิก
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!selected}
              onClick={handleConfirm}
            >
              เลือก
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
