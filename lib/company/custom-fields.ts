import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadCustomFieldValues, leadCustomFields } from '@/lib/db/schema'
import { isCustomFieldType, parseFieldOptions, parseFieldValue, type CustomFieldDef, type CustomValues } from '@/lib/leads/custom-fields-model'

/* (REG-612, parity Q-25) The studio's custom lead fields and a lead's values. */
export async function fetchCustomFields(activeOnly = false): Promise<CustomFieldDef[]> {
  const rows = await db.select().from(leadCustomFields).orderBy(asc(leadCustomFields.orderIndex), asc(leadCustomFields.createdAt))
  return rows.filter((r) => (activeOnly ? r.isActive : true)).map((r) => ({ id: r.id, label: r.label, fieldType: isCustomFieldType(r.fieldType) ? r.fieldType : 'text', options: parseFieldOptions(r.options), isRequired: r.isRequired, orderIndex: r.orderIndex, isActive: r.isActive }))
}
export async function fetchCustomValues(leadId: string): Promise<CustomValues> {
  const rows = await db.select().from(leadCustomFieldValues).where(eq(leadCustomFieldValues.leadId, leadId))
  const out: CustomValues = {}
  for (const r of rows) { const v = parseFieldValue(r.value); if (v !== null) out[r.fieldId] = v }
  return out
}
