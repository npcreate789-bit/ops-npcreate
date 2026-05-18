import { logAudit } from '../../../../shared/audit/logAudit'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import {
  calcProgress,
  CHECKLIST_ITEMS,
  computeReadyForAdsFromChecklist,
  isChecklistItemComplete,
} from '../constants'
import type {
  ChecklistItem,
  ChecklistValue,
  OnboardingCustomer,
  OnboardingDetail,
  OnboardingForm,
  OnboardingFormInput,
} from '../types'

const MOCK_KEY = 'npcreate_onboarding_dev'

function loadMock(): Record<string, OnboardingDetail> {
  try {
    const raw = localStorage.getItem(MOCK_KEY)
    return raw ? (JSON.parse(raw) as Record<string, OnboardingDetail>) : {}
  } catch {
    return {}
  }
}

function saveMock(data: Record<string, OnboardingDetail>) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(data))
}

function defaultChecklist(customerId: string): ChecklistItem[] {
  const now = new Date().toISOString()
  return CHECKLIST_ITEMS.map((def) => ({
    id: crypto.randomUUID(),
    customer_id: customerId,
    item_key: def.key,
    status: def.options[0].value,
    note: null,
    updated_at: now,
  }))
}

function applyMockReadyState(detail: OnboardingDetail): void {
  detail.checklist = detail.checklist.length
    ? detail.checklist
    : defaultChecklist(detail.customer.id)
  detail.customer.progress = calcProgress(detail.checklist)
  detail.customer.ready_for_ads = CHECKLIST_ITEMS.every((def) => {
    const row = detail.checklist.find((c) => c.item_key === def.key)
    return row ? isChecklistItemComplete(def.key, row.status) : false
  })
  detail.customer.has_form = Boolean(detail.form)
  detail.customer.client_submitted = Boolean(detail.form?.client_submitted_at)
}

function buildMockDetailFromCustomer(c: {
  id: string
  brand_name: string
  status: string
}): OnboardingDetail {
  const detail: OnboardingDetail = {
    customer: {
      id: c.id,
      brand_name: c.brand_name,
      status: c.status,
      ready_for_ads: false,
      account_owner_id: null,
      ads_owner_id: null,
      contract_end: null,
      progress: 0,
      has_form: false,
      client_submitted: false,
      has_portal: false,
    },
    form: null,
    checklist: defaultChecklist(c.id),
  }
  applyMockReadyState(detail)
  return detail
}

function mergeMockWithCustomers(store: Record<string, OnboardingDetail>): Record<string, OnboardingDetail> {
  try {
    const raw = localStorage.getItem('npcreate_customers_dev')
    const customers = raw
      ? (JSON.parse(raw) as { id: string; brand_name: string; status: string }[])
      : []
    for (const c of customers) {
      if (!['pending', 'active'].includes(c.status ?? 'pending')) continue
      if (!store[c.id]) store[c.id] = buildMockDetailFromCustomer(c)
    }
  } catch {
    /* ignore */
  }
  return store
}

function loadMockStore(): Record<string, OnboardingDetail> {
  const base = loadMock()
  const merged = mergeMockWithCustomers(base)
  if (Object.keys(merged).length !== Object.keys(base).length) saveMock(merged)
  return merged
}

export async function listOnboardingCustomers(): Promise<OnboardingCustomer[]> {
  if (!isSupabaseConfigured || !supabase) {
    return Object.values(loadMockStore()).map((d) => mapMockCustomer(d))
  }

  const db = supabase

  const [{ data, error }, { data: portalLinks, error: portalErr }] = await Promise.all([
    db
      .from('customers')
      .select('id, brand_name, status, ready_for_ads, account_owner_id, ads_owner_id, contract_end')
      .in('status', ['pending', 'active'])
      .order('brand_name'),
    db.from('client_customer_access').select('customer_id'),
  ])

  if (error) throw new Error(error.message)
  if (portalErr) throw new Error(portalErr.message)

  const linkedCustomers = new Set((portalLinks ?? []).map((r) => r.customer_id as string))

  const rows = await Promise.all(
    (data ?? []).map(async (c) => {
      const customerId = c.id as string

      let { count: clCount } = await db
        .from('onboarding_checklist')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)

      if ((clCount ?? 0) < CHECKLIST_ITEMS.length) {
        await db.rpc('ensure_onboarding_checklist', { p_customer_id: customerId })
      }

      const { data: checklist } = await db
        .from('onboarding_checklist')
        .select('item_key, status')
        .eq('customer_id', customerId)

      const { data: formRow } = await db
        .from('onboarding_forms')
        .select('client_submitted_at')
        .eq('customer_id', customerId)
        .maybeSingle()

      const items = (checklist ?? []).map((i) => ({
        item_key: i.item_key as string,
        status: i.status as ChecklistValue,
      }))

      return {
        id: customerId,
        brand_name: c.brand_name as string,
        status: c.status as string,
        ready_for_ads: computeReadyForAdsFromChecklist(items),
        account_owner_id: c.account_owner_id as string | null,
        ads_owner_id: c.ads_owner_id as string | null,
        contract_end: c.contract_end as string | null,
        progress: calcProgress(items),
        has_form: Boolean(formRow),
        client_submitted: Boolean(formRow?.client_submitted_at),
        has_portal: linkedCustomers.has(customerId),
      }
    }),
  )

  return rows
}

function mapMockCustomer(detail: OnboardingDetail): OnboardingCustomer {
  detail.customer.has_form = Boolean(detail.form)
  detail.customer.client_submitted = Boolean(detail.form?.client_submitted_at)
  return detail.customer
}

export async function getOnboardingDetail(customerId: string): Promise<OnboardingDetail> {
  if (!isSupabaseConfigured || !supabase) {
    const data = loadMockStore()
    const mock = data[customerId]
    if (mock) {
      applyMockReadyState(mock)
      data[customerId] = mock
      saveMock(data)
      return mock
    }
    const empty = buildMockDetailFromCustomer({
      id: customerId,
      brand_name: 'ลูกค้าตัวอย่าง',
      status: 'active',
    })
    data[customerId] = empty
    saveMock(data)
    return empty
  }

  const { data: customer, error: cErr } = await supabase
    .from('customers')
    .select('id, brand_name, status, ready_for_ads, account_owner_id, ads_owner_id, contract_end')
    .eq('id', customerId)
    .single()

  if (cErr) throw new Error(cErr.message)

  await supabase.rpc('ensure_onboarding_checklist', { p_customer_id: customerId })

  const { data: form } = await supabase
    .from('onboarding_forms')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle()

  const { data: checklist, error: clErr } = await supabase
    .from('onboarding_checklist')
    .select('*')
    .eq('customer_id', customerId)
    .order('item_key')

  if (clErr) throw new Error(clErr.message)

  await supabase.rpc('refresh_customer_ready_for_ads', { p_customer_id: customerId })

  const { data: refreshedCustomer } = await supabase
    .from('customers')
    .select('ready_for_ads')
    .eq('id', customerId)
    .single()

  const items = (checklist ?? []) as ChecklistItem[]
  const checklistSummary = items.map((i) => ({
    item_key: i.item_key,
    status: i.status,
  }))

  const readyFromChecklist = computeReadyForAdsFromChecklist(checklistSummary)

  const { data: portalLink } = await supabase
    .from('client_customer_access')
    .select('customer_id')
    .eq('customer_id', customerId)
    .maybeSingle()

  return {
    customer: {
      id: customer.id as string,
      brand_name: customer.brand_name as string,
      status: customer.status as string,
      ready_for_ads: Boolean(refreshedCustomer?.ready_for_ads ?? readyFromChecklist),
      account_owner_id: customer.account_owner_id as string | null,
      ads_owner_id: customer.ads_owner_id as string | null,
      contract_end: customer.contract_end as string | null,
      progress: calcProgress(checklistSummary),
      has_form: Boolean(form),
      client_submitted: Boolean((form as { client_submitted_at?: string | null } | null)?.client_submitted_at),
      has_portal: Boolean(portalLink),
    },
    form: (form as OnboardingForm) ?? null,
    checklist: items,
  }
}

export async function saveOnboardingForm(
  customerId: string,
  input: OnboardingFormInput,
): Promise<OnboardingForm> {
  if (!isSupabaseConfigured || !supabase) {
    const store = loadMockStore()
    const detail = store[customerId] ?? (await getOnboardingDetail(customerId))
    const now = new Date().toISOString()
    const form: OnboardingForm = {
      id: detail.form?.id ?? crypto.randomUUID(),
      customer_id: customerId,
      ...input,
      client_submitted_at: detail.form?.client_submitted_at ?? null,
      created_at: detail.form?.created_at ?? now,
      updated_at: now,
    }
    detail.form = form
    detail.customer.has_form = true
    applyMockReadyState(detail)
    store[customerId] = detail
    saveMock(store)
    return form
  }

  const { data: existing } = await supabase
    .from('onboarding_forms')
    .select('id')
    .eq('customer_id', customerId)
    .maybeSingle()

  const payload = { customer_id: customerId, ...input }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('onboarding_forms')
      .update(payload)
      .eq('customer_id', customerId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    await logAudit('onboarding.form_save', 'customer', customerId, { mode: 'update' })
    return data as OnboardingForm
  }

  const { data, error } = await supabase.from('onboarding_forms').insert(payload).select().single()
  if (error) throw new Error(error.message)
  await supabase.rpc('ensure_onboarding_checklist', { p_customer_id: customerId })
  await logAudit('onboarding.form_save', 'customer', customerId, { mode: 'create' })
  return data as OnboardingForm
}

export async function updateChecklistItem(
  customerId: string,
  itemKey: string,
  status: ChecklistValue,
  note?: string | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const store = loadMockStore()
    const detail = store[customerId] ?? (await getOnboardingDetail(customerId))
    const idx = detail.checklist.findIndex((c) => c.item_key === itemKey)
    if (idx >= 0) {
      detail.checklist[idx] = { ...detail.checklist[idx], status, note: note ?? null }
    } else {
      detail.checklist.push({
        id: crypto.randomUUID(),
        customer_id: customerId,
        item_key: itemKey,
        status,
        note: note ?? null,
        updated_at: new Date().toISOString(),
      })
    }
    applyMockReadyState(detail)
    store[customerId] = detail
    saveMock(store)
    return
  }

  await supabase.rpc('ensure_onboarding_checklist', { p_customer_id: customerId })

  const { error } = await supabase
    .from('onboarding_checklist')
    .update({ status, note: note ?? null })
    .eq('customer_id', customerId)
    .eq('item_key', itemKey)

  if (error) throw new Error(error.message)
  await supabase.rpc('refresh_customer_ready_for_ads', { p_customer_id: customerId })
  await logAudit('onboarding.checklist_update', 'customer', customerId, {
    item_key: itemKey,
    status,
  })
}

/** โหมด mock — บันทึกว่าลูกค้ากดส่งบรีฟแล้ว */
export async function markClientBriefSubmitted(customerId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) return
  const store = loadMockStore()
  const detail = store[customerId] ?? (await getOnboardingDetail(customerId))
  const now = new Date().toISOString()
  if (detail.form) {
    detail.form.client_submitted_at = detail.form.client_submitted_at ?? now
  } else {
    detail.form = {
      id: crypto.randomUUID(),
      customer_id: customerId,
      client_submitted_at: now,
      tiktok_shop_url: null,
      product_links: null,
      pricing_info: null,
      promotion_info: null,
      profit_margin: null,
      commission_info: null,
      target_roi: null,
      daily_ad_budget: null,
      existing_content: null,
      ads_account_info: null,
      seller_account_info: null,
      business_center_info: null,
      notes: null,
      created_at: now,
      updated_at: now,
    }
  }
  detail.customer.has_form = true
  applyMockReadyState(detail)
  store[customerId] = detail
  saveMock(store)
}

export async function assignOwners(
  customerId: string,
  accountOwnerId: string | null,
  adsOwnerId: string | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const store = loadMockStore()
    const detail = store[customerId]
    if (!detail) throw new Error('ไม่พบลูกค้า')
    detail.customer.account_owner_id = accountOwnerId
    detail.customer.ads_owner_id = adsOwnerId
    saveMock(store)
    return
  }
  const { error } = await supabase.rpc('assign_customer_owners', {
    p_customer_id: customerId,
    p_account_owner_id: accountOwnerId,
    p_ads_owner_id: adsOwnerId,
  })
  if (error) throw new Error(error.message)
}
