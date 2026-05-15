import { bangkokTodayIsoDate, bangkokYearMonthPrefix } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { CustomerOption, FinanceSummary, Payment, PaymentInput } from '../types'
import { mockFinanceApi } from './mockStore'

export async function listPayments(): Promise<Payment[]> {
  if (!isSupabaseConfigured || !supabase) return mockFinanceApi.listPayments()

  const { data, error } = await supabase
    .from('payments')
    .select('*, customers(brand_name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const cust = r.customers as { brand_name: string } | null
    return {
      ...(r as unknown as Payment),
      customer_brand_name: cust?.brand_name ?? null,
    }
  })
}

export async function getPayment(id: string): Promise<Payment | null> {
  if (!isSupabaseConfigured || !supabase) return mockFinanceApi.getPayment(id)

  const { data, error } = await supabase
    .from('payments')
    .select('*, customers(brand_name)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const r = data as Record<string, unknown>
  const cust = r.customers as { brand_name: string } | null
  return {
    ...(r as unknown as Payment),
    customer_brand_name: cust?.brand_name ?? null,
  }
}

export async function listCustomersForSelect(): Promise<CustomerOption[]> {
  if (!isSupabaseConfigured || !supabase) return mockFinanceApi.listCustomersForSelect()

  const { data, error } = await supabase
    .from('customers')
    .select('id, brand_name')
    .order('brand_name')

  if (error) throw new Error(error.message)
  return (data ?? []) as CustomerOption[]
}

export async function getCustomerWithQuotation(
  customerId: string,
  quotationId?: string | null,
): Promise<CustomerOption | null> {
  if (!isSupabaseConfigured || !supabase) {
    const list = await mockFinanceApi.listCustomersForSelect()
    const customer = list.find((c) => c.id === customerId)
    if (!customer) return null
    let quotation_total: number | null = null
    if (quotationId) {
      try {
        const raw = localStorage.getItem('npcreate_quotations_dev')
        const qts = raw ? (JSON.parse(raw) as { id: string; total: number }[]) : []
        quotation_total = qts.find((q) => q.id === quotationId)?.total ?? null
      } catch {
        quotation_total = null
      }
    }
    return {
      ...customer,
      quotation_id: quotationId ?? null,
      quotation_total,
    }
  }

  const { data, error } = await supabase
    .from('customers')
    .select('id, brand_name')
    .eq('id', customerId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  let quotation_total: number | null = null
  if (quotationId) {
    const { data: qt } = await supabase
      .from('quotations')
      .select('total')
      .eq('id', quotationId)
      .maybeSingle()
    quotation_total = (qt?.total as number) ?? null
  }

  return {
    id: data.id as string,
    brand_name: data.brand_name as string,
    quotation_id: quotationId ?? null,
    quotation_total,
  }
}

export async function createPayment(input: PaymentInput): Promise<Payment> {
  if (!isSupabaseConfigured || !supabase) return mockFinanceApi.createPayment(input)

  let receipt_number: string | null = null
  let tax_invoice_number: string | null = null

  if (input.issue_receipt) {
    const { data, error } = await supabase.rpc('next_receipt_number')
    if (error) throw new Error(error.message)
    receipt_number = data as string
  }
  if (input.issue_tax_invoice) {
    const { data, error } = await supabase.rpc('next_tax_invoice_number')
    if (error) throw new Error(error.message)
    tax_invoice_number = data as string
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      customer_id: input.customer_id,
      quotation_id: input.quotation_id,
      recorded_by: input.recorded_by,
      service_type: input.service_type,
      amount: input.amount,
      vat_amount: input.vat_amount,
      total_amount: input.total_amount,
      status: input.status,
      payment_date: input.payment_date,
      due_date: input.due_date,
      notes: input.notes,
      receipt_number,
      tax_invoice_number,
      confirmed_at: input.status === 'paid' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  if (input.status === 'paid') {
    await supabase.rpc('confirm_payment', { p_payment_id: data.id })
  }

  return (await getPayment(data.id as string))!
}

export async function updatePayment(id: string, input: PaymentInput): Promise<Payment> {
  if (!isSupabaseConfigured || !supabase) {
    await mockFinanceApi.updatePayment(id, input)
    return (await mockFinanceApi.getPayment(id))!
  }

  const existing = await getPayment(id)
  let receipt_number = existing?.receipt_number ?? null
  let tax_invoice_number = existing?.tax_invoice_number ?? null

  if (input.issue_receipt && !receipt_number) {
    const { data, error } = await supabase.rpc('next_receipt_number')
    if (error) throw new Error(error.message)
    receipt_number = data as string
  }
  if (input.issue_tax_invoice && !tax_invoice_number) {
    const { data, error } = await supabase.rpc('next_tax_invoice_number')
    if (error) throw new Error(error.message)
    tax_invoice_number = data as string
  }

  const { error } = await supabase
    .from('payments')
    .update({
      service_type: input.service_type,
      amount: input.amount,
      vat_amount: input.vat_amount,
      total_amount: input.total_amount,
      status: input.status,
      payment_date: input.payment_date,
      due_date: input.due_date,
      notes: input.notes,
      receipt_number,
      tax_invoice_number,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  if (input.status === 'paid' && existing?.status !== 'paid') {
    await supabase.rpc('confirm_payment', { p_payment_id: id })
  }

  return (await getPayment(id))!
}

export async function confirmPayment(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return mockFinanceApi.confirmPayment(id)
  const { error } = await supabase.rpc('confirm_payment', { p_payment_id: id })
  if (error) throw new Error(error.message)
}

export async function getPaymentSlipUrl(slipPath: string): Promise<string | null> {
  if (slipPath.startsWith('data:')) return slipPath
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase.storage.from('payments').createSignedUrl(slipPath, 3600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'))
    reader.readAsDataURL(file)
  })
}

export async function uploadPaymentSlip(
  paymentId: string,
  customerId: string,
  recordedBy: string,
  file: File,
): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    const dataUrl = await fileToDataUrl(file)
    await mockFinanceApi.uploadSlip(paymentId, dataUrl)
    return dataUrl
  }
  const path = `${recordedBy}/${customerId}/${paymentId}/${Date.now()}_${file.name}`
  const { error: upError } = await supabase.storage.from('payments').upload(path, file)
  if (upError) throw new Error(upError.message)
  const { error } = await supabase.from('payments').update({ slip_path: path }).eq('id', paymentId)
  if (error) throw new Error(error.message)
  return path
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
  if (!isSupabaseConfigured || !supabase) return mockFinanceApi.getSummary()

  const { data, error } = await supabase
    .from('payments')
    .select('status, total_amount, payment_date, due_date')
  if (error) throw new Error(error.message)

  const monthPrefix = bangkokYearMonthPrefix()
  const today = bangkokTodayIsoDate()

  let revenue_this_month = 0
  let pending_total = 0
  let overdue_count = 0
  let paid_count_this_month = 0

  for (const row of data ?? []) {
    const status = row.status as string
    const total = Number(row.total_amount)
    const pd = row.payment_date as string | null
    const due = row.due_date as string | null
    if (status === 'paid' && pd?.startsWith(monthPrefix)) {
      revenue_this_month += total
      paid_count_this_month += 1
    }
    if (status === 'pending') {
      pending_total += total
      if (due && due < today) overdue_count += 1
    }
    if (status === 'overdue') overdue_count += 1
  }

  return { revenue_this_month, pending_total, overdue_count, paid_count_this_month }
}
