'use server'

import { revalidatePath } from 'next/cache'
import { fetchViewer } from '@/lib/leads/visibility'
import { QANVAST_ACCOUNT_REFUSAL, seesQanvastReviews } from '@/lib/qanvast-account/policy'
import { REPLY_MAX } from '@/lib/qanvast-account/model'
import { askQanvast, qanvastAccountIsStandIn } from '@/lib/qanvast-account/service'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (pending modules S41b-5 — 1.0's `deployment/qanvast` Reviews & Rankings › Respond… / Edit, `postReviewResponse` → POST
 * /user-review/Company/{companyId}/{reviewId} { revieweeResponse }) The studio's public reply to one of its Qanvast reviews — a first one or a
 * changed one (1.0 replaced it the same way; there was never a delete). An Owner's or an Admin's (S42E call E·2, lib/qanvast-account/policy.ts); every refusal
 * answers `{ error: <the rule> }`. The text travels inside one object (a long string never rides as a bare argument). Through the seam: a real
 * adapter posts it to Qanvast; the stand-in keeps it in the demo's store and the answer says it wasn't posted (`posted: false`).
 */
export async function replyToQanvastReview(input: { reviewId: string; text: string }): Promise<{ ok: true; posted: boolean } | { error: string }> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!seesQanvastReviews(viewer.role)) return { error: QANVAST_ACCOUNT_REFUSAL.reply }   // (S42E, call E·2) Owners and Admins
  const reviewId = typeof input?.reviewId === 'string' ? input.reviewId.trim() : ''
  const text = typeof input?.text === 'string' ? input.text.trim() : ''
  if (!reviewId) return { error: 'That review isn’t on Qanvast any more' }
  if (!text) return { error: 'Write a reply first' }
  if (text.length > REPLY_MAX) return { error: `A reply can be up to ${REPLY_MAX.toLocaleString('en-SG')} characters` }
  const r = await askQanvast('reply', (s) => s.reply({ reviewId, text }))
  if ('error' in r) return { error: r.error }
  if ('error' in r.ok) return { error: r.ok.error }
  revalidatePath('/qanvast-ops/reviews')
  return { ok: true, posted: !qanvastAccountIsStandIn() }
}
