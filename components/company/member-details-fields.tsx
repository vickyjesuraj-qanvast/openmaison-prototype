'use client'

import { TextField } from '@/components/om/text-field'
import { EMAIL_RE, MSG } from '@/lib/forms'
import { isSgPhone, phoneDigits, phoneTyped } from '@/lib/format'
import { emailHelp, phoneHelp } from '@/lib/company/member-words'
import { landlineOnlyKey } from '@/lib/auth/model'   // (S44O — row 344)
import { MemberPhotoField, type PhotoDraft } from './member-photo-field'
import profile from './profile-view.module.css'
import members from './members-view.module.css'

/** (pending modules S01) A member's details as a form holds them — the photo as `PhotoDraft` (undefined keeps it). */
export type DetailsDraft = { name: string; email: string; phone: string; photo: PhotoDraft }
export const draftOf = (m: { name: string; email: string | null; phone: string | null }): DetailsDraft => ({ name: m.name, email: m.email ?? '', phone: m.phone ?? '', photo: undefined })
/** Whether the draft differs from what the member has. */
export const draftChanged = (d: DetailsDraft, m: { name: string; email: string | null; phone: string | null }): boolean =>
  d.photo !== undefined || d.name.trim() !== m.name || d.email.trim().toLowerCase() !== (m.email ?? '').toLowerCase() || phoneDigits(d.phone) !== (m.phone ?? '')
/** The house messages (lib/forms.ts) — Add member's words for a name, a phone and an email; shown after the first Save, cleared live. */
export const detailsErrors = (d: DetailsDraft): { name?: string; email?: string; phone?: string } => ({
  name: d.name.trim() ? undefined : MSG.required,
  phone: d.phone && !isSgPhone(phoneDigits(d.phone)) ? MSG.phone : landlineOnlyKey(d) ?? undefined,   // (S44O — row 344) their only sign-in key is a mobile
  email: d.email.trim() && !EMAIL_RE.test(d.email.trim()) ? MSG.email : undefined,
})
export const hasErrors = (e: ReturnType<typeof detailsErrors>) => !!(e.name || e.email || e.phone)

/**
 * (pending modules S01 — her "build all of them" 2026-10-11; 1.0's Settings › Your Profile) A member's photo, name, email and phone: Your profile's
 * Your details card (`layout="page"`, the Company details' two columns) and Company › Members › Edit details (`layout="dialog"`, Add member's
 * column). The fields are Add member's own — the phone grouped as typed and kept as its 8 digits, the email as their quotes print it.
 */
export function MemberDetailsFields({ member, draft, onChange, tried, own, onLeads = true, marketing = false, layout }: {
  member: { name: string; color: string; portalPhotoId?: string | null }
  draft: DetailsDraft
  onChange: (d: DetailsDraft) => void
  tried: boolean
  /** the signed-in member's own (the words say "you") */
  own: boolean
  /** a member who is on leads (not Accounting): clients see their phone */
  onLeads?: boolean
  /** (S43E W6-01) Marketing: no quotes, no papers — the email's own words */
  marketing?: boolean
  layout: 'page' | 'dialog'
}) {
  const e = tried ? detailsErrors(draft) : {}
  /* (S42 audit A-02 · A-15) the helpers' words, shared with Your profile's ghost (lib/company/member-words.ts) */
  const phoneLine = phoneHelp(own, onLeads), emailLine = emailHelp(own, onLeads, marketing)
  const fields = (
    <>
      <div className={profile.detailWide}>
        <TextField label="Name" required value={draft.name} maxLength={60} autoFocus={layout === 'dialog'} onChange={(v) => onChange({ ...draft, name: v })} error={e.name} />
      </div>
      <div><TextField label="Email" value={draft.email} maxLength={120} inputMode="email" onChange={(v) => onChange({ ...draft, email: v })} error={e.email} helper={emailLine} /></div>
      <div><TextField label="Phone" value={phoneTyped(draft.phone)} numeric="digits" maxLength={9} inputMode="tel" onChange={(v) => onChange({ ...draft, phone: phoneDigits(v) })} error={e.phone} helper={phoneLine} /></div>
    </>
  )
  return (
    <>
      <MemberPhotoField member={{ ...member, name: draft.name.trim() || member.name }} draft={draft.photo} onChange={(photo) => onChange({ ...draft, photo })} testId="member-photo-input" />
      {layout === 'page' ? <div className={profile.details} data-testid="member-details">{fields}</div> : <div className={members.addForm} data-testid="member-details">{fields}</div>}
    </>
  )
}
