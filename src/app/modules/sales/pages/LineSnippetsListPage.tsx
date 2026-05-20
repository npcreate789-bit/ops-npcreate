import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canManageLineSnippets } from '../../../../shared/auth/access'
import {
  serviceInterestLabel,
  optionsFromPackages,
  type ServicePackageOption,
} from '../../../../shared/packages/serviceInterests'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import { listLineSnippets, deleteLineSnippet } from '../../crm/api/lineSnippets'
import {
  formatLineSnippetValidity,
  lineSnippetScheduleStatus,
  LINE_SNIPPET_SCHEDULE_LABELS,
  type LineSnippetScheduleStatus,
} from '../../crm/lineSnippetSchedule'
import {
  LINE_SNIPPET_CATEGORY_LABELS,
  type LineMessageSnippet,
  type LineSnippetCategory,
} from '../../crm/types/lineSnippets'
import { listAllPackages } from '../api/packages'
import { LineSnippetPlaceholderHelp } from '../components/LineSnippetPlaceholderHelp'
import '../../crm/crm.css'
import '../sales.css'

type FilterPackage = 'all' | '__general__' | string
type FilterCategory = 'all' | LineSnippetCategory
type FilterStatus = 'all' | LineSnippetScheduleStatus

export function LineSnippetsListPage() {
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const canManage = canManageLineSnippets(roles) || !configured

  const [rows, setRows] = useState<LineMessageSnippet[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServicePackageOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pkgFilter, setPkgFilter] = useState<FilterPackage>('all')
  const [catFilter, setCatFilter] = useState<FilterCategory>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [snippets, pkgs] = await Promise.all([
        listLineSnippets({ sortByUsage: true }),
        listAllPackages().catch(() => []),
      ])
      setRows(snippets)
      setServiceOptions(optionsFromPackages(pkgs))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (pkgFilter === '__general__' && r.package_code !== null) return false
      if (pkgFilter !== 'all' && pkgFilter !== '__general__' && r.package_code !== pkgFilter) {
        return false
      }
      if (catFilter !== 'all' && r.category !== catFilter) return false
      if (statusFilter !== 'all' && lineSnippetScheduleStatus(r) !== statusFilter) return false
      return true
    })
  }, [rows, pkgFilter, catFilter, statusFilter])

  const counts = useMemo(() => {
    const c: Record<LineSnippetScheduleStatus, number> = {
      active: 0,
      inactive: 0,
      scheduled: 0,
      expired: 0,
    }
    for (const r of rows) c[lineSnippetScheduleStatus(r)] += 1
    return c
  }, [rows])

  async function handleDelete(row: LineMessageSnippet) {
    if (!window.confirm(`ลบ "${row.title}" ถาวร?`)) return
    try {
      await deleteLineSnippet(row.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    }
  }

  function packageLabel(code: string | null): string {
    if (!code) return 'ทั่วไป'
    return serviceInterestLabel(code, serviceOptions)
  }

  return (
    <div className="page sales-page">
      <header className="page__header sales-page__header">
        <div>
          <Link to="/app/sales" className="crm-back">
            ← กลับขาย / ใบเสนอราคา
          </Link>
          <h1>ชุดข้อความ LINE</h1>
          <p className="muted">
            ข้อความสำเร็จรูปสำหรับแชท CRM — รองรับตัวแปร {'{brand_name}'} จาก Lead และสถิติการใช้งาน
          </p>
        </div>
        <div className="sales-page__header-actions">
          {canManage && (
            <Link to="/app/sales/line-snippets/new" className="crm-btn crm-btn--primary">
              + เพิ่มข้อความ
            </Link>
          )}
        </div>
      </header>

      {!isSupabaseConfigured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลเก็บในเครื่อง</p>
      )}

      {!canManage && configured && (
        <p className="crm-banner crm-banner--warn">ดูรายการได้ — แก้ไขได้เฉพาะทีม Sales / CEO / Dev / Ops</p>
      )}

      <section className="card card--wide line-snippets-admin__filters">
        <div className="line-snippets-admin__filter-row">
          <label>
            แพ็กเกจ
            <select
              value={pkgFilter}
              onChange={(e) => setPkgFilter(e.target.value as FilterPackage)}
              className="crm-select"
            >
              <option value="all">ทั้งหมด</option>
              <option value="__general__">ทั่วไป</option>
              {serviceOptions.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ประเภท
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value as FilterCategory)}
              className="crm-select"
            >
              <option value="all">ทั้งหมด</option>
              {(Object.keys(LINE_SNIPPET_CATEGORY_LABELS) as LineSnippetCategory[]).map((k) => (
                <option key={k} value={k}>
                  {LINE_SNIPPET_CATEGORY_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            สถานะ
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="crm-select"
            >
              <option value="all">ทั้งหมด</option>
              {(Object.keys(LINE_SNIPPET_SCHEDULE_LABELS) as LineSnippetScheduleStatus[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {LINE_SNIPPET_SCHEDULE_LABELS[k]} ({counts[k]})
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        <LineSnippetPlaceholderHelp />
      </section>

      {error && <p className="crm-error">{error}</p>}

      <section className="card card--wide">
        {loading ? (
          <p className="muted">กำลังโหลด…</p>
        ) : filtered.length === 0 ? (
          <p className="muted">ไม่มีข้อความตามตัวกรอง — ลองเพิ่มข้อความใหม่</p>
        ) : (
          <div className="crm-table-wrap">
            <table className="crm-table line-snippets-admin__table">
              <thead>
                <tr>
                  <th>ชื่อการ์ด</th>
                  <th>แพ็กเกจ</th>
                  <th>ประเภท</th>
                  <th>ช่วงเวลา</th>
                  <th>ลำดับ</th>
                  <th>ใช้ (ครั้ง)</th>
                  <th>ใช้ล่าสุด</th>
                  <th>สถานะ</th>
                  <th aria-label="การดำเนินการ" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const status = lineSnippetScheduleStatus(row)
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.title}</strong>
                        <p className="line-snippets-admin__preview muted">
                          {row.body.replace(/\s+/g, ' ').slice(0, 100)}
                          {row.body.length > 100 ? '…' : ''}
                        </p>
                      </td>
                      <td>{packageLabel(row.package_code)}</td>
                      <td>{LINE_SNIPPET_CATEGORY_LABELS[row.category]}</td>
                      <td>{formatLineSnippetValidity(row)}</td>
                      <td>{row.sort_order}</td>
                      <td>{row.use_count.toLocaleString('th-TH')}</td>
                      <td className="muted">
                        {row.last_used_at ? formatBangkokDateTime(row.last_used_at) : '—'}
                      </td>
                      <td>
                        <span className={`line-snippets-admin__status line-snippets-admin__status--${status}`}>
                          {LINE_SNIPPET_SCHEDULE_LABELS[status]}
                        </span>
                      </td>
                      <td className="line-snippets-admin__actions">
                        <button
                          type="button"
                          className="crm-btn crm-btn--ghost"
                          onClick={() => navigate(`/app/sales/line-snippets/${row.id}`)}
                        >
                          {canManage ? 'แก้ไข' : 'ดู'}
                        </button>
                        {canManage ? (
                          <button
                            type="button"
                            className="crm-btn crm-btn--danger"
                            onClick={() => void handleDelete(row)}
                          >
                            ลบ
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="muted line-snippets-admin__hint">
        <Link to="/app/sales/packages">จัดการแพ็กเกจบริการ</Link> — รหัสแพ็กเกจต้องตรงกับชิป &quot;บริการที่สนใจ&quot; ใน CRM
      </p>
    </div>
  )
}
