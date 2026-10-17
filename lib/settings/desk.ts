import 'server-only'
import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { isMarketing, MARKETING, roleGate } from '@/lib/settings/roles'
import { refuse, type Refusal } from '@/lib/company/template-rules'

/**
 * (S45C — S44Z's note to the developers; as recommended — her ask 2026-10-17) THE WORKSPACE'S ROLE RULE ON THE SERVER, for every action a
 * Marketing member must not run. Their pages answer Marketing with the house gate before a record is read (S44O · S44Z); the actions behind
 * those pages trusted that gate, so a call made by hand was refused only where an action happened to ask the role. Now each of them asks here,
 * as its first line, before anything is read or written:
 *
 *   · the Company libraries (Templates — quotes, contracts, tasks, T&Cs, payment schedules, schedules; the brand kit and its fonts; Price book;
 *     folders; Materials; Members' other rows; Profile's About, public profiles and the Qanvast listing; Questionnaire; Plan & AI credits),
 *     the AI Visualizer, the 3D Space Planner (and its floor-plan photos), Meetings, Quote X-Ray, the Marketplace, Finance › Vendors,
 *     Qanvast Ops and Projects (whose writes already asked `worksOn`, but whose reads asked only Who sees leads — every lead, for Marketing) —
 *     `workspaceRefusal()`, answering the gate's own sentence (`roleGate`), so a crafted call reads what the page would say;
 *   · the quote and contract actions of a lead's Quotes and Contracts tabs keep S44Z's words (lib/quotes/desk.ts `deskRefusal`, ON_DESK).
 *
 * Marketing keeps what C6 gives it: the leads (their tabs Tasks · Files · Notes & Logs · Questionnaire · Activity, assigning, the Move stage
 * window — whose Met step reads a held meeting and whose Quote Sent / Won documents answer nothing for Marketing), Reports › Leads, Settings ›
 * Lead management (the page also reads the ticket categories' counts), Company › Integrations, Your profile (its own details, contact code,
 * PayNow, open to leads), View as, and the client pages a client opens (they never ask a role). Marketing only, as S44Z: Accounting's pages
 * read some of these (a quote's Preview, a project's Money and Files) and each of those keeps its own rule. The role is read once per request
 * (React's `cache`), from this browser's member (lib/db/session.ts).
 */
export const roleNow = cache(async (): Promise<string | null> => {
  const [m] = await db.select({ role: members.role }).from(members).where(eq(members.id, await sessionMemberId())).limit(1)
  return m?.role ?? null
})

/** The workspace's refusal for the signed-in member — the house gate's sentence for Marketing — else null. An action's first line answers it. */
export async function workspaceRefusal(): Promise<Refusal | null> {
  return isMarketing(await roleNow()) ? refuse(roleGate(MARKETING).help) : null
}

/** Whether the signed-in member keeps off the workspace (Marketing) — for an action whose answer is a list or a lookup: it answers nothing. */
export async function offWorkspace(): Promise<boolean> {
  return isMarketing(await roleNow())
}
