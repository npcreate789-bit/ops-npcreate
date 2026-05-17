import { logAudit } from '../../../../shared/audit/logAudit'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { Package, PackageInput, PackageListOptions } from '../types'
import { mockSalesApi } from './mockStore'

function mapRow(row: Record<string, unknown>): Package {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    base_price: Number(row.base_price),
    is_active: Boolean(row.is_active),
  }
}

/** แพ็กเกจสำหรับ dropdown ใบเสนอราคา — เฉพาะที่เปิดใช้งาน */
export async function listPackages(): Promise<Package[]> {
  return listAllPackages({ activeOnly: true })
}

export async function listAllPackages(options: PackageListOptions = {}): Promise<Package[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockSalesApi.listAllPackages(options)
  }

  let query = supabase.from('packages').select('*').order('name')
  if (options.activeOnly === true) query = query.eq('is_active', true)
  if (options.activeOnly === false) query = query.eq('is_active', false)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function getPackage(id: string): Promise<Package | null> {
  if (!isSupabaseConfigured || !supabase) return mockSalesApi.getPackage(id)

  const { data, error } = await supabase.from('packages').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRow(data) : null
}

export async function createPackage(input: PackageInput): Promise<Package> {
  if (!isSupabaseConfigured || !supabase) return mockSalesApi.createPackage(input)

  const { data, error } = await supabase
    .from('packages')
    .insert({
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      base_price: input.base_price,
      is_active: input.is_active,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  const pkg = mapRow(data)
  await logAudit('package.create', 'package', pkg.id, { code: pkg.code })
  return pkg
}

export async function updatePackage(id: string, input: PackageInput): Promise<Package> {
  if (!isSupabaseConfigured || !supabase) return mockSalesApi.updatePackage(id, input)

  const { data, error } = await supabase
    .from('packages')
    .update({
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      base_price: input.base_price,
      is_active: input.is_active,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  await logAudit('package.update', 'package', id, { code: input.code })
  return mapRow(data)
}

/** ปิดใช้งาน (soft delete) — รักษา FK ใน quotation_items */
export async function deactivatePackage(id: string): Promise<Package> {
  const existing = await getPackage(id)
  if (!existing) throw new Error('ไม่พบแพ็กเกจ')
  return updatePackage(id, { ...existing, is_active: false })
}
