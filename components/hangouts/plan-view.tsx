'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Avatar } from '@/components/om/avatar'
import { Chips } from '@/components/om/chips'
import { TextField } from '@/components/om/text-field'
import { Dialog } from '@/components/om/dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { Card } from '@/components/leads/detail/card'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { LeaveGuard } from '@/components/company/leave-guard'
import { inviteForHangout, sendHangoutPlan, setDesignerShares, setHangoutPreferences, setShiftDesigner } from '@/app/qanvast-ops/hangouts/actions'
import { BUDGET_BANDS, DIMENSIONS, HOME_KINDS, HOME_STATUSES, KEY_TIMES, AREAS, STYLES, evenSplit, keyLabel, weightTotal, type StudioPrefs, type Weights } from '@/lib/hangouts/model'
import { isSgPhone, phoneDigits, phoneTyped } from '@/lib/format'
import { MSG } from '@/lib/forms'
import { withFrom } from '@/lib/nav'
import { useHere } from '@/components/om/use-here'
import type { HangoutView, PlanDesigner, TeamPick } from '@/lib/hangouts/queries'
import { factLines, planOf, planPeople, planSentLine, shiftLabel, tablesValue, whoGoesHelp } from './plan-words'
import styles from './hangouts.module.css'

const ANY = '__any'

/**
 * (pending modules S27) A Hangout's Plan — 1.0's OwnerPlanTab: who sits at the studio's tables on each shift (1.0's ID-per-shift grid, here each
 * person's shifts as chips, up to one a table), their share of the chats (1.0's capacity sliders, as percents), who the studio would like to meet
 * and how much each thing weighs (1.0's preferred customer profile and its weights), and the plan sent to Qanvast (1.0's Save & Submit). A tick
 * saves at once; the shares and the preferences are saved together with their own Save. Owners and Admins change it; everyone reads it.
 * *(invented copy: every title, help line and message)*
 */
export function PlanView({ data }: { data: HangoutView }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const here = useHere(`/qanvast-ops/hangouts/${data.event.id}`)
  const p = data.participation
  const taking = p?.status === 'confirmed'
  const ended = data.event.phase === 'ended'
  const may = data.viewer.runs && taking && !ended

  /* ── who goes: a tick saves at once, put back when the server refuses ── */
  const [plan, setPlan] = useState<Record<string, string[]>>(() => planOf(data))
  const [seenPlan, setSeenPlan] = useState(data.designers)
  if (seenPlan !== data.designers) { setSeenPlan(data.designers); setPlan(planOf(data)) }
  const today = (() => { const d = new Date(data.now); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() })()
  const onShift = (shiftId: string) => Object.values(plan).filter((s) => s.includes(shiftId)).length
  const tick = async (m: TeamPick, next: string[]) => {
    const was = plan[m.id] ?? []
    const added = next.find((s) => !was.includes(s)), removed = was.find((s) => !next.includes(s))
    const shiftId = added ?? removed
    if (!shiftId) return
    setPlan((cur) => ({ ...cur, [m.id]: next }))
    try {
      const r = await setShiftDesigner(data.event.id, { memberId: m.id, shiftId, on: !!added })
      if ('error' in r) { setPlan((cur) => ({ ...cur, [m.id]: was })); snackbar({ message: couldnt(added ? `put ${m.name} on the shift` : `take ${m.name} off the shift`, refusalOf(r.error)) }); return }
      setPlan((cur) => ({ ...cur, [m.id]: r.shiftIds }))
      router.refresh()
    } catch { setPlan((cur) => ({ ...cur, [m.id]: was })); snackbar({ message: couldnt('change the plan') }) }
  }
  const people = planPeople(data, plan)
  const designerOf = (id: string): PlanDesigner | undefined => data.designers.find((d) => d.memberId === id)
  const onPlan = data.team.filter((m) => (plan[m.id] ?? []).length > 0)

  /* ── shares and preferences: one form, saved together ── */
  const shareSeed = () => Object.fromEntries(onPlan.map((m) => [m.id, designerOf(m.id)?.sharePct ?? null])) as Record<string, number | null>
  const [shares, setShares] = useState<Record<string, number | null>>(shareSeed)
  const [prefs, setPrefs] = useState<StudioPrefs>(data.prefs)
  const [seen, setSeen] = useState(data)
  if (seen !== data) { setSeen(data); setShares(shareSeed()); setPrefs(data.prefs) }
  const anyShare = Object.values(shares).some((v) => v !== null)
  const shareTotal = Object.values(shares).reduce<number>((a, b) => a + (b ?? 0), 0)
  const sharesDirty = onPlan.some((m) => (shares[m.id] ?? null) !== (designerOf(m.id)?.sharePct ?? null))
  const prefsDirty = JSON.stringify(prefs) !== JSON.stringify(data.prefs)
  const dirty = sharesDirty || prefsDirty
  const wTotal = weightTotal(prefs.weights)
  const [saving, setSaving] = useState(false)
  const save = async (): Promise<boolean> => {
    if (anyShare && shareTotal !== 100) { snackbar({ message: couldnt('save the plan', 'The shares add up to 100%') }); return false }
    if (wTotal !== 100) { snackbar({ message: couldnt('save the plan', 'The weights add up to 100%') }); return false }
    setSaving(true)
    try {
      if (sharesDirty) {
        const r = await setDesignerShares(data.event.id, anyShare ? Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, v ?? 0])) : null)
        if ('error' in r) { snackbar({ message: couldnt('save the shares', refusalOf(r.error)) }); return false }
      }
      if (prefsDirty) {
        const r = await setHangoutPreferences(data.event.id, prefs)
        if ('error' in r) { snackbar({ message: couldnt('save who you’d like to meet', refusalOf(r.error)) }); return false }
      }
      snackbar({ message: 'Plan saved' })
      router.refresh()
      return true
    } catch { snackbar({ message: couldnt('save the plan') }); return false } finally { setSaving(false) }
  }
  const discard = () => { setShares(shareSeed()); setPrefs(data.prefs) }

  /* ── sent to Qanvast ── */
  const changedSince = !!p?.planSentAt && !!p.planSavedAt && p.planSavedAt > p.planSentAt
  const [sending, setSending] = useState(false)
  const send = async () => {
    if (dirty && !(await save())) return
    setSending(true)
    try {
      const r = await sendHangoutPlan(data.event.id)
      if ('error' in r) { snackbar({ message: couldnt('send the plan', refusalOf(r.error)) }); return }
      snackbar({ message: 'Plan sent to Qanvast' })
      router.refresh()
    } catch { snackbar({ message: couldnt('send the plan') }) } finally { setSending(false) }
  }

  /* ── invite someone new for this Hangout (S09's invitation, `hangout_event_id`) ── */
  const [inviting, setInviting] = useState<{ name: string; phone: string; email: string; tried: boolean } | null>(null)
  const [inviteBusy, setInviteBusy] = useState(false)
  const inviteErrors = inviting ? { name: inviting.name.trim() ? undefined : MSG.required, phone: inviting.phone && !isSgPhone(phoneDigits(inviting.phone)) ? MSG.phone : undefined, email: inviting.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviting.email.trim()) ? MSG.email : undefined } : {}
  const invite = async () => {
    if (!inviting || inviteBusy) return
    if (inviteErrors.name || inviteErrors.phone || inviteErrors.email) { setInviting({ ...inviting, tried: true }); return }
    setInviteBusy(true)
    try {
      const r = await inviteForHangout(data.event.id, { name: inviting.name, phone: inviting.phone, email: inviting.email })
      if ('error' in r) { snackbar({ message: couldnt('invite them', refusalOf(r.error)) }); return }
      setInviting(null)
      snackbar({ message: `${inviting.name.trim()} is on the team${r.invited?.length ? ' — invitation sent' : ''}. Put them on a shift below.` })
      router.refresh()
    } catch { snackbar({ message: couldnt('invite them') }) } finally { setInviteBusy(false) }
  }

  return (
    <>
      <LeaveGuard dirty={dirty} what="the plan" onSave={save} onDiscard={discard} />
      <Card title="About this Hangout" testId="hangout-facts">
        <div className={styles.cardBody}>
          <dl className={styles.facts}>
            <div className={styles.fact}><dt className={styles.factLabel}>Dates</dt><dd className={styles.factValue}>{data.event.daysLine}</dd></div>
            <div className={styles.fact}><dt className={styles.factLabel}>Hours</dt><dd className={styles.factValue}>{data.event.hoursLine}</dd></div>
            <div className={styles.fact}><dt className={styles.factLabel}>Venue</dt><dd className={styles.factValue}>
              <a className={styles.factLink} href={data.event.mapsHref} target="_blank" rel="noopener noreferrer">{data.event.venue}<span className={styles.factGlyph}><Icon name="open_in_new" size={16} /></span></a>
            </dd></div>
            <div className={styles.fact}><dt className={styles.factLabel}>{taking ? 'Your tables' : 'Your cost'}</dt><dd className={styles.factValue} data-testid="hangout-tables">{tablesValue(data)}</dd></div>
          </dl>
          {factLines(data).map((l) => <p key={l.muted} className={styles.line}><span className={styles.muted}>{l.muted}</span>{l.text}</p>)}
        </div>
      </Card>

      {taking ? (
        <>
          <div className={styles.headLine} data-testid="hangout-plan-head">
            <div className={styles.headText}>
              <h2 className={styles.headTitle}>The plan</h2>
              <p className={styles.help} data-testid="hangout-plan-sent">{planSentLine(data)}</p>
            </div>
            {may && (!p?.planSentAt || changedSince || dirty) ? <Button onPress={() => { void send() }} isDisabled={sending || saving} data-testid="hangout-send">{sending ? 'Sending…' : 'Send the plan to Qanvast'}</Button> : null}
          </div>

          <Card title="Who goes" metaRight={`${onPlan.length} on the plan`} testId="hangout-who">
            <div className={styles.cardBody}>
              <p className={styles.help}>{whoGoesHelp(data)}</p>
              <div className={styles.people} data-testid="hangout-people">
                {people.map((m) => {
                  const mine = plan[m.id] ?? []
                  const d = designerOf(m.id)
                  const invited = data.invited.some((i) => i.memberId === m.id)
                  const options = data.shifts.map((s) => ({ value: s.id, label: shiftLabel(data, s), disabled: !mine.includes(s.id) && (onShift(s.id) >= data.event.tablesPerStudio || s.dayAt < today) }))
                  return (
                    <div key={m.id} className={styles.person} data-testid="hangout-person" data-member={m.id} data-on={mine.length > 0 || undefined}>
                      <span className={styles.who}>
                        <Avatar name={m.name} color={m.color} size={36} tooltip={false} />
                        <span className={styles.whoText}>
                          <span className={styles.whoName}>{m.name}</span>
                          <span className={styles.whoLine}>
                            {invited ? 'Invited — hasn’t joined yet' : m.role}
                            {d?.cardEmpty && mine.length ? <> · <Link className={styles.whoLink} href={withFrom(`/company/members/${m.id}/profile`, here)}>Their public card is empty</Link></> : null}
                            {d?.onBreak ? ' · On a break' : null}
                          </span>
                        </span>
                      </span>
                      <Chips multiple label={`${m.name}’s shifts`} className={styles.shiftChips} disabled={!may} options={options} value={mine} onChange={(next) => { void tick(m, next) }} testId="hangout-shifts" />
                    </div>
                  )
                })}
              </div>
              {may ? <span><Button appearance="text" iconStart={<Icon name="person_add" size={20} />} onPress={() => setInviting({ name: '', phone: '', email: '', tried: false })} data-testid="hangout-invite">Invite someone new</Button></span> : null}
            </div>
          </Card>

          {onPlan.length > 1 ? (
            <Card title="Share of the chats" metaRight={anyShare ? `${shareTotal}%` : 'Even'} testId="hangout-shares">
              <div className={styles.cardBody}>
                <p className={styles.help}>{`The part of the ${data.event.promisedMeetings} promised chats each person takes. With no shares set, they share them evenly; new bookings go to whoever is furthest below their share.`}</p>
                <div className={styles.shares}>
                  {onPlan.map((m) => (
                    <TextField key={m.id} label={m.name} numeric="digits" maxLength={3} disabled={!may} trailing={<span className={styles.muted}>%</span>}
                               value={shares[m.id] === null || shares[m.id] === undefined ? '' : String(shares[m.id])}
                               onChange={(v) => setShares((cur) => ({ ...cur, [m.id]: v === '' ? null : Math.min(100, Number(v)) }))} />
                  ))}
                </div>
                <p className={styles.total} data-off={anyShare && shareTotal !== 100 ? '' : undefined} data-testid="hangout-share-total">{anyShare ? `Together ${shareTotal}%${shareTotal !== 100 ? ' — they add up to 100%' : ''}` : 'An even share each'}</p>
                {may ? <span><Button appearance="text" onPress={() => setShares(Object.fromEntries(Object.entries(evenSplit(onPlan.map((m) => m.id)))))}>Share evenly</Button></span> : null}
              </div>
            </Card>
          ) : null}

          <Card title="Who you’d like to meet" testId="hangout-prefs">
            <div className={styles.cardBody}>
              <p className={styles.help}>Qanvast matches on it, and your page scores each booking against it — a fit out of 100. It guides the matching; it never turns anyone away.</p>
              <div className={styles.dims}>
                <Dim label="Kind of home"><Chips multiple label="Kind of home" disabled={!may} options={[...HOME_KINDS]} value={prefs.propertyType} onChange={(v) => setPrefs({ ...prefs, propertyType: v })} testId="pref-kind" /></Dim>
                <Dim label="New, resale or renovated"><Chips multiple label="New, resale or renovated" disabled={!may} options={[...HOME_STATUSES]} value={prefs.propertyStatus} onChange={(v) => setPrefs({ ...prefs, propertyStatus: v })} /></Dim>
                <Dim label="Budget"><Chips multiple label="Budget" disabled={!may} options={BUDGET_BANDS.map((b) => ({ value: b.key, label: b.label }))} value={prefs.budgetRange} onChange={(v) => setPrefs({ ...prefs, budgetRange: v })} testId="pref-budget" /></Dim>
                <Dim label="Key collection"><Chips label="Key collection" disabled={!may} options={[{ value: ANY, label: 'Any time' }, ...KEY_TIMES.map((k) => ({ value: k, label: keyLabel(k) }))]} value={prefs.keyCollection ?? ANY} onChange={(v) => setPrefs({ ...prefs, keyCollection: v === ANY ? null : v })} /></Dim>
                <Dim label="Area"><Chips multiple label="Area" disabled={!may} options={[...AREAS]} value={prefs.region} onChange={(v) => setPrefs({ ...prefs, region: v })} /></Dim>
                <Dim label="Style"><Chips multiple label="Style" disabled={!may} options={[...STYLES]} value={prefs.designStyle} onChange={(v) => setPrefs({ ...prefs, designStyle: v })} /></Dim>
              </div>
              <hr className={styles.cardRule} />
              <div className={styles.headText}>
                <h3 className={styles.dimLabel}>What matters most</h3>
                <p className={styles.help}>How much each one weighs in the fit — together 100%. Budget first, as Qanvast suggests.</p>
              </div>
              <div className={styles.shares}>
                {DIMENSIONS.map((d) => (
                  <TextField key={d.key} label={d.label} numeric="digits" maxLength={3} disabled={!may} trailing={<span className={styles.muted}>%</span>}
                             value={String(prefs.weights[d.key])} onChange={(v) => setPrefs({ ...prefs, weights: { ...prefs.weights, [d.key]: Math.min(100, Number(v || 0)) } as Weights })} />
                ))}
              </div>
              <p className={styles.total} data-off={wTotal !== 100 ? '' : undefined} data-testid="hangout-weight-total">{`Together ${wTotal}%${wTotal !== 100 ? ' — they add up to 100%' : ''}`}</p>
              {may ? <span><Button appearance="text" onPress={() => setPrefs({ ...prefs, weights: evenSplit(DIMENSIONS.map((d) => d.key)) as Weights })}>Weigh them evenly</Button></span> : null}
            </div>
          </Card>
          {may && dirty ? (
            <div className={styles.foot} data-testid="hangout-plan-foot">
              <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={saving}>Discard</Button>
              <Button variant="secondary" appearance="outlined" onPress={() => { void save() }} isDisabled={saving} data-testid="hangout-plan-save">{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          ) : null}
        </>
      ) : null}

      <Dialog open={!!inviting} onClose={() => setInviting(null)} title="Invite someone new" subtitle="They join the studio as a Designer and get an invitation — you put them on a shift here." size="form" width={600} closeOnScrim={false}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setInviting(null)}>Cancel</Button><Button onPress={() => { void invite() }} isDisabled={inviteBusy} data-testid="hangout-invite-send">{inviteBusy ? 'Inviting…' : 'Invite'}</Button></>}>
        {inviting ? (
          <div className={styles.dims}>
            <TextField label="Name" required value={inviting.name} maxLength={60} autoFocus onChange={(v) => setInviting({ ...inviting, name: v })} error={inviting.tried ? inviteErrors.name : undefined} />
            <TextField label="Mobile" value={phoneTyped(inviting.phone)} numeric="digits" maxLength={9} inputMode="tel" onChange={(v) => setInviting({ ...inviting, phone: phoneDigits(v) })} error={inviting.tried ? inviteErrors.phone : undefined} helper="The invitation goes by WhatsApp to it" />
            <TextField label="Email" value={inviting.email} maxLength={120} type="email" onChange={(v) => setInviting({ ...inviting, email: v })} error={inviting.tried ? inviteErrors.email : undefined} />
          </div>
        ) : null}
      </Dialog>
    </>
  )
}

function Dim({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className={styles.dim}><span className={styles.dimLabel}>{label}</span>{children}</div>
}
