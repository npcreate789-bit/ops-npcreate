import { useEffect, useMemo, useState } from 'react'
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
import type { Lead } from '../types'
import type { LineMessageSnippet } from '../types/lineSnippets'

const GENERAL_TAB = '__general__'

function previewBody(body: string, max = 72): string {
  const oneLine = body.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= max) return oneLine
  return `${oneLine.slice(0, max - 1)}…`
}

interface LeadLineSnippetPanelProps {
  lead: Lead
  servicesInterested: string[]
  serviceOptions: ServicePackageOption[]
  /** แสดงใต้ฟอร์มแชท (เต็มความกว้าง) */
  placement?: 'header' | 'dock'
  disabled?: boolean
  canManage?: boolean
  onSelect: (text: string) => void
}

export function LeadLineSnippetPanel({
  lead,
  servicesInterested,
  serviceOptions,
  placement = 'header',
  disabled = false,
  canManage = false,
  onSelect,
}: LeadLineSnippetPanelProps) {
  const [snippets, setSnippets] = useState<LineMessageSnippet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>(GENERAL_TAB)
  const [hint, setHint] = useState<string | null>(null)

  const placeholderCtx = useMemo(
    () => leadToSnippetPlaceholderContext(lead, serviceOptions),
    [lead, serviceOptions],
  )

  const tabs = useMemo(() => {
    const selected = servicesInterested.map((code) => ({
      id: code,
      label: serviceInterestLabel(code, serviceOptions),
    }))
    return [{ id: GENERAL_TAB, label: 'ทั่วไป' }, ...selected]
  }, [servicesInterested, serviceOptions])

  useEffect(() => {
    if (tabs.some((t) => t.id === activeTab)) return
    setActiveTab(tabs[0]?.id ?? GENERAL_TAB)
  }, [tabs, activeTab])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
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
  }, [])

  const visibleSnippets = useMemo(() => {
    const code = activeTab === GENERAL_TAB ? null : activeTab
    return snippets.filter((s) => (code ? s.package_code === code : s.package_code === null))
  }, [snippets, activeTab])

  const manageHref =
    activeTab === GENERAL_TAB
      ? '/app/sales/line-snippets/new'
      : `/app/sales/line-snippets/new?package=${encodeURIComponent(activeTab)}`

  function handlePick(snippet: LineMessageSnippet) {
    const text = applyLineSnippetPlaceholders(snippet.body, placeholderCtx)
    const warnings = lineSnippetPlaceholderWarnings(snippet.body, placeholderCtx)
    setHint(warnings[0] ?? null)
    onSelect(text)
    void recordLineSnippetUse(snippet.id).catch(() => {
      /* สถิติไม่บล็อกการส่ง */
    })
  }

  return (
    <div
      className={
        placement === 'dock'
          ? 'crm-line-snippets crm-line-snippets--dock'
          : 'crm-line-snippets'
      }
    >
      <div className="crm-line-snippets__head">
        <span className="crm-line-snippets__label">ชุดข้อความ</span>
        <div className="crm-line-snippets__head-actions">
          {canManage ? (
            <Link to={manageHref} className="crm-line-snippets__manage">
              + เพิ่ม
            </Link>
          ) : null}
          <Link to="/app/sales/line-snippets" className="crm-line-snippets__manage">
            จัดการ
          </Link>
        </div>
      </div>

      {tabs.length > 1 ? (
        <div className="crm-line-snippets__tabs" role="tablist" aria-label="บริการที่สนใจ">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={
                activeTab === tab.id
                  ? 'crm-line-snippets__tab crm-line-snippets__tab--active'
                  : 'crm-line-snippets__tab'
              }
              onClick={() => {
                setActiveTab(tab.id)
                setHint(null)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {hint ? (
        <p className="crm-line-snippets__hint muted" role="status">
          {hint}
        </p>
      ) : null}

      <div className="crm-line-snippets__list" role="list">
        {loading ? (
          <p className="crm-line-snippets__empty muted">กำลังโหลด…</p>
        ) : error ? (
          <p className="crm-line-snippets__empty crm-line-snippets__empty--error">{error}</p>
        ) : visibleSnippets.length === 0 ? (
          <p className="crm-line-snippets__empty muted">
            {servicesInterested.length === 0
              ? 'เลือกบริการที่สนใจด้านล่าง หรือเพิ่มที่จัดการชุดข้อความ'
              : 'ยังไม่มีข้อความสำหรับหัวข้อนี้'}
          </p>
        ) : (
          visibleSnippets.map((snippet) => (
            <button
              key={snippet.id}
              type="button"
              role="listitem"
              className={`crm-line-snippets__card crm-line-snippets__card--${snippet.category}`}
              disabled={disabled}
              title={applyLineSnippetPlaceholders(snippet.body, placeholderCtx)}
              onClick={() => handlePick(snippet)}
            >
              <span className="crm-line-snippets__card-title">{snippet.title}</span>
              <span className="crm-line-snippets__card-preview">
                {previewBody(applyLineSnippetPlaceholders(snippet.body, placeholderCtx))}
              </span>
              {snippet.use_count > 0 ? (
                <span className="crm-line-snippets__card-uses muted">
                  ใช้ {snippet.use_count.toLocaleString('th-TH')} ครั้ง
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
