import 'server-only'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, quoteComparisons, quotes } from '@/lib/db/schema'
import { DEMO_STANDING_SESSION } from '@/lib/auth/paths'
import { DEMO_KEY } from '@/lib/studios/model'
import { openStudioKey } from '@/lib/studios/registry'
import { logLeadEvent } from '@/lib/leads/events'
import { fetchBrand } from '@/lib/templates/queries'
import { compareQuotes, ENGINE } from '@/lib/xray/compare'
import { trialStore, type WorkspaceRow } from './store'
import { changeWork, forgetWorkspaceCookie, workspaceNow } from './server'
import { MAX_CLAIM_ATTEMPTS, type TrialLead, type TrialPayload, type WorkCount } from './policy'
import { orThrow } from '@/lib/company/template-rules'   // (S45C) a refused action's rule becomes the caller's "Couldn’t …"

/*
 * (pending modules S41b-3 — 1.0's src/lib/anon/claim.ts · claim-on-login.ts · registry.ts, the materialisers for leads · quote-digitizer ·
 * quote-xray) WHAT A VISITOR MADE, BROUGHT INTO THEIR STUDIO. Run once the studio is OPEN on this server and its member is signed in — sign-up
 * (S31's `startStudio`, right after `createStudio` opened the new studio) and, as 1.0 did, a sign-in ("logging into an existing account still
 * claims — it is their work and their studio") — so every record is made by the studio's OWN actions on the studio's own database, exactly as
 * if the member had made it there: a lead through `createLead`, the quote through Create Quote's `createQuoteFromUpload`, the reading as Quote
 * X-Ray keeps one, read again by the engine with the studio's name. Each gets its Activity line (`trial_claimed`).
 *
 * 1.0's rules, kept: ADDITIVE ONLY — a claim inserts and never changes or removes a studio's record (claiming into an existing studio is safe);
 * PER SURFACE — one that fails doesn't take the others down, and the workspace stays so the next sign-in tries again; the quote's three-try
 * brake (a quote that can't come over is let go, so it can't make a lead on every sign-in); the workspace and its cookie go only once
 * everything has come over. 2.0 adds one thing: each piece is struck off the workspace the moment it lands, so a try after a failure never
 * brings a piece twice (1.0 accepted duplicates).
 *
 * NEVER THE DEMO'S DATABASE: the claim refuses unless the studio it was told about is the one open — and on this prototype the demo studio is
 * the demo (DEMO_STANDING_SESSION): signing in to it keeps the visitor's work in the trial for a studio of their own. In a real build every
 * studio is a real studio and the rule is 1.0's.
 */

type Claimed = Record<string, string>
const CLAIMED = '_claimed'
type Book = TrialPayload & { [CLAIMED]?: Claimed }

/** Whether a claim may write into the studio open now. */
export function mayClaimInto(key: string): boolean {
  if (openStudioKey() !== key) return false
  return !(key === DEMO_KEY && DEMO_STANDING_SESSION)
}

/** Strike one landed piece off the workspace (compare-and-set) — the next try starts after it. */
async function strike(row: WorkspaceRow, edit: (p: Book) => Book): Promise<WorkspaceRow> {
  await changeWork(row, (p) => ({ payload: edit(p as Book), value: true }))
  return (await trialStore().get(row.id, Date.now())) ?? row
}

/**
 * Bring this browser's trial work into the studio `into` (its key on this prototype). Answers what came over, or null when there was nothing
 * (no workspace, or a studio the claim may not write into). Never throws: a claim that fails is work to try again, a sign-up that fails is
 * a person locked out (1.0's rule).
 */
export async function claimTrialWork(o: { into: string; /** the member who signed up or in — the Activity lines are theirs */ memberId: string }): Promise<WorkCount | null> {
  try {
    if (!trialStore().ready() || !mayClaimInto(o.into)) return null
    let row = await workspaceNow()
    if (!row) return null
    const got: WorkCount = { leads: 0, quote: false, reading: false }
    const { createLead } = await import('@/app/leads/actions')
    const claimed = (): Claimed => ({ ...((row!.payload as Book)[CLAIMED] ?? {}) })
    const ok: Record<string, boolean> = {}

    /* ── leads, one at a time (the studio's own createLead), each struck off as it lands ── */
    ok.leads = true
    for (const l of [...(row.payload.leads?.leads ?? [])] as TrialLead[]) {
      try {
        const id = await createLead({ ...l.data, assignees: [] })
        await logLeadEvent(db, id, 'trial_claimed', { kind: 'lead', when: new Date(l.at).toISOString() }, o.memberId)
        row = await strike(row, (p) => ({ ...p, leads: { leads: (p.leads?.leads ?? []).filter((x) => x.id !== l.id) }, [CLAIMED]: { ...(p[CLAIMED] ?? {}), [l.id]: id } }))
        got.leads++
      } catch (e) { ok.leads = false; console.error('[trial/claim] a lead didn’t come over — kept for the next sign-in', e instanceof Error ? e.message : e) }
    }

    /* ── the kept quote: on its client — the trial lead it was kept on, come over above (a quote is always a lead's, and 2.0 makes no lead
       without the client's number, so 1.0's nameless "Digitized quote" lead is not made) — through Create Quote's own upload ── */
    const doc = row.payload['quote-digitizer']?.documents?.[0]
    if (doc) {
      const attempts = row.payload['quote-digitizer']?.claimAttempts ?? 0
      if (attempts >= MAX_CLAIM_ATTEMPTS) {
        console.error('[trial/claim] the quote failed to come over three times — let go (1.0’s brake)', row.payload['quote-digitizer']?.claimLastError)
        row = await strike(row, (p) => { const n = { ...p }; delete n['quote-digitizer']; return n })
      } else {
        try {
          const leadId = doc.leadId ? claimed()[doc.leadId] ?? null : null
          if (!leadId) throw new Error(doc.leadId ? 'its client didn’t come over' : 'it was kept with no client')
          const { createQuoteFromUpload } = await import('@/app/leads/quotes-actions')
          const q = await orThrow(createQuoteFromUpload(leadId, null, doc.groups))
          const [n] = await db.select({ number: quotes.number }).from(quotes).where(eq(quotes.id, q.id))
          await logLeadEvent(db, leadId, 'trial_claimed', { kind: 'quote', id: q.id, title: n?.number ?? '', name: doc.file, n: doc.count }, o.memberId)
          row = await strike(row, (p) => { const n2 = { ...p, [CLAIMED]: { ...(p[CLAIMED] ?? {}), [doc.id]: q.id } }; delete n2['quote-digitizer']; return n2 })
          got.quote = true
        } catch (e) {
          ok.quote = false
          const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300)
          console.error('[trial/claim] the quote didn’t come over — kept for the next sign-in', msg)
          row = await strike(row, (p) => (p['quote-digitizer'] ? { ...p, 'quote-digitizer': { ...p['quote-digitizer'], claimAttempts: attempts + 1, claimLastError: msg } } : p))
        }
      }
    }

    /* ── the Quote X-Ray reading: kept as the studio keeps one, read again with the studio's name; on its lead when it had one ── */
    const x = row.payload['quote-xray']?.xrays?.[0]
    if (x) {
      try {
        const leadId = x.leadId ? claimed()[x.leadId] ?? null : null
        const brand = await fetchBrand()
        const [lead] = leadId ? await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)) : []
        const leadName = lead?.name ?? null
        const yourLabel = x.yourFile.replace(/\.[a-z0-9]+$/i, '')
        const result = compareQuotes(x.yours, { key: 'sheet', studio: x.otherStudio, lines: x.theirs }, { yourLabel, yourStudio: brand.details.name, clientName: leadName })
        const id = randomUUID()
        await db.insert(quoteComparisons).values({ id, leadId, quoteId: null, yourLabel, otherStudio: x.otherStudio, otherFile: x.otherFile, resultJson: JSON.stringify(result),
          createdBy: o.memberId, createdAt: new Date(), inputsJson: JSON.stringify({ yours: x.yours, theirs: x.theirs }), engine: ENGINE, yourFile: x.yourFile })
        if (leadId) await logLeadEvent(db, leadId, 'trial_claimed', { kind: 'reading', id, title: `${yourLabel} · vs ${x.otherStudio}` }, o.memberId)
        row = await strike(row, (p) => { const n = { ...p, [CLAIMED]: { ...(p[CLAIMED] ?? {}), [x.id]: id } }; delete n['quote-xray']; return n })
        got.reading = true
      } catch (e) { ok.reading = false; console.error('[trial/claim] the reading didn’t come over — kept for the next sign-in', e instanceof Error ? e.message : e) }
    }

    /* everything over: the workspace and its cookie go (1.0: only after a full claim) */
    const left = row.payload
    const empty = !(left.leads?.leads?.length) && !left['quote-digitizer']?.documents?.length && !left['quote-xray']?.xrays?.length
    if (empty && Object.values(ok).every((v) => v !== false)) {
      await trialStore().remove(row.id)
      await forgetWorkspaceCookie()
    }
    return got.leads || got.quote || got.reading ? got : null
  } catch (e) {
    console.error('[trial/claim] the claim stopped — the workspace is kept for the next sign-in', e instanceof Error ? e.message : e)
    return null
  }
}
