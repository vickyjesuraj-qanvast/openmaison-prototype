'use client'

import { useEffect, useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { LeaveGuard } from '@/components/company/leave-guard'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setInvoicePaper } from '@/app/projects/money-actions'
import { invoicePaperSample } from '@/app/projects/paper-actions'
import { PAPER_TERMS_MAX, PAPER_TEXT_MAX, type InvoicePaperLayout, type PaperSettings } from '@/lib/projects/invoices-paper'
import { sampleInvoice, type PaperSampleBrand } from '@/lib/projects/invoices-paper-sample'
import { InvoicePaper } from './invoice-paper'
import { AccentField } from './accent-field'
import s from '@/app/settings/settings.module.css'
import c from './invoice-paper-settings.module.css'

export type PaperEntity = { id: string; name: string }

/**
 * (gaps build B, item 14 — 1.0's Accounts › Document Templates, `7-coverage.md` A.1) Settings › Projects › Invoice paper: what an invoice, a
 * receipt and a variation order print besides their figures — a header note, a footer note, a terms block — and whether the bank details and
 * the balance due print; the studio's, and an issuing entity's own in its place. On the module's numbering-card grammar (fields, Discard ·
 * Save, the leave guard). Owners and Admins change it; the module's read-only scope shows everyone else.
 * (simplify S-15, a deliberate change) The card moved to Settings › Finance › Money in. Its neighbour, *Invoice numbers by issuing entity*
 * (gaps build B, item 12), folded into the module's one Document numbers card (each entity's prefix under Invoices, the same Save).
 * (parity map, MI-065 · FB-101 · FB-102 — 1.0's invoice-po-template-editor: the accent colour, the acceptance terms, the live preview) Three
 * more, in the same Save: an **Accent colour** (the issuing entity's, else the brand kit's, unless this paper has its own), an **acceptance
 * block** (off by default — its heading and words, then lines for the client to sign and date) and a **live preview** beside the form: the real
 * invoice paper on a sample invoice under the paper's entity, following every keystroke; narrower than the two need, a Preview button opens it
 * at full size (a sheet on a phone). The sample's studio data is read once (`invoicePaperSample`) unless the page hands it over (`sample`).
 */
export function InvoicePaperSetting({ paper, entities, canManage, sample: given }: { paper: PaperSettings; entities: PaperEntity[]; canManage: boolean
  /** (parity map, FB-102) the preview's studio data, when the page has it — else the card reads it once */ sample?: PaperSampleBrand | null }) {
  const snackbar = useSnackbar()
  const STUDIO = 'The studio’s paper'
  const options = [STUDIO, ...entities.slice(1).map((e) => `${e.name}’s own paper`)]
  const [scope, setScope] = useState(STUDIO)
  const [draft, setDraft] = useState<PaperSettings>(paper)
  const [saved, setSaved] = useState<PaperSettings>(paper)
  const [busy, setBusy] = useState(false)
  const entity = entities.slice(1).find((e) => `${e.name}’s own paper` === scope) ?? null
  const own = entity ? draft.entities[entity.id] ?? null : draft.studio
  const shown: InvoicePaperLayout = own ?? draft.studio
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = (patch: Partial<InvoicePaperLayout>) => setDraft((d) => (entity ? { ...d, entities: { ...d.entities, [entity.id]: { ...(d.entities[entity.id] ?? d.studio), ...patch } } } : { ...d, studio: { ...d.studio, ...patch } }))
  const chooseOwn = (on: boolean) => setDraft((d) => {
    if (!entity) return d
    const next = { ...d.entities }
    if (on) next[entity.id] = { ...(d.entities[entity.id] ?? d.studio) }
    else delete next[entity.id]
    return { ...d, entities: next }
  })
  const save = async (): Promise<boolean> => {
    if (!canManage) { snackbar({ message: 'Only Owners and Admins change the invoice rules' }); return false }
    setBusy(true)
    try {
      const r = await setInvoicePaper({ paper: draft })
      if ('error' in r) { snackbar({ message: couldnt('save the invoice paper', refusalOf(r.error)) }); return false }
      setDraft(r.paper); setSaved(r.paper)
      snackbar({ message: 'Saved — invoices, receipts and variation orders print it from now on' })
      return true
    } catch (e) { snackbar({ message: couldnt('save the invoice paper', refusalOf(e)) }); return false } finally { setBusy(false) }
  }

  /* (parity map, FB-102) the preview: the studio's data, read once (the answer lands in a callback, never a set in the effect's body) */
  const [loaded, setLoaded] = useState<PaperSampleBrand | null>(null)
  useEffect(() => {
    if (given) return
    let live = true
    invoicePaperSample().then((b) => { if (live && !('error' in b)) setLoaded(b) }, () => {})   // (S45C) a role's refusal leaves the sample unread
    return () => { live = false }
  }, [given])
  const brand = given ?? loaded
  const [now] = useState(() => Date.now())
  const [large, setLarge] = useState(false)
  const previewEntity = brand ? (entity ? brand.entities.find((e) => e.id === entity.id) ?? null : brand.entities[0] ?? null) : null
  const sample = brand ? sampleInvoice(brand, previewEntity, shown, now) : null
  /* (parity map, FB-101) what the accent is when the paper has none of its own: the entity's colour, else the brand kit's accent */
  const inherited = previewEntity?.accent || brand?.entities[0]?.accent || brand?.brandAccent || null
  const inheritedLabel = previewEntity?.accent ? `${previewEntity.name}’s colour` : brand?.entities[0]?.accent ? `${brand.entities[0].name}’s colour` : 'The brand’s colour'
  const paperWell = sample ? <div className={c.zoom}><InvoicePaper d={sample} /></div> : <div className={c.previewWait} aria-hidden />

  return (
    <>
      <LeaveGuard dirty={canManage && dirty} what="the invoice paper" onSave={save} onDiscard={() => setDraft(saved)} />
      <div className={s.setting} id="invoice-paper" data-testid="invoice-paper-settings">
        <div className={s.settingHead}>
          <span className={s.settingTitle}>Invoice paper</span>
          <span className={s.settingHelp}>What invoices, receipts and variation orders print besides their figures — your colour, notes and terms, and whether the bank details and the balance due show. An issuing entity can have its own.</span>
        </div>
        <div className={c.wrap}>
          <div className={c.split} data-read={canManage ? undefined : ''}>   {/* read-only (a member who may not change it): the preview stands in the card at every width */}
            <div className={c.form}>
              {entities.length > 1 ? (
                <div className={s.numGrid}>
                  <TextField label="Paper for" mode="select" value={scope} options={options} onChange={setScope} helper={entity ? `Documents raised under ${entity.name}` : 'Every document, unless its entity has its own'} />
                </div>
              ) : null}
              {entity ? (
                <label className={s.switchRow}><Switch size="sm" isSelected={!!own} isDisabled={!canManage} onChange={(v: boolean) => chooseOwn(v)} aria-label={`${entity.name} has its own paper`} />
                  <span>Its own paper <span className={s.settingHelp}>· off, it prints the studio’s</span></span></label>
              ) : null}
              {!entity || own ? (
                <>
                  {/* (parity map, MI-065 · FB-101) the accent: the title, the rule under the letterhead and the total take it */}
                  <div className={c.accentRow} data-testid="invoice-paper-accent">
                    <span className={s.reasonLabel}>Accent colour</span>
                    <Chips label="Accent colour" disabled={!canManage} testId="invoice-paper-accent-choice" value={shown.accent ? 'own' : 'inherit'}
                           options={[{ value: 'inherit', label: inheritedLabel, swatch: inherited }, { value: 'own', label: 'A colour of its own', swatch: shown.accent || null }]}
                           onChange={(v) => set({ accent: v === 'own' ? (shown.accent || inherited || '') : '' })} />
                    {shown.accent ? (
                      <div className={c.accentField}><AccentField label="Accent colour" value={shown.accent} fallback={inherited} disabled={!canManage} testId="invoice-paper-accent-field"
                                                                  onChange={(h) => set({ accent: h })} helper="The title, the rule under the letterhead and the total print in it" /></div>
                    ) : <span className={s.settingHelp}>{entity || entities.length < 2 ? 'Prints the title, the rule under the letterhead and the total in it.' : 'An issuing entity with a colour of its own (Company › Profile) prints that one.'}</span>}
                  </div>
                  <TextField label="Header note" value={shown.header} onChange={(v) => set({ header: v })} maxLength={PAPER_TEXT_MAX} multiline={2} helper="Under the title — a greeting, the scope of works" />
                  <TextField label="Terms heading" value={shown.termsTitle} onChange={(v) => set({ termsTitle: v })} maxLength={60} helper="Above the terms block — “Terms”, “Payment terms”" />
                  <TextField label="Terms" value={shown.terms} onChange={(v) => set({ terms: v })} maxLength={PAPER_TERMS_MAX} multiline={4} helper="Payment terms, exclusions, warranty — blank prints no terms block" />
                  <TextField label="Footer note" value={shown.footer} onChange={(v) => set({ footer: v })} maxLength={PAPER_TEXT_MAX} multiline={2} helper="At the paper’s end — a thank-you, who to call" />
                  <div className={s.switchGroup} role="group" aria-labelledby="invoice-paper-shows">
                    <span id="invoice-paper-shows" className={s.reasonLabel}>On the paper</span>
                    <label className={s.switchRow}><Switch size="sm" isSelected={shown.showBank} isDisabled={!canManage} onChange={(v: boolean) => set({ showBank: v })} aria-label="The bank details" /><span>The bank details <span className={s.settingHelp}>· How to pay’s bank, PayNow and its QR code</span></span></label>
                    <label className={s.switchRow}><Switch size="sm" isSelected={shown.showBalance} isDisabled={!canManage} onChange={(v: boolean) => set({ showBalance: v })} aria-label="Paid and balance due" /><span>Paid and balance due <span className={s.settingHelp}>· once something is paid; a receipt’s paid to date</span></span></label>
                    {/* (parity map, MI-065) 1.0's acceptance terms: on an invoice and a variation order, for a client who signs on paper */}
                    <label className={s.switchRow} data-testid="invoice-paper-acceptance"><Switch size="sm" isSelected={shown.acceptance} isDisabled={!canManage} onChange={(v: boolean) => set({ acceptance: v })} aria-label="An acceptance block" /><span>An acceptance block <span className={s.settingHelp}>· at the end of invoices and variation orders, with lines for the client’s name, signature and date</span></span></label>
                  </div>
                  {shown.acceptance ? <>
                    <TextField label="Acceptance heading" value={shown.acceptanceTitle} onChange={(v) => set({ acceptanceTitle: v })} maxLength={60} helper="Above the block — “Acceptance”, “Client’s acceptance”" />
                    <TextField label="Acceptance words" value={shown.acceptanceText} onChange={(v) => set({ acceptanceText: v })} maxLength={PAPER_TEXT_MAX} multiline={2} helper="What the client agrees to by signing" />
                  </> : null}
                </>
              ) : null}
              {canManage ? <div className={c.previewRow}>
                <Button variant="secondary" appearance="outlined" iconStart={<Icon name="visibility" size={20} />} onPress={() => setLarge(true)} data-testid="invoice-paper-preview-open">Preview</Button>
              </div> : null}
            </div>
            {/* (parity map, FB-102) the live preview: the real paper on a sample invoice, beside the form while the card has the room */}
            <aside className={c.preview} aria-label="Preview of a sample invoice" data-testid="invoice-paper-preview">
              <span className={c.previewLabel}>Preview · a sample invoice</span>
              <div className={c.previewPage}>{paperWell}</div>
              {canManage ? <span className={c.previewOpen}><Button appearance="text" iconStart={<Icon name="open_in_full" size={20} />} onPress={() => setLarge(true)}>Open larger</Button></span> : null}
            </aside>
          </div>
        </div>
        {canManage ? <div className={s.settingActions}>
          <Button variant="secondary" appearance="outlined" onPress={() => setDraft(saved)} isDisabled={!dirty || busy}>Discard</Button>
          <Button onPress={() => { void save() }} isDisabled={!dirty || busy} data-testid="invoice-paper-save">{busy ? 'Saving…' : 'Save the paper'}</Button>
        </div> : null}
      </div>
      <Dialog open={large} onClose={() => setLarge(false)} title="A sample invoice" subtitle={entity ? `On ${entity.name}’s paper, as it stands — unsaved changes included` : 'On the studio’s paper, as it stands — unsaved changes included'} size="modal" width={880} portal>
        <div className={c.large} data-testid="invoice-paper-preview-large">{sample ? <InvoicePaper d={sample} /> : <div className={c.previewWait} aria-hidden />}</div>
      </Dialog>
    </>
  )
}
