import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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
  NPCREATE_FACEBOOK_MESSENGER_URL,
  PREFERRED_CONTACT_CHANNEL_OPTIONS,
  type PreferredContactChannel,
} from '../../../../shared/crm/preferredContactChannel'
import { friendlyContactSubmitError, validateContactForm } from '../contactFormUtils'
import { loginPathForAudience } from '../../../../shared/auth/postLoginPath'
import { submitPublicInquiry } from '../api/submitInquiry'
import '../contact.css'

const HERO_POINTS = [
  'ทีม Sales รับ Lead อัตโนมัติในระบบ',
  'กรอกแค่ข้อมูลติดต่อ — รายละเอียดงานทำในขั้นตอนบรีฟภายหลัง',
  'Account ติดต่อกลับภายใน 1–2 วันทำการ',
] as const

const SUCCESS_STEPS = [
  'ทีม Sales ตรวจสอบและติดต่อกลับทางช่องทางที่คุณเลือก (LINE หรือ Facebook)',
  'คุยรายละเอียดและเสนอแพ็กเกจนอกระบบ — ใบเสนอราคาส่งเมื่อพร้อม',
  'หลังชำระและเริ่มงาน ใช้แชทใน Client Workspace และกรอกบรีฟ',
] as const

export function ContactPage() {
  const formRef = useRef<HTMLFormElement>(null)
  const brandRef = useRef<HTMLInputElement>(null)
  const formReadyAtRef = useRef(Date.now())

  const [brandName, setBrandName] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [preferredChannel, setPreferredChannel] = useState<PreferredContactChannel | ''>('')
  const [lineId, setLineId] = useState('')
  const [facebook, setFacebook] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServicePackageOption[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [budget, setBudget] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    brand?: string
    preferredChannel?: string
    lineId?: string
  }>({})
  const [done, setDone] = useState(false)

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
      brandName,
      preferredChannel,
      lineId,
      facebook,
    })
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation)
      setFormError(null)
      if (validation.brand) {
        brandRef.current?.focus()
        brandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      return
    }
    setFieldErrors({})
    setSaving(true)
    setFormError(null)
    try {
      await submitPublicInquiry({
        brand_name: brandName,
        preferred_contact_channel: preferredChannel as PreferredContactChannel,
        contact_name: contactName,
        phone,
        line_id: preferredChannel === 'line' ? lineId : lineId || undefined,
        facebook,
        business_type: businessType || undefined,
        services_interested: services,
        ad_budget_monthly: budget ? Number(budget) : null,
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
            ขอบคุณที่สนใจ {COMPANY_BRAND_NAME} ทีมงานได้รับข้อมูลแล้วและจะติดต่อกลับโดยเร็วที่สุด
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
            ฝากข้อมูลติดต่อและบริการที่สนใจ — ข้อมูลเข้าสู่ระบบ NP Create OS ทันที
            รายละเอียดงานเพิ่มเติมกรอกในขั้นตอนบรีฟหลังเริ่มงานจริง
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

            <section className="contact-section" aria-labelledby="contact-sec-brand">
              <h2 id="contact-sec-brand" className="contact-section__title">
                ข้อมูลแบรนด์
              </h2>
              <ContactInput
                id="contact-brand"
                ref={brandRef}
                label="ชื่อแบรนด์"
                required
                error={fieldErrors.brand}
                value={brandName}
                onChange={(e) => {
                  setBrandName(e.target.value)
                  if (fieldErrors.brand) setFieldErrors({})
                }}
                placeholder="เช่น แบรนด์สกินแคร์ ABC"
                autoComplete="organization"
              />
              <ContactInput
                id="contact-name"
                label="ชื่อผู้ติดต่อ"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="ชื่อเล่นหรือชื่อจริง"
                autoComplete="name"
              />
              <ContactInput
                id="contact-phone"
                label="เบอร์โทร"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812345678"
                autoComplete="tel"
                hint="ใส่เฉพาะตัวเลข ไม่ต้องมีขีด"
              />

              <div className="contact-section contact-section--channel">
                <p className="contact-section__label">
                  ช่องทางติดต่อกลับ <span className="contact-field__req" aria-hidden> *</span>
                </p>
                <p className="contact-section__hint">
                  ทีม NP Create จะตอบกลับทางช่องทางที่เลือก — ระหว่างเสนอราคายังไม่ใช้แชทในระบบ
                </p>
                {fieldErrors.preferredChannel && (
                  <p className="contact-field-error" role="alert">
                    {fieldErrors.preferredChannel}
                  </p>
                )}
                <div
                  className="contact-chips contact-chips--channel"
                  role="radiogroup"
                  aria-label="ช่องทางติดต่อกลับ"
                  aria-required
                >
                  {PREFERRED_CONTACT_CHANNEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={preferredChannel === opt.value}
                      className={`contact-chip contact-chip--channel${preferredChannel === opt.value ? ' contact-chip--on' : ''}`}
                      onClick={() => {
                        setPreferredChannel(opt.value)
                        if (fieldErrors.preferredChannel) {
                          setFieldErrors((e) => ({ ...e, preferredChannel: undefined }))
                        }
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {preferredChannel === 'line' && (
                  <ContactInput
                    id="contact-line"
                    label="LINE ID"
                    required
                    error={fieldErrors.lineId}
                    value={lineId}
                    onChange={(e) => {
                      setLineId(e.target.value)
                      if (fieldErrors.lineId) {
                        setFieldErrors((err) => ({ ...err, lineId: undefined }))
                      }
                    }}
                    placeholder="@brandabc"
                    hint={PREFERRED_CONTACT_CHANNEL_OPTIONS.find((o) => o.value === 'line')?.hint}
                  />
                )}
                {preferredChannel === 'facebook' && (
                  <>
                    <p className="contact-section__hint contact-fb-hint">
                      ทักเพจ NP Create ได้เลย —{' '}
                      <a
                        href={NPCREATE_FACEBOOK_MESSENGER_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        เปิด Messenger
                      </a>
                      {' '}หรือระบุลิงก์เพจของคุณด้านล่าง (ไม่บังคับ)
                    </p>
                    <ContactInput
                      id="contact-facebook"
                      label="Facebook / เพจของคุณ"
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      placeholder="ลิงก์เพจหรือชื่อเพจ (ไม่บังคับ)"
                    />
                  </>
                )}
              </div>
              <ContactSelect
                id="contact-business"
                label="ประเภทธุรกิจ"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                <option value="">— เลือกประเภท —</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </ContactSelect>
            </section>

            <section className="contact-section" aria-labelledby="contact-sec-services">
              <h2 id="contact-sec-services" className="contact-section__title">
                บริการที่สนใจ
              </h2>
              <p className="contact-section__hint">
                เลือกได้มากกว่า 1 รายการ — รายการตรงกับแพ็กเกจในระบบ Sales
              </p>
              {servicesLoading && (
                <p className="contact-section__hint muted">กำลังโหลดรายการบริการ...</p>
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
              <ContactInput
                id="contact-budget"
                label="งบประมาณเบื้องต้น (บาท/เดือน)"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
                placeholder="30000 (ไม่บังคับ)"
                hint="ช่วยทีม Sales เสนอแพ็กเกจ — ข้ามได้ถ้ายังไม่แน่ใจ"
              />
            </section>

            <button type="submit" className="contact-submit" disabled={saving}>
              {saving ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลติดต่อ'}
            </button>
            <p className="contact-form-note">
              กดส่งถือว่ายินยอมให้ทีม NP Create ติดต่อกลับตามข้อมูลที่กรอก — รายละเอียดงานเพิ่มเติมกรอกในขั้นตอนบรีฟหลังเริ่มงาน
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
