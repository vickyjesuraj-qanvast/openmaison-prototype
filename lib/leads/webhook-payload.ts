/*
 * (pending modules S34 — Company › Integrations' Webhooks were a stand-in with no address behind them; 1.0's src/lib/webhook-lead-parser.ts,
 * its keys and its rules kept) What an external system POSTs to a studio's webhook, read into one arrival. Pure.
 *   · any JSON (or a form's fields): name / full_name / customer_name · phone / mobile / contact_number · email · budget / budget_amount /
 *     budget_cents · property_type / propertyType / property · notes / message / comments · source (the page lists the main ones);
 *   · Google Ads' Lead Form: `user_column_data` [{ column_id, string_value }] (FULL_NAME or FIRST_NAME + LAST_NAME, PHONE_NUMBER, EMAIL; the
 *     other columns and the form's own questions go in the notes), its `google_key` checked against the endpoint's key, `is_test` answered
 *     without a lead, `lead_id` kept out of a second lead.
 */
export type WebhookArrival = { name: string | null; phone: string | null; email: string | null; budget: string | null; propertyType: string | null; message: string | null; source: string | null; externalId: string | null; isTest: boolean }

const pickFrom = (p: Record<string, unknown>) => (...keys: string[]): string | null => {
  for (const k of keys) { const v = p[k]; if ((typeof v === 'string' && v.trim()) || (typeof v === 'number' && Number.isFinite(v))) return String(v).trim().slice(0, 2000) }
  return null
}
const digitsOf = (s: string | null) => (s ? s.replace(/[^\d+]/g, '') || null : null)

export function readWebhookPayload(payload: Record<string, unknown>, platform: 'generic' | 'google_ads' | 'meta'): WebhookArrival {
  if (platform === 'google_ads') {
    const cols = new Map<string, string>()
    const custom: string[] = []
    for (const e of Array.isArray(payload.user_column_data) ? payload.user_column_data : []) {
      if (!e || typeof e !== 'object') continue
      const id = String((e as Record<string, unknown>).column_id ?? '').trim(), val = String((e as Record<string, unknown>).string_value ?? '').trim()
      if (!id || !val) continue
      if (/^(FULL_NAME|FIRST_NAME|LAST_NAME|EMAIL|WORK_EMAIL|PHONE_NUMBER|WORK_PHONE|POSTAL_CODE|CITY|REGION|COUNTRY|COMPANY_NAME|JOB_TITLE|STREET_ADDRESS)$/i.test(id)) cols.set(id.toUpperCase(), val)
      else custom.push(`${id} → ${val}`)
    }
    const name = cols.get('FULL_NAME') || [cols.get('FIRST_NAME'), cols.get('LAST_NAME')].filter(Boolean).join(' ').trim() || null
    const notes = [...['COMPANY_NAME', 'JOB_TITLE', 'STREET_ADDRESS', 'CITY', 'REGION', 'POSTAL_CODE', 'COUNTRY'].map((k) => (cols.get(k) ? `${k} → ${cols.get(k)}` : null)).filter((x): x is string => !!x), ...custom]
    const lead = payload.lead_id
    return { name, phone: digitsOf(cols.get('PHONE_NUMBER') ?? cols.get('WORK_PHONE') ?? null), email: cols.get('EMAIL') ?? cols.get('WORK_EMAIL') ?? null, budget: null, propertyType: null,
      message: notes.length ? notes.join('\n') : null, source: null, externalId: lead !== undefined && lead !== null && String(lead).trim() ? String(lead) : null, isTest: payload.is_test === true || payload.is_test === 'true' }
  }
  const pick = pickFrom(payload)
  /* budget_cents alone is in cents (1.0's rule) */
  const cents = !('budget' in payload) && !('budget_amount' in payload) && 'budget_cents' in payload
  const rawBudget = pick('budget', 'budget_amount', 'budget_cents')
  const n = rawBudget === null ? NaN : Number(rawBudget.replace(/[^\d.]/g, ''))
  return { name: pick('name', 'full_name', 'customer_name'), phone: digitsOf(pick('phone', 'mobile', 'contact_number')), email: pick('email'), budget: Number.isFinite(n) && n >= 0 ? String(cents ? n / 100 : n) : null,
    propertyType: pick('property_type', 'propertyType', 'property'), message: pick('notes', 'message', 'comments'), source: pick('source'), externalId: null, isTest: false }
}
