import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BUSINESS_TYPES } from '../../crm/constants'
import { listPublicServicePackages } from '../../sales/api/packages'
import type { ServicePackageOption } from '../../../../shared/packages/serviceInterests'
import { isLocalDevHost } from '../../../../shared/config/appUrl'
import {
  COMPANY_BRAND_NAME,
  COMPANY_ICON_SRC,
  COMPANY_TAGLINE_EN,
} from '../../../../shared/company/companyProfile'
import { ContactInput, ContactSelect } from '../components/ContactField'
import {
  contactCooldownMessage,
  contactFormTooFastMessage,
  CONTACT_MIN_FORM_MS,
  getContactCooldownRemainingMs,
  markContactCooldown,
} from '../contactRateLimit'
import {
  friendlyContactSubmitError,
  isContactLineReady,
  validateContactForm,
} from '../contactFormUtils'
import { loginPathForAudience } from '../../../../shared/auth/postLoginPath'
import { submitPublicInquiry } from '../api/submitInquiry'
import { LineContactSetupPanel } from '../components/LineContactSetupPanel'
import {
  readLineConnection,
  readLineOaContactStepDone,
} from '../../../../shared/contact/channelConnectConfig'
import {
  applyLineOAuthCallbackFromUrl,
  stripLineOAuthParamsFromUrl,
} from '../../../../shared/contact/lineOAuth'
import '../contact.css'

const HERO_POINTS = [
  'เชื่อมต่อ LINE ก่อน แล้วกรอกข้อมูลสั้นๆ',
  'ทีม Sales รับ Lead ในระบบทันที',
  'ติดต่อกลับภายใน 1–2 วันทำการ',
] as const

const SUCCESS_STEPS = [
  'ทีม Sales ติดต่อกลับทาง LINE @npcreate',
  'คุยรายละเอียดและเสนอแพ็กเกจ — ใบเสนอราคาส่งเมื่อพร้อม',
  'หลังเริ่มงาน ใช้แชทใน Client Workspace',
] as const

export function ContactPage() {
  const [searchParams] = useSearchParams()
  const formRef = useRef<HTMLFormElement>(null)
  const contactNameRef = useRef<HTMLInputElement>(null)
  const formReadyAtRef = useRef(Date.now())

  const [companyWebsite, setCompanyWebsite] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [lineUserId, setLineUserId] = useState('')
  const [lineDisplayName, setLineDisplayName] = useState<string | null>(null)
  const [lineOaStepDone, setLineOaStepDone] = useState(false)
  const [channelConnectError, setChannelConnectError] = useState<string | null>(null)
  const [businessType, setBusinessType] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServicePackageOption[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    contactName?: string
    phone?: string
    channelConnect?: string
  }>({})
  const [done, setDone] = useState(false)

  const lineReady = isContactLineReady({ lineOaStepDone, lineUserId })

  useEffect(() => {
    setLineOaStepDone(readLineOaContactStepDone())
    const storedLine = readLineConnection()
    if (storedLine) {
      setLineUserId(storedLine.userId)
      setLineDisplayName(storedLine.displayName)
    }

    const lineResult = applyLineOAuthCallbackFromUrl(searchParams)
    if (lineResult) {
      if (lineResult.ok) {
        setLineOaStepDone(readLineOaContactStepDone())
        setLineUserId(lineResult.userId)
        setLineDisplayName(lineResult.displayName)
        setChannelConnectError(null)
        setFieldErrors((e) => ({ ...e, channelConnect: undefined }))
      } else {
        setChannelConnectError(lineResult.error)
      }
      stripLineOAuthParamsFromUrl()
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    listPublicServicePackages()
      .then((opts) => {
        if (!cancelled) setServiceOptions(opts)
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleService(code: string) {
    setServices((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const cooldownMs = getContactCooldownRemainingMs()
    if (cooldownMs > 0) {
      setFormError(contactCooldownMessage(cooldownMs))
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (Date.now() - formReadyAtRef.current < CONTACT_MIN_FORM_MS) {
      setFormError(contactFormTooFastMessage())
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    const validation = validateContactForm({
      contactName,
      phone,
      businessType,
      services,
      lineUserId,
      lineOaStepDone,
    })
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation)
      setFormError(null)
      if (validation.channelConnect) {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (validation.contactName) {
        contactNameRef.current?.focus()
      }
      return
    }
    setFieldErrors({})
    setSaving(true)
    setFormError(null)
    try {
      const name = contactName.trim()
      await submitPublicInquiry({
        brand_name: name,
        preferred_contact_channel: 'line',
        contact_name: name,
        phone: phone.trim(),
        line_user_id: lineUserId.trim(),
        business_type: businessType || undefined,
        services_interested: services,
        company_website: companyWebsite,
      })
      markContactCooldown()
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'ส่งข้อมูลไม่สำเร็จ'
      setFormError(friendlyContactSubmitError(raw))
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="contact-page contact-page--success">
        <div className="contact-page__bg" aria-hidden />
        <article className="contact-success-card">
          <div className="contact-success-card__icon" aria-hidden>
            ✓
          </div>
          <h2>ส่งข้อมูลเรียบร้อย</h2>
          <p>
            ขอบคุณที่สนใจ {COMPANY_BRAND_NAME} ทีมงานจะติดต่อกลับทาง LINE @npcreate
          </p>
          <ol className="contact-success-steps">
            {SUCCESS_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="contact-success-actions">
            <Link to={loginPathForAudience('client')} className="contact-link--primary">
              เข้าสู่ระบบ (ลูกค้าปัจจุบัน)
            </Link>
            <a href="https://npcreate.co.th" className="contact-link--ghost" rel="noreferrer">
              กลับเว็บไซต์หลัก
            </a>
          </div>
        </article>
      </div>
    )
  }

  return (
    <div className="contact-page">
      <div className="contact-page__bg" aria-hidden />

      <div className="contact-layout">
        <header className="contact-hero">
          <img
            className="contact-hero__logo"
            src={COMPANY_ICON_SRC}
            alt={COMPANY_BRAND_NAME}
            width={56}
            height={56}
          />
          <p className="contact-hero__eyebrow">{COMPANY_TAGLINE_EN}</p>
          <h1>
            ติดต่อ<span className="contact-hero__accent">ทีมงาน</span>
          </h1>
          <p className="contact-hero__lead">
            เชื่อมต่อ LINE ก่อน จากนั้นกรอกข้อมูลสั้นๆ — ทีม Sales รับ Lead ในระบบทันที
          </p>
          <ul className="contact-hero__list">
            {HERO_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="contact-hero__footer">
            ลูกค้าปัจจุบัน?{' '}
            <Link to={loginPathForAudience('client')}>เข้าสู่ระบบ</Link>
            {isLocalDevHost() ? (
              <>
                {' '}
                · <span>โหมดพัฒนา</span>
              </>
            ) : null}
          </p>
        </header>

        <div className="contact-form-card">
          <form ref={formRef} className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="contact-honeypot" aria-hidden="true">
              <label htmlFor="contact-company-website">Company website</label>
              <input
                id="contact-company-website"
                name="company_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
              />
            </div>
            {formError && (
              <div className="contact-alert contact-alert--error" role="alert">
                {formError}
              </div>
            )}

            <section className="contact-section" aria-labelledby="contact-sec-line">
              <h2 id="contact-sec-line" className="contact-section__title">
                ขั้นที่ 1 — เชื่อมต่อ LINE
              </h2>
              <LineContactSetupPanel
                lineUserId={lineUserId || null}
                lineDisplayName={lineDisplayName}
                lineOaStepDone={lineOaStepDone}
                onLineOaStepDone={() => {
                  setLineOaStepDone(true)
                  setFieldErrors((e) => ({ ...e, channelConnect: undefined }))
                }}
                onLineDisconnected={() => {
                  setLineUserId('')
                  setLineDisplayName(null)
                }}
                error={fieldErrors.channelConnect ?? channelConnectError ?? undefined}
              />
            </section>

            <section
              className={`contact-section${lineReady ? '' : ' contact-section--locked'}`}
              aria-labelledby="contact-sec-details"
              aria-disabled={!lineReady}
            >
              <h2 id="contact-sec-details" className="contact-section__title">
                ขั้นที่ 2 — ข้อมูลติดต่อ
              </h2>
              {!lineReady && (
                <p className="contact-section__lock-hint">
                  ทำขั้นที่ 1 ให้ครบก่อน — ทัก LINE และเชื่อมต่อ Login
                </p>
              )}

              <fieldset className="contact-section__fields" disabled={!lineReady}>
                <ContactInput
                  id="contact-name"
                  ref={contactNameRef}
                  label="ชื่อผู้ติดต่อ"
                  required
                  error={fieldErrors.contactName}
                  value={contactName}
                  onChange={(e) => {
                    setContactName(e.target.value)
                    if (fieldErrors.contactName) {
                      setFieldErrors((e) => ({ ...e, contactName: undefined }))
                    }
                  }}
                  placeholder="ชื่อเล่นหรือชื่อจริง"
                  autoComplete="name"
                />
                <ContactInput
                  id="contact-phone"
                  label="เบอร์โทร"
                  required
                  type="tel"
                  inputMode="tel"
                  error={fieldErrors.phone}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    if (fieldErrors.phone) {
                      setFieldErrors((err) => ({ ...err, phone: undefined }))
                    }
                  }}
                  placeholder="0812345678"
                  autoComplete="tel"
                />
                <ContactSelect
                  id="contact-business"
                  label="ประเภทธุรกิจ"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                >
                  <option value="">— เลือกประเภท (ไม่บังคับ) —</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </ContactSelect>

                <div className="contact-section__services">
                  <p className="contact-section__label">บริการที่สนใจ</p>
                  {servicesLoading && (
                    <p className="contact-section__hint muted">กำลังโหลด...</p>
                  )}
                  <div className="contact-chips" role="group" aria-label="บริการที่สนใจ">
                    {serviceOptions.map((pkg) => (
                      <button
                        key={pkg.code}
                        type="button"
                        className={`contact-chip${services.includes(pkg.code) ? ' contact-chip--on' : ''}`}
                        onClick={() => toggleService(pkg.code)}
                        aria-pressed={services.includes(pkg.code)}
                      >
                        {pkg.name}
                      </button>
                    ))}
                  </div>
                </div>
              </fieldset>
            </section>

            <button
              type="submit"
              className="contact-submit"
              disabled={saving || !lineReady}
            >
              {saving ? 'กำลังส่ง...' : 'ส่งข้อมูลติดต่อ'}
            </button>
            <p className="contact-form-note">
              กดส่งถือว่ายินยอมให้ทีม NP Create ติดต่อกลับทาง LINE
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
