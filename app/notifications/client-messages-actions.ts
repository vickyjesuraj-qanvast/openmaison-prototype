'use server'

import { requirePlan } from '@/lib/credits/plan-gate'
import { revalidatePath } from 'next/cache'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { fetchClientMessageRules, saveClientMessageRules } from '@/lib/portal/client-messages-send'
import { isClientEvent, type ClientChannel, type ClientMessageRules, type ClientTemplate } from '@/lib/portal/client-messages'

/*
 * (gaps build H — H-Q18) Settings › Notifications › Messages to clients: each event's Email and WhatsApp switch, and each message's words.
 * Owners and Admins change them (Settings' rule); the refusal answers `{ error }`.
 */
type Refusal = { error: string }
const RULE = 'Only Owners and Admins change the messages clients get'
async function runner(): Promise<Refusal | null> { return runsStudio((await fetchViewer()).role) ? null : { error: RULE } }

export async function setClientChannel(input: { event: string; channel: ClientChannel; on: boolean }): Promise<{ rules: ClientMessageRules } | Refusal> {
  const no = await runner(); if (no) return no
  if (!isClientEvent(input?.event) || (input.channel !== 'email' && input.channel !== 'whatsapp')) return { error: 'That message isn’t one OpenMaison sends' }
  if (input.channel === 'whatsapp' && input.on === true) { const lock = await requirePlan('whatsapp_notifications'); if (lock) return lock }   // (pending modules S19)
  const r = await fetchClientMessageRules()
  const rules: ClientMessageRules = { ...r, channels: { ...r.channels, [input.event]: { ...r.channels[input.event], [input.channel]: input.on === true } } }
  await saveClientMessageRules(rules)
  revalidatePath('/settings')
  return { rules }
}

export async function setClientTemplate(input: ClientTemplate): Promise<{ rules: ClientMessageRules } | Refusal> {
  const no = await runner(); if (no) return no
  if (!isClientEvent(input?.event) || (input.channel !== 'email' && input.channel !== 'whatsapp')) return { error: 'That message isn’t one OpenMaison sends' }
  const body = typeof input.body === 'string' ? input.body.slice(0, 2000) : ''
  if (!body.trim()) return { error: 'Write the message first' }
  const r = await fetchClientMessageRules()
  const templates = r.templates.map((t) => (t.event === input.event && t.channel === input.channel ? { ...t, subject: typeof input.subject === 'string' ? input.subject.slice(0, 120) : t.subject, body } : t))
  const rules = { ...r, templates }
  await saveClientMessageRules(rules)
  revalidatePath('/settings')
  return { rules }
}
