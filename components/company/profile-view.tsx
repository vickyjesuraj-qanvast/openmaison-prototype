'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { CompanyShell } from './company-shell'
import { TemplateThumb } from '@/components/templates/render/document'
import { saveBrand } from '@/app/company/templates-actions'
import { EMPTY_ENTITY, type IssuingEntity, type StudioDetails, type TemplateDesign } from '@/lib/templates/model'
import type { BrandSetting } from '@/lib/templates/brand'
import type { DocData } from '@/lib/templates/data'
import styles from './profile-view.module.css'

type TextKey = Exclude<keyof StudioDetails, 'entities'>
const DETAIL_FIELDS: { key: TextKey; label: string; wide?: boolean; helper?: string }[] = [
  { key: 'name', label: 'Company name' }, { key: 'uen', label: 'UEN / Co. Reg. No.' }, { key: 'address', label: 'Address', wide: true }, { key: 'phone', label: 'Phone' }, { key: 'fax', label: 'Fax' },
  { key: 'email', label: 'Email' }, { key: 'website', label: 'Website' }, { key: 'gstReg', label: 'GST Reg. No.' }, { key: 'licence', label: 'HDB licence' },
  /* (REG-562) The testers' tagline and social links: two fields, two template fields. */
  { key: 'tagline', label: 'Tagline', wide: true, helper: 'Prints where a template places {studio_tagline} — a cover, a footer.' },
  { key: 'social', label: 'Social links', wide: true, helper: 'Handles or links, as you want them printed — {studio_social}.' },
]
const ENTITY_FIELDS: { key: Exclude<keyof IssuingEntity, 'payNowQr' | 'name' | 'gstRegistered'>; label: string }[] = [
  { key: 'bankName', label: 'Bank' }, { key: 'accountName', label: 'Account name' }, { key: 'accountNo', label: 'Account number' }, { key: 'payNow', label: 'PayNow (UEN or mobile)' },
]

/**
 * Company › Profile (REG-487 → REG-554): the company details every template prints through its fields — name, UEN,
 * address, phone, GST registration, licence, and (REG-562) a tagline and social links. **Issuing entities & bank details**
 * (REG-562, the testers' ask): the studio itself and any other company it quotes under, each with its bank, account and
 * PayNow plus a PayNow QR; the quote's Issuing Entity picks one and the template's Bank details block prints it. The brand
 * kit (logo, stamp, badges, colours, type) lives beside the templates it serves: Company › Templates › Brand kit (owner
 * 2026-09-23, "inside the template is better"). Both save the one `brand` record; the default template's first page on the
 * right redraws as you edit.
 */
export function ProfileView({ brand, previewDesign, previewName, sample }: { brand: BrandSetting; previewDesign: TemplateDesign | null; previewName: string | null; sample: DocData }) {
  const snackbar = useSnackbar()
  const [details, setDetails] = useState<StudioDetails>(brand.details)
  const [saved, setSaved] = useState<StudioDetails>(brand.details)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(details) !== JSON.stringify(saved)
  const entities = details.entities.length ? details.entities : [EMPTY_ENTITY(details.name)]
  const setEntity = (i: number, patch: Partial<IssuingEntity>) => setDetails((d) => ({ ...d, entities: entities.map((e, j) => (j === i ? { ...e, ...patch } : e)) }))

  const save = async () => {
    setBusy(true)
    try {
      const next = { ...details, entities: entities.map((e, i) => (i === 0 ? { ...e, name: details.name } : e)) }
      await saveBrand({ kit: brand.kit, details: next }); setDetails(next); setSaved(next); snackbar({ message: 'Company details saved' })
    }
    catch { snackbar({ message: 'Couldn’t save the company details — please try again' }) }
    finally { setBusy(false) }
  }
  const discard = () => setDetails(saved)
  /* Unsaved edits are not lost to a tab or a reload without a word (checklist: discarding edits asks first). */
  useEffect(() => {
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])
  /* The PayNow QR: any picked image lands as the sample QR asset (the prototype keeps no uploads, REG-415's rule). */
  const pickQr = (i: number) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'
    input.onchange = () => { if (input.files?.length) { setEntity(i, { payNowQr: '/figma-assets/paynow-qr.svg' }); snackbar({ message: 'PayNow QR added' }) } }
    input.click()
  }

  return (
    <CompanyShell title="Profile" actions={<>
      <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={!dirty || busy}>Discard</Button>
      <Button onPress={() => { void save() }} isDisabled={!dirty || busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
    </>}>
      <div className={styles.layout} data-testid="profile">
        <div className={styles.form}>
          <section id="details" className={styles.card} aria-labelledby="profile-details">
            <div className={styles.cardHead}><h2 id="profile-details" className={styles.cardTitle}>Company details</h2><p className={styles.cardHelp}>What the templates print through their fields — {'{studio_name}'}, {'{studio_uen}'}, {'{studio_address}'} and the rest.</p></div>
            <div className={styles.details}>
              {DETAIL_FIELDS.map((f) => (
                <div key={f.key} className={f.wide ? styles.detailWide : undefined}>
                  <TextField label={f.label} value={details[f.key]} onChange={(v) => setDetails((d) => ({ ...d, [f.key]: v }))} helper={f.helper} />
                </div>
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
                  {i > 0 ? <Tooltip label="Remove this entity"><IconButton icon="delete" label="Remove this entity" size={36} variant="bare" iconSize={20} onClick={() => setDetails((d) => ({ ...d, entities: entities.filter((_, j) => j !== i) }))} /></Tooltip> : null}
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
              </div>
            ))}
            {entities.length < 6 ? <span className={styles.markActions}><Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => setDetails((d) => ({ ...d, entities: [...entities, EMPTY_ENTITY('')] }))}>Add an entity</Button></span> : null}
          </section>
          {/* (REG-554) The kit lives with the templates now; this is the way there for whoever comes here for the logo. */}
          <Link href="/company/templates/brand" className={styles.kitLink} data-testid="brand-kit-link">
            <span className={styles.kitLinkIcon}><Icon name="palette" size={24} weight={300} /></span>
            <span className={styles.kitLinkText}><span className={styles.kitLinkTitle}>Brand kit</span><span className={styles.cardHelp}>Logo, stamp, badges, colours and type — under Templates, beside the templates that use them.</span></span>
            <Icon name="chevron_right" size={24} weight={300} />
          </Link>
        </div>
        <aside className={styles.preview} aria-label="Preview">
          <span className={styles.previewLabel}>{previewName ? `Default template · ${previewName}` : 'Sample quote'}</span>
          <div className={styles.previewPage}>
            {previewDesign ? <TemplateThumb design={previewDesign} brand={brand.kit} data={{ ...sample, studio: details }} width={276} /> : <span className={styles.cardHelp}>Publish a template to see it here.</span>}
          </div>
          <Tooltip label="The first page of the studio's default template, drawn with these details as you edit them">
            <span className={styles.previewHint}><Icon name="info" size={16} weight={300} /> Redraws as you edit</span>
          </Tooltip>
        </aside>
      </div>
    </CompanyShell>
  )
}
