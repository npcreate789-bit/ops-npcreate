import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listPublicServicePackages } from '../../sales/api/packages'
import type { ServicePackageOption } from '../../../../shared/packages/serviceInterests'
import { isLocalDevHost } from '../../../../shared/config/appUrl'
import {
  COMPANY_BRAND_NAME,
  COMPANY_ICON_SRC,
  COMPANY_TAGLINE_EN,
} from '../../../../shared/company/companyProfile'
import { ContactInput } from '../components/ContactField'
import { ContactLineLoginStep } from '../components/ContactLineLoginStep'
import {
  contactCooldownMessage,
  contactFormTooFastMessage,
  CONTACT_MIN_FORM_MS,
  getContactCooldownRemainingMs,
  markContactCooldown,
} from '../contactRateLimit'
import {
  friendlyContactSubmitError,
  isContactLineLoginReady,
  validateContactDetails,
  validateLineLogin,
} from '../contactFormUtils'
import {
  finishContactHandoffAfterSubmit,
  openLineChatForInquiry,
  openLineHandoffPopup,
} from '../contactLineHandoff'
import { runContactSubmit } from '../contactSubmitFlow'
import { loginPathForAudience } from '../../../../shared/auth/postLoginPath'
import { readLineConnection } from '../../../../shared/contact/channelConnectConfig'
import {
  applyLineOAuthCallbackFromUrl,
  stripLineOAuthParamsFromUrl,
} from '../../../../shared/contact/lineOAuth'
import '../contact.css'

const HERO_POINTS = [
  'ขั้นที่ 1 — เชื่อมต่อ LINE Login',
  'ขั้นที่ 2 — กรอกชื่อ เบอร์ และบริการที่สนใจ',
  'กดส่ง — บันทึกในระบบ + เปิดแชท LINE @npcreate',
] as const

function serviceLabelsForCodes(
  codes: string[],
  options: ServicePackageOption[],
): string[] {
  return codes.map((code) => options.find((o) => o.code === code)?.name ?? code)
}

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
  const [channelConnectError, setChannelConnectError] = useState<string | null>(null)
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
  const [exitingAfterSubmit, setExitingAfterSubmit] = useState(false)

  const lineLoginReady = isContactLineLoginReady(lineUserId)

  useEffect(() => {
    const storedLine = readLineConnection()
    if (storedLine) {
      setLineUserId(storedLine.userId)
      setLineDisplayName(storedLine.displayName)
    }

    const lineResult = applyLineOAuthCallbackFromUrl(searchParams)
    if (lineResult) {
      if (lineResult.ok) {
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

    const validation = {
      ...validateLineLogin(lineUserId),
      ...validateContactDetails({
        contactName,
        phone,
        services,
        lineUserId,
      }),
    }
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

    const handoffWin = openLineHandoffPopup()

    try {
      const result = await runContactSubmit({
        contactName,
        phone,
        lineUserId,
        services,
        serviceLabels: serviceLabelsForCodes(services, serviceOptions),
        companyWebsite,
      })

      markContactCooldown()
      setSaving(false)
      setExitingAfterSubmit(true)

      openLineChatForInquiry(result.chatUrl, handoffWin)
      finishContactHandoffAfterSubmit(handoffWin)
    } catch (err) {
      handoffWin?.close()
      const raw = err instanceof Error ? err.message : 'ส่งข้อมูลไม่สำเร็จ'
      setFormError(friendlyContactSubmitError(raw))
      setSaving(false)
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (exitingAfterSubmit) {
    return (
      <div className="contact-page contact-page--success">
        <div className="contact-page__bg" aria-hidden />
        <article className="contact-success-card">
          <div className="contact-success-card__icon" aria-hidden>
            ✓
          </div>
          <h2>ส่งข้อมูลสำเร็จ</h2>
          <p>
            บันทึกในระบบ {COMPANY_BRAND_NAME} แล้ว — กำลังเปิด LINE และปิดหน้านี้
          </p>
          <p className="contact-success-card__wait">
            กรุณา<strong>กดส่งข้อความ</strong>ในแอป LINE @npcreate (ข้อความถูกเติมในช่องพิมพ์แล้ว)
          </p>
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
            กรอกข้อมูลแล้วกดส่ง — ระบบบันทึก Lead และเปิดแชท LINE @npcreate ให้ส่งรายละเอียดถึงทีม
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
                ขั้นที่ 1 — เชื่อมต่อ LINE Login
              </h2>
              <ContactLineLoginStep
                lineUserId={lineUserId || null}
                lineDisplayName={lineDisplayName}
                onLineDisconnected={() => {
                  setLineUserId('')
                  setLineDisplayName(null)
                }}
                error={fieldErrors.channelConnect ?? channelConnectError ?? undefined}
              />
            </section>

            <section
              className={`contact-section${lineLoginReady ? '' : ' contact-section--locked'}`}
              aria-labelledby="contact-sec-details"
              aria-disabled={!lineLoginReady}
            >
              <h2 id="contact-sec-details" className="contact-section__title">
                ขั้นที่ 2 — ข้อมูลติดต่อ
              </h2>
              {!lineLoginReady && (
                <p className="contact-section__lock-hint">
                  เชื่อมต่อ LINE Login ในขั้นที่ 1 ก่อน
                </p>
              )}

              <fieldset className="contact-section__fields" disabled={!lineLoginReady}>
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
                      setFieldErrors((prev) => ({ ...prev, contactName: undefined }))
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
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }))
                    }
                  }}
                  placeholder="0812345678"
                  autoComplete="tel"
                />

                <div className="contact-section__services">
                  <p className="contact-section__label">บริการที่สนใจ</p>
                  {servicesLoading && (
                    <p className="contact-section__hint contact-section__hint--muted">
                      กำลังโหลด...
                    </p>
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
              disabled={saving || !lineLoginReady}
            >
              {saving ? 'กำลังบันทึกและเปิด LINE...' : 'ส่งข้อมูลไป LINE @npcreate'}
            </button>
            <p className="contact-form-note">
              บันทึกในระบบทันที แล้วเปิดแชท LINE — กรุณากดส่งข้อความในแอปเพื่อให้ทีมเห็นรายละเอียด
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
