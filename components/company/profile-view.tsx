'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { ReadOnlyScope } from '@/components/om/read-only'
import { ReadOnlyNote } from './read-only-note'
import { MetaChip } from '@/components/om/meta-chip'
import { CompanyShell } from './company-shell'
import { ProfileGhost } from './company-ghosts'
import { LeaveGuard } from './leave-guard'
import { useHashLanding } from './use-hash-landing'
import { saveBrand } from '@/app/company/templates-actions'
import { reasonOf, settle } from './templates/refusal'
import { couldnt } from '@/components/leads/tasks/use-run'
import { EMPTY_ENTITY, SOCIAL_LABEL, type IssuingEntity, type SocialKey, type StudioDetails } from '@/lib/templates/model'
import { readFileAsDataUrl } from '@/lib/templates/files'
import type { BrandSetting } from '@/lib/templates/brand'
import { EMAIL_RE, MSG } from '@/lib/forms'
import { isSgPhone, phoneDigits } from '@/lib/format'
import styles from './profile-view.module.css'

type TextKey = Exclude<keyof StudioDetails, 'entities' | 'tradeNotes' | 'socials' | 'preparedByMode' | 'gstRegistered'>
const DETAIL_FIELDS: { key: TextKey; label: string; wide?: boolean; helper?: string }[] = [
  { key: 'name', label: 'Company name' }, { key: 'uen', label: 'UEN / Co. Reg. No.' }, { key: 'address', label: 'Address', wide: true }, { key: 'phone', label: 'Phone' }, { key: 'fax', label: 'Fax' },
  { key: 'email', label: 'Email' }, { key: 'website', label: 'Website' }, { key: 'gstReg', label: 'GST Reg. No.' }, { key: 'licence', label: 'HDB licence' },
  /* (REG-562) The testers' tagline and social links: two fields, two template fields. */
  { key: 'tagline', label: 'Tagline', wide: true, helper: 'Prints where a template places {studio_tagline} — a cover, a footer.' },
]
/* (REG-618, parity Q-20) One field per network, as the studio wants it printed; the website is the Website field above. */
const SOCIAL_FIELDS: SocialKey[] = ['instagram', 'facebook', 'tiktok', 'whatsapp', 'linkedin']
const ENTITY_FIELDS: { key: 'bankName' | 'accountName' | 'accountNo' | 'swift' | 'payNow'; label: string }[] = [
  { key: 'bankName', label: 'Bank' }, { key: 'accountName', label: 'Account name' }, { key: 'accountNo', label: 'Account number' }, { key: 'swift', label: 'SWIFT / BIC' }, { key: 'payNow', label: 'PayNow (UEN or mobile)' },   // (REG-618, parity Q-24) SWIFT
]

/**
 * Company › Profile (REG-487 → REG-554): the company details every template prints through its fields — name, UEN,
 * address, phone, GST registration, licence, and (REG-562) a tagline and social links. **Issuing entities & bank details**
 * (REG-562, the testers' ask): the studio itself and any other company it quotes under, each with its bank, account and
 * PayNow plus a PayNow QR; the quote's Issuing Entity picks one and the template's Bank details block prints it. The brand
 * kit (logo, stamp, badges, colours, type) lives beside the templates it serves: Company › Templates › Brand kit (owner
 * 2026-09-23, "inside the template is better"). Both save the one `brand` record. (REG-707) No template preview here — it
 * belongs to the kit, which keeps its own.
 */
export function ProfileView({ brand, from, canRun = true, usage = {} }: { brand: BrandSetting; from?: string; /** (REG-646, settings parity Q-07) */ canRun?: boolean
  /** (REG-647, settings parity Q-10) How many live quotes and contracts name each entity (by its saved name) — an entity in use is retired, not removed. */
  usage?: Record<string, number> }) {
  const snackbar = useSnackbar()
  useHashLanding()   // (UX audit S3) Settings' "kept under Company › Profile" and Manage entities land on #entities
  const [details, setDetails] = useState<StudioDetails>(brand.details)
  const [saved, setSaved] = useState<StudioDetails>(brand.details)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(details) !== JSON.stringify(saved)
  const entities = details.entities.length ? details.entities : [EMPTY_ENTITY(details.name)]
  const setEntity = (i: number, patch: Partial<IssuingEntity>) => setDetails((d) => ({ ...d, entities: entities.map((e, j) => (j === i ? { ...e, ...patch } : e)) }))

  /* (REG-647) An entity keeps its id: its uses are counted under the name it was saved with. */
  const usesOf = (e: IssuingEntity) => usage[saved.entities.find((x) => x.id === e.id)?.name ?? e.name] ?? 0
  /* (sweep S4 #23 · #27) The details check as every other form does: the name is required, a phone or fax is a Singapore number (the
     +65 is allowed and the spacing is kept as typed — it prints as written), an email looks like one. Shown after the first Save, cleared live. */
  const [tried, setTried] = useState(false)
  const val = (k: TextKey) => String(details[k] ?? '').trim()
  const detailErrors: Partial<Record<TextKey, string>> = {
    name: val('name') ? undefined : MSG.required,
    phone: val('phone') && !isSgPhone(phoneDigits(val('phone'))) ? MSG.phone : undefined,
    fax: val('fax') && !isSgPhone(phoneDigits(val('fax'))) ? MSG.phone : undefined,
    email: val('email') && !EMAIL_RE.test(val('email')) ? MSG.email : undefined,
  }
  /* (UX audit S2) true when the details landed — the leave guard's Save goes on only then */
  const save = async (): Promise<boolean> => {
    if (Object.values(detailErrors).some(Boolean)) { setTried(true); document.getElementById('details')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return false }
    const names = entities.slice(1).map((e) => e.name.trim().toLowerCase())
    if (names.some((n) => !n)) { snackbar({ message: 'Give every entity a name' }); return false }
    if (new Set([details.name.trim().toLowerCase(), ...names]).size !== names.length + 1) { snackbar({ message: 'Two entities can’t share a name' }); return false }
    setBusy(true)
    try {
      const next = { ...details, entities: entities.map((e, i) => (i === 0 ? { ...e, name: details.name } : e)) }
      await settle(saveBrand({ details: next })); setDetails(next); setSaved(next); snackbar({ message: 'Company details saved' })   // (REG-646) its own half only
      return true
    }
    catch (e) { snackbar({ message: couldnt('save the company details', reasonOf(e)) }); return false }   // (wave E, E7) a refusal answers { error: the rule }
    finally { setBusy(false) }
  }
  const discard = () => setDetails(saved)
  /* (REG-618, parity Q-26) An entity's logo is kept as the picture itself, downscaled — as the brand kit keeps its logo. */
  const pickLogo = (i: number) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'
    input.onchange = async () => { const f = input.files?.[0]; if (f) { setEntity(i, { logo: await readFileAsDataUrl(f, 800) }); snackbar({ message: 'Logo added' }) } }
    input.click()
  }
  /* The PayNow QR: any picked image lands as the sample QR asset (the prototype keeps no uploads, REG-415's rule). */
  const pickQr = (i: number) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'
    input.onchange = () => { if (input.files?.length) { setEntity(i, { payNowQr: '/figma-assets/paynow-qr.svg' }); snackbar({ message: 'PayNow QR added' }) } }
    input.click()
  }

  return (
    <CompanyShell title="Profile" from={from} skeleton={<ProfileGhost />} actions={canRun ? <>
      <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={!dirty || busy}>Discard</Button>
      <Button onPress={() => { void save() }} isDisabled={!dirty || busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
    </> : null}>
      {canRun ? null : <ReadOnlyNote />}
      {/* (UX audit S2) Unsaved edits are not lost to a move inside the app — nor to a tab or a reload (checklist: discarding edits asks first). */}
      <LeaveGuard dirty={dirty && canRun} what="the company details" onSave={save} onDiscard={discard} />
      <ReadOnlyScope readOnly={!canRun}>
      <div className={styles.layout} data-testid="profile">
        <div className={styles.form}>
          <section id="details" className={styles.card} aria-labelledby="profile-details">
            <div className={styles.cardHead}><h2 id="profile-details" className={styles.cardTitle}>Company details</h2><p className={styles.cardHelp}>What the templates print through their fields — {'{studio_name}'}, {'{studio_uen}'}, {'{studio_address}'} and the rest.</p></div>
            <div className={styles.details}>
              {DETAIL_FIELDS.map((f) => (
                <div key={f.key} className={f.wide ? styles.detailWide : undefined}>
                  <TextField label={f.label} value={details[f.key]} onChange={(v) => setDetails((d) => ({ ...d, [f.key]: v }))} helper={f.helper} required={f.key === 'name'}
                             error={tried ? detailErrors[f.key] : undefined} inputMode={f.key === 'phone' || f.key === 'fax' ? 'tel' : f.key === 'email' ? 'email' : undefined} />
                </div>
              ))}
            </div>
            {/* (REG-618, parity Q-20) Social links: {studio_social} prints them in a line; the templates' Social links element prints each with its mark. */}
            <div className={styles.cardHead}><h3 className={styles.subTitle}>Social links</h3><p className={styles.cardHelp}>Handles or links, as you want them printed. {'{studio_social}'} prints the filled ones in a line; the Social links element on a template prints each with its mark.</p></div>
            <div className={styles.details} data-testid="social-links">
              {SOCIAL_FIELDS.map((k) => (
                <div key={k}><TextField label={SOCIAL_LABEL[k]} value={details.socials?.[k] ?? ''} onChange={(v) => setDetails((d) => ({ ...d, socials: { ...(d.socials ?? {}), [k]: v } }))} /></div>
              ))}
            </div>
          </section>
          {/* (REG-562) Issuing entities and where the money goes. */}
          <section id="entities" className={styles.card} aria-labelledby="profile-entities" data-testid="entities">
            <div className={styles.cardHead}><h2 id="profile-entities" className={styles.cardTitle}>Issuing entities &amp; bank details</h2><p className={styles.cardHelp}>The companies you quote under. A quote’s Issuing Entity picks one; a template’s Bank details block prints its bank, account and PayNow QR.</p></div>
            {entities.map((e, i) => (
              <div key={i} className={styles.entity} data-testid="entity">
                <div className={styles.entityHead}>
                  {i === 0 ? <span className={styles.entityName}>{details.name || 'The studio'} <span className={styles.cardHelp}>· the studio itself</span></span>
                    : <div className={styles.entityNameField}><TextField label="Entity name" value={e.name} onChange={(v) => setEntity(i, { name: v })} /></div>}
                  {i > 0 && e.retired ? <span className={styles.entityState} data-testid="entity-retired"><MetaChip>Retired</MetaChip><Button appearance="text" onPress={() => setEntity(i, { retired: false })}>Bring back</Button></span> : null}
                  {i > 0 && !e.retired && usesOf(e) > 0 ? <Tooltip label={`On ${usesOf(e)} ${usesOf(e) === 1 ? 'quote or contract' : 'quotes and contracts'} — it keeps printing there; retired, it is no longer offered`}><span><Button appearance="text" onPress={() => setEntity(i, { retired: true })}>Retire</Button></span></Tooltip> : null}
                  {i > 0 && !e.retired && usesOf(e) === 0 ? <Tooltip label="Remove this entity"><IconButton icon="delete" label="Remove this entity" size={36} variant="bare" iconSize={20} onClick={() => setDetails((d) => ({ ...d, entities: entities.filter((_, j) => j !== i) }))} /></Tooltip> : null}
                </div>
                <div className={styles.details}>
                  {ENTITY_FIELDS.map((f) => <div key={f.key}><TextField label={f.label} value={e[f.key]} onChange={(v) => setEntity(i, { [f.key]: v })} /></div>)}
                </div>
                {/* (REG-593) Dyel's four companies, one GST-registered: an entity that is not turns GST off on the quotes raised under it. The studio's own registration is Settings'. */}
                {i > 0 ? <label className={styles.switchRow}><Switch size="sm" isSelected={e.gstRegistered} onChange={(v: boolean) => setEntity(i, { gstRegistered: v })} aria-label={`${e.name || 'This entity'} is GST-registered`} /><span>GST-registered <span className={styles.cardHelp}>· off turns GST off on quotes raised under it</span></span></label> : null}
                <div className={styles.qrRow}>
                  <button type="button" className={styles.qrWell} onClick={() => pickQr(i)} aria-label={e.payNowQr ? 'Replace the PayNow QR' : 'Add a PayNow QR'}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {e.payNowQr ? <img src={e.payNowQr} alt="" /> : <span className={styles.wellEmpty}><Icon name="add_photo_alternate" size={20} weight={300} /> PayNow QR</span>}
                  </button>
                  <span className={styles.cardHelp}>{e.payNowQr ? 'Prints beside the bank details where the block shows the QR.' : 'Upload the PayNow QR your bank gives you; it prints beside the bank details.'}</span>
                  {e.payNowQr ? <Button appearance="text" variant="secondary" onPress={() => setEntity(i, { payNowQr: null })}>Remove QR</Button> : null}
                </div>
                {/* (REG-618, parity Q-26) Another entity's own letterhead: quotes raised under it print its name, logo, address and numbers. */}
                {i > 0 ? <>
                  <h3 className={styles.subTitle}>Letterhead</h3>
                  <div className={styles.details} data-testid="entity-letterhead">
                    <div className={styles.detailWide}><TextField label="Registered address" value={e.address} onChange={(v) => setEntity(i, { address: v })} helper="Left blank, the studio's address prints." /></div>
                    <div><TextField label="UEN / Co. Reg. No." value={e.uen} onChange={(v) => setEntity(i, { uen: v })} helper="Prints only this entity's own number." /></div>
                    {e.gstRegistered ? <div><TextField label="GST Reg. No." value={e.gstReg} onChange={(v) => setEntity(i, { gstReg: v })} /></div> : null}
                  </div>
                  <div className={styles.qrRow}>
                    <button type="button" className={styles.qrWell} onClick={() => pickLogo(i)} aria-label={e.logo ? `Replace ${e.name || 'this entity'}'s logo` : `Add ${e.name || 'this entity'}'s logo`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {e.logo ? <img src={e.logo} alt="" /> : <span className={styles.wellEmpty}><Icon name="add_photo_alternate" size={20} weight={300} /> Logo</span>}
                    </button>
                    <span className={styles.cardHelp}>{e.logo ? 'Prints in place of the brand logo on quotes raised under this entity.' : 'Quotes raised under this entity print its logo where a template places the brand logo; without one, the brand kit\'s logo prints.'}</span>
                    {e.logo ? <Button appearance="text" variant="secondary" onPress={() => setEntity(i, { logo: null })}>Remove logo</Button> : null}
                  </div>
                </> : null}
              </div>
            ))}
            {entities.length < 6 ? <span className={styles.markActions}><Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => setDetails((d) => ({ ...d, entities: [...entities, EMPTY_ENTITY('', crypto.randomUUID())] }))}>Add an entity</Button></span> : null}
          </section>
          {/* (REG-554) The kit lives with the templates now; this is the way there for whoever comes here for the logo. */}
          <Link href="/company/templates/brand" className={styles.kitLink} data-testid="brand-kit-link">
            <span className={styles.kitLinkIcon}><Icon name="palette" size={24} weight={300} /></span>
            <span className={styles.kitLinkText}><span className={styles.kitLinkTitle}>Brand kit</span><span className={styles.cardHelp}>Logo, stamp, badges, colours and type — under Templates, beside the templates that use them.</span></span>
            <Icon name="chevron_right" size={24} weight={300} />
          </Link>
        </div>
      </div>
      </ReadOnlyScope>
    </CompanyShell>
  )
}
