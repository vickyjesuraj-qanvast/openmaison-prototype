import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'

/**
 * Qanvast lead-return demo data (931:48236) — idempotent. Run once, then `pnpm db:baseline`.
 *  - enriches the two existing returns (Muthu Vinay processing · Arjun Mehta rejected) with the wizard fields, and moves
 *    Arjun's Qanvast reply into reply_reason / reply_remarks (the studio's own reason is "No response from lead")
 *  - adds five Qanvast leads from the Qanvast Ops mock (931:49232): David Koh (return processing), Farah Isa (return
 *    approved · refund processing), Emily Han (return processing), Jasmine Lee (Contacted), Gavin See (Contacted)
 *  Names, phones and budgets are the mock's placeholders; the rest is demo copy (REG-193).
 */
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const sec = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)
const one = async (sql: string, args: (string | number | null)[] = []) => (await client.execute({ sql, args })).rows[0]
const leadId = async (name: string) => { const r = await one('SELECT id FROM leads WHERE name = ? AND deleted_at IS NULL', [name]); return r ? String(r.id) : null }
const attach = async (returnId: string, lid: string, n: number, at: number) => {
  for (let i = 0; i < n; i++) {
    const fid = randomUUID()
    await client.execute({ sql: 'INSERT INTO lead_files (id, lead_id, kind, name, thumb, created_at, owner_id, size_bytes, mime, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', args: [fid, lid, 'image', 'Q-101', i % 2 === 0 ? '/figma-assets/file-thumb-1.png' : '/figma-assets/file-thumb-2.png', at + i * 60, 'dane', 728064, 'image/jpeg', at + i * 60] })
    await client.execute({ sql: 'INSERT INTO return_attachments (return_id, file_id, created_at) VALUES (?,?,?)', args: [returnId, fid, at] })
  }
}
let changed = 0
// 1. existing returns
const muthu = await leadId('Muthu Vinay'); const arjun = await leadId('Arjun Mehta')
if (muthu) { const r = await one('SELECT id, attempts FROM lead_returns WHERE lead_id = ?', [muthu]); if (r && r.attempts === null) { await client.execute({ sql: 'UPDATE lead_returns SET first_outreach_at = ?, attempts = ?, comments = ?, stage_before = ? WHERE id = ?', args: [sec('2026-08-26T14:00:00+05:30'), 3, 'Already contacted several times but no response.', 'Contacted', String(r.id)] }); await attach(String(r.id), muthu, 1, sec('2026-08-28T16:25:00+05:30')); changed++ } }
if (arjun) { const r = await one('SELECT id, attempts, reason FROM lead_returns WHERE lead_id = ?', [arjun]); if (r && r.attempts === null) { await client.execute({ sql: 'UPDATE lead_returns SET reason = ?, reply_reason = ?, reply_remarks = ?, first_outreach_at = ?, attempts = ?, comments = ?, stage_before = ? WHERE id = ?', args: ['No response from lead', 'Homeowner did not shortlist ID to proceed', 'Lead is valid as homeowner shortlisted and is still in discussion with other recommended IDs', sec('2026-08-24T14:00:00+05:30'), 3, 'Already contacted several times but no response.', 'On Hold', String(r.id)] }); await attach(String(r.id), arjun, 4, sec('2026-08-26T09:55:00+05:30')); changed++ } }
// 2. the Qanvast Ops mock's leads
type L = { name: string; phone: string; stage: string; ret?: { status: string; refund?: string; replied?: boolean } }
const NEW: L[] = [
  { name: 'David Koh', phone: '91234567', stage: 'Lost', ret: { status: 'processing' } },
  { name: 'Farah Isa', phone: '91234567', stage: 'Lost', ret: { status: 'approved', refund: 'processing', replied: true } },
  { name: 'Emily Han', phone: '91234567', stage: 'Lost', ret: { status: 'processing' } },
  { name: 'Jasmine Lee', phone: '91234567', stage: 'Contacted' },
  { name: 'Gavin See', phone: '91234567', stage: 'Contacted' },
]
let i = 0
for (const l of NEW) {
  if (await leadId(l.name)) { i++; continue }
  const id = randomUUID(); const created = sec('2026-08-20T11:00:00+05:30') + i * 3600
  await client.execute({ sql: 'INSERT INTO leads (id, name, phone, email, source, property_type, property_address, budget_minor, stage, style, key_collection, condition, created_at, updated_at, seen_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    args: [id, l.name, l.phone, null, 'Qanvast', 'HDB 4-Room', null, 7050000, l.stage, 'Contemporary', 'Collected', 'New', created, created, created] })
  await client.execute({ sql: 'INSERT INTO lead_assignees (id, lead_id, member_id) VALUES (?,?,?)', args: [randomUUID(), id, 'dane'] })
  if (l.ret) {
    const rid = randomUUID(); const returnedAt = sec('2026-08-28T16:30:00+05:30') - i * 1800
    await client.execute({ sql: 'INSERT INTO lead_returns (id, lead_id, status, returned_by_id, returned_at, reason, replied_by, replied_at, status_text, refund_status, appeal_days, created_at, first_outreach_at, attempts, comments, stage_before) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      args: [rid, id, l.ret.status, 'dane', returnedAt, 'No response from lead', l.ret.replied ? 'Qanvast - Business Team' : null, l.ret.replied ? returnedAt + 7200 : null, l.ret.status === 'approved' ? 'Return Approved' : l.ret.status === 'rejected' ? 'Return Rejected' : null, l.ret.refund ?? null, null, returnedAt, sec('2026-08-22T14:00:00+05:30'), 3, 'Already contacted several times but no response.', 'Contacted'] })
    await client.execute({ sql: 'INSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) VALUES (?,?,?,?,?,?)', args: [randomUUID(), id, 'Contacted', 'Lost', JSON.stringify({ reason: 'Lead returned to Qanvast' }), returnedAt] })
    await attach(rid, id, 1, returnedAt - 300)
  }
  changed++; i++
}
console.log(`seed-returns: ${changed} records touched`)
client.close()
