import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { globalSearch, searchResultTypeLabel } from '../api/search'
import {
  canOpenSearchResult,
  canUseGlobalSearch,
  hasGlobalSearchKinds,
  isGlobalSearchScoped,
  scopedSearchKindLabels,
  searchKindsForRoles,
} from '../access'
import type { SearchResult, SearchResultKind } from '../types'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../search.css'

const DEBOUNCE_MS = 320
const MIN_QUERY = 2

function SearchResultRow({
  item,
  linkable,
}: {
  item: SearchResult
  linkable: boolean
}) {
  const body = (
    <>
      <strong>{item.title}</strong>
      {item.subtitle && <span>{item.subtitle}</span>}
    </>
  )

  if (linkable) {
    return (
      <Link to={item.href} className="search-result">
        {body}
      </Link>
    )
  }

  return (
    <div className="search-result search-result--static" aria-disabled="true">
      {body}
      <span className="search-result__locked">ไม่มีสิทธิ์เปิดรายละเอียด</span>
    </div>
  )
}

export function SearchPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const allowed = canUseGlobalSearch(roles) || !configured
  const hasKinds = hasGlobalSearchKinds(roles) || !configured
  const scoped = isGlobalSearchScoped(roles) && configured
  const kinds = useMemo(() => searchKindsForRoles(roles), [roles])
  const scopedLabel = useMemo(
    () => scopedSearchKindLabels(roles, searchResultTypeLabel),
    [roles],
  )

  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(input), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [input])

  useEffect(() => {
    if (!allowed || !hasKinds) return

    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    globalSearch(trimmed, roles)
      .then((data) => {
        if (!cancelled) setResults(data.results)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'ค้นหาไม่สำเร็จ')
          setResults([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [allowed, hasKinds, query, roles])

  const grouped = useMemo(() => {
    const map = new Map<SearchResultKind, SearchResult[]>()
    for (const r of results) {
      const list = map.get(r.kind) ?? []
      list.push(r)
      map.set(r.kind, list)
    }
    return map
  }, [results])

  const resultCount = results.length
  const queryReady = query.trim().length >= MIN_QUERY

  if (!allowed) {
    return (
      <div className="page">
        <h1>ค้นหา</h1>
        <p className="crm-error">ไม่มีสิทธิ์ใช้การค้นหารวม</p>
      </div>
    )
  }

  if (!hasKinds && configured) {
    return (
      <div className="page">
        <h1>ค้นหารวม</h1>
        <p className="crm-error">บทบาทของคุณไม่มีเมนูที่รองรับการค้นหา</p>
        <p className="muted">ติดต่อผู้ดูแลระบบหากต้องการสิทธิ์เพิ่ม</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>ค้นหารวม</h1>
          <p className="muted">Lead · ลูกค้า · งาน — ผลลัพธ์ตาม RLS ของบทบาทคุณ</p>
        </div>
        <Link to="/app" className="crm-btn crm-btn--ghost">
          หน้าหลัก
        </Link>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่าง</p>
      )}

      {scoped && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          ค้นหาเฉพาะ: {scopedLabel} — ผลลัพธ์ถูกกรองตามเมนูและ RLS ของบทบาทคุณ
        </p>
      )}

      <section className="card card--wide">
        <label className="task-field task-field--full">
          <span className="task-field__label">คำค้นหา</span>
          <div className="search-input-row">
            <input
              className="crm-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="แบรนด์, ชื่องาน, ผู้ติดต่อ..."
              autoFocus
              aria-describedby="search-hint"
            />
            {input.length > 0 && (
              <button
                type="button"
                className="crm-btn crm-btn--ghost search-clear"
                onClick={() => setInput('')}
              >
                ล้าง
              </button>
            )}
          </div>
        </label>
        <p id="search-hint" className="muted search-hint">
          พิมพ์อย่างน้อย {MIN_QUERY} ตัวอักษร
          {kinds.length > 0 && !scoped && ' · ค้นหา Lead, ลูกค้า และงาน'}
        </p>

        {error && <p className="crm-error" role="alert">{error}</p>}
        {loading && <p className="muted" aria-live="polite">กำลังค้นหา...</p>}

        {!loading && queryReady && (
          <p className="search-summary muted" aria-live="polite">
            {resultCount > 0
              ? `พบ ${resultCount} รายการ`
              : 'ไม่พบผลลัพธ์ — ลองคำอื่นหรือตรวจสิทธิ์ RLS'}
          </p>
        )}

        {!loading && resultCount > 0 && (
          <div className="search-groups">
            {kinds.map((kind) => {
              const items = grouped.get(kind)
              if (!items?.length) return null
              return (
                <section key={kind} className="search-group" aria-label={searchResultTypeLabel(kind)}>
                  <h3 className="search-group-title">{searchResultTypeLabel(kind)}</h3>
                  <ul className="search-results">
                    {items.map((item) => (
                      <li key={`${item.kind}-${item.id}`}>
                        <SearchResultRow
                          item={item}
                          linkable={!configured || canOpenSearchResult(roles, item.href)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
