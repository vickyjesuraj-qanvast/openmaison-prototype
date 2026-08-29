import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { randomUUID } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'
import * as schema from '../lib/db/schema'
import { TEAM } from '../lib/leads/enums'

/**
 * Demo dataset per build plan §0C (approved): 18 leads keeping the mock's cast
 * plus 12 SG-plausible names, spread across all 7 stages, unique budgets,
 * varied sources/property types weighted like a real funnel (Instagram/Gmail-
 * heavy), realistic task mix (overdue / due today / scheduled / none).
 * Idempotent — clears the leads domain and reseeds. Auth tables untouched.
 */

const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const db = drizzle(client, { schema })

const now = new Date()
const day = 86_400_000
const at = (d: number, h = 10) => { const x = new Date(now.getTime() - d * day); x.setHours(h, 0, 0, 0); return x }
const ahead = (d: number, h = 10) => { const x = new Date(now.getTime() + d * day); x.setHours(h, 0, 0, 0); return x }

type SeedLead = {
  name: string; phone: string; email?: string; source: string; propertyType: string
  address?: string; budget: number; stage: string; created: number
  assignees: string[]
  tasks?: { title: string; kind?: string; due?: Date }[]
  deleted?: { reason: string; daysAgo: number }
}

const LEADS: SeedLead[] = [
  // ---- the mock cast ----
  { name: 'Olivia Martinez', phone: '91234567', email: 'demo@openmaison.com', source: 'Instagram',
    propertyType: 'HDB 4-Room', address: '12 Marina Boulevard, Singapore 123456', budget: 70_500,
    stage: 'New', created: 2, assignees: [],
    tasks: [{ title: 'Call home owner as soon as possible', kind: 'Call', due: ahead(0, 18) }] },
  { name: 'Farah Ahmad', phone: '98120443', source: 'Instagram', propertyType: 'HDB 4-Room',
    address: 'Waterway Sunrise, Punggol', budget: 68_000, stage: 'Contacted', created: 6,
    assignees: ['dane', 'sarah'],
    tasks: [
      { title: 'Send moodboard references', due: at(7) },           // overdue
      { title: 'Follow up on WhatsApp', kind: 'Call', due: ahead(0, 17) },
      { title: 'Prepare space planning draft' },
    ] },
  { name: 'Muthu Vinay', phone: '96530871', source: 'Qanvast', propertyType: 'Condo 3-bedder',
    address: 'The Florence Residences, Hougang', budget: 124_000, stage: 'Contacted', created: 8,
    assignees: ['james', 'michelle'], tasks: [{ title: 'Schedule showroom visit', due: ahead(2) }] },
  { name: 'Gerald Tan', phone: '98873012', source: 'Referral', propertyType: 'Executive Condo',
    address: 'North Gaia, Yishun', budget: 96_000, stage: 'Met', created: 12,
    assignees: ['dane'], tasks: [{ title: 'Send meeting summary + next steps', due: at(1, 9) }] }, // overdue
  { name: 'Vivien Lee', phone: '91008254', source: 'Website', propertyType: 'Condo 2-bedder',
    address: 'Parc Clematis, Clementi', budget: 88_500, stage: 'Quote Sent', created: 15,
    assignees: ['sarah'], tasks: [{ title: 'Chase quote confirmation', kind: 'Call', due: ahead(1) }] },
  { name: 'Benjamin Han', phone: '97731968', source: 'Email', propertyType: 'HDB 5-Room',
    address: 'SkyOasis @ Dawson, Queenstown', budget: 74_000, stage: 'Won', created: 32,
    assignees: ['dane', 'germaine'], tasks: [] },
  // ---- generated cast (names only; all enum values from the mocks) ----
  { name: 'Priya Nair', phone: '97244810', source: 'Website', propertyType: 'Condo 2-bedder',
    address: 'The Clement Canopy, Clementi', budget: 98_000, stage: 'New', created: 1,
    assignees: [], tasks: [] },
  { name: 'Marcus Chen', phone: '96105533', source: 'Email', propertyType: 'BTO 4-Room',
    address: 'Tampines GreenGem', budget: 52_000, stage: 'New', created: 1,
    assignees: [], tasks: [{ title: 'Qualify budget and timeline', due: ahead(1) }] },
  { name: 'Aisha Rahman', phone: '98902411', source: 'Referral', propertyType: 'HDB 5-Room',
    address: 'Compassvale Ancilla, Sengkang', budget: 64_000, stage: 'New', created: 3,
    assignees: ['michelle'], tasks: [] },
  { name: 'Jonathan Teo', phone: '91778294', source: 'Google Ads', propertyType: 'Condo Studio / 1-bedder',
    address: 'One Pearl Bank, Outram', budget: 58_000, stage: 'Contacted', created: 9,
    assignees: ['alex'], tasks: [{ title: 'Share portfolio deck', due: at(2) }] },  // overdue
  { name: 'Grace Lim', phone: '98455320', source: 'Meta Ads', propertyType: 'Condo 3-bedder',
    address: 'Parc Esta, Eunos', budget: 132_000, stage: 'Met', created: 14,
    assignees: ['james', 'sarah'], tasks: [{ title: 'Draft initial concept boards', due: ahead(3) }] },
  { name: 'Kevin Ng', phone: '96882109', source: 'Website', propertyType: 'Landed — Semi-D',
    address: 'Watten House, Bukit Timah', budget: 260_000, stage: 'Met', created: 18,
    assignees: ['dane', 'james', 'michelle'], tasks: [{ title: 'Site measurement visit', kind: 'Call', due: ahead(0, 15) }] },
  { name: 'Serena Koh', phone: '98230785', source: 'Instagram', propertyType: 'Condo 2-bedder',
    address: "The Reef at King's Dock, Harbourfront", budget: 118_000, stage: 'Quote Sent', created: 20,
    assignees: ['germaine'], tasks: [{ title: 'Revise quote per feedback', due: ahead(2) }] },
  { name: 'Harpreet Kaur', phone: '91343428', source: 'Organic', propertyType: 'BTO 5-Room',
    address: 'Rivervale Shores, Sengkang', budget: 71_000, stage: 'Quote Sent', created: 22,
    assignees: ['sarah', 'alex'], tasks: [] },
  { name: 'Ryan D’Souza', phone: '97551246', source: 'Email', propertyType: 'Executive Condo',
    address: 'Bishan Loft, Bishan', budget: 89_000, stage: 'Won', created: 45,
    assignees: ['michelle'], tasks: [] },
  { name: 'Mei Ling Tan', phone: '91660984', source: 'Walk-in', propertyType: 'HDB 5-Room',
    address: 'Pinnacle @ Duxton, Tanjong Pagar', budget: 76_000, stage: 'On Hold', created: 28,
    assignees: ['dane'], tasks: [] },
  { name: 'Arjun Mehta', phone: '98004172', source: 'Qanvast', propertyType: 'Condo 4-bedder',
    address: 'Leedon Green, Holland', budget: 185_000, stage: 'On Hold', created: 35,
    assignees: ['james'], tasks: [] },
  { name: 'Chloe Yap', phone: '96491830', source: 'Facebook', propertyType: 'HDB 4-Room',
    address: 'SkyTerrace @ Dawson, Queenstown', budget: 61_000, stage: 'Lost', created: 40,
    assignees: [], tasks: [] },
]

await db.delete(schema.importRows)
await db.delete(schema.imports)
await db.delete(schema.stageLogs)
await db.delete(schema.leadTasks)
await db.delete(schema.leadAssignees)
await db.delete(schema.leads)
await db.delete(schema.members)

await db.insert(schema.members).values(TEAM.map(m => ({
  id: m.id, name: m.name, role: m.role, color: m.color, isYou: 'isYou' in m ? !!m.isYou : false,
})))

for (const l of LEADS) {
  const id = randomUUID()
  const created = at(l.created, 11)
  await db.insert(schema.leads).values({
    id, name: l.name, phone: l.phone, email: l.email ?? null, source: l.source,
    propertyType: l.propertyType, propertyAddress: l.address ?? null,
    budgetMinor: l.budget * 100, stage: l.stage,
    style: 'Contemporary', keyCollection: 'Collected', condition: 'New',
    areaSqft: null, notes: null,
    createdAt: created, updatedAt: at(Math.max(0, l.created - 1), 15),
  })
  for (const m of l.assignees) {
    await db.insert(schema.leadAssignees).values({ id: randomUUID(), leadId: id, memberId: m })
  }
  for (const t of l.tasks ?? []) {
    await db.insert(schema.leadTasks).values({
      id: randomUUID(), leadId: id, title: t.title, kind: t.kind ?? 'General',
      dueAt: t.due ?? null, done: false, createdAt: created,
    })
  }
}

// Deleted Leads folder (779:26316) — two archived leads so the sheet demos populated.
const DELETED = [
  { name: 'Daniel Ong', phone: '93456712', source: 'Facebook', propertyType: 'HDB 3-Room',
    address: 'Bedok Reservoir View', budget: 45_000, stage: 'New', created: 20, deleted: 3, reason: 'Duplicate' },
  { name: 'Jason Lim', phone: '87654321', source: 'Walk-in', propertyType: 'Condo 2-bedder',
    address: null, budget: 60_000, stage: 'Contacted', created: 34, deleted: 9, reason: 'Not a real lead' },
]
for (const l of DELETED) {
  await db.insert(schema.leads).values({
    id: randomUUID(), name: l.name, phone: l.phone, email: null, source: l.source,
    propertyType: l.propertyType, propertyAddress: l.address, budgetMinor: l.budget * 100,
    stage: l.stage, style: 'Contemporary', keyCollection: 'Collected', condition: 'New',
    areaSqft: null, notes: null,
    deletedAt: at(l.deleted, 16), deleteReason: l.reason, stageBeforeDelete: l.stage,
    createdAt: at(l.created, 11), updatedAt: at(l.deleted, 16),
  })
}

// Import history sample (populated state of screen 39) — verbatim shape from mock
await db.insert(schema.imports).values({
  id: randomUUID(), fileName: 'aug-leads.csv', totalRows: 243, importedRows: 233,
  skippedRows: 10, errorNote: '5 errors detected across 10 skipped leads',
  createdAt: at(41),
})

const counts = { leads: LEADS.length, stages: {} as Record<string, number> }
for (const l of LEADS) counts.stages[l.stage] = (counts.stages[l.stage] ?? 0) + 1
console.log('seeded', JSON.stringify(counts))
client.close()
