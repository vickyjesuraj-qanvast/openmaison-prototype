'use client'

import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { CompanyShell, templateTabs } from '../company-shell'
import { BrandKitGhost } from '@/components/company/company-ghosts'
import { TemplateThumb } from '@/components/templates/render/document'
import { TemplatePreviewPages } from '@/components/templates/template-preview-dialog'
import { Dialog } from '@/components/om/dialog'
import { saveBrand } from '@/app/company/templates-actions'
import { reasonOf, settle } from './refusal'
import { couldnt } from '@/components/leads/tasks/use-run'
import { COLOR_KEYS, COLOR_LABEL, FONT_ROLES, FONT_ROLE_LABEL, fontOptions, fontStack, type BrandKit, type BrandOverrides, type ColorKey, type FontFace, type FontRole, type TemplateDesign } from '@/lib/templates/model'
import type { StudioFontsData } from '@/lib/company/studio-fonts'
import { StudioFontFaces } from '@/components/templates/render/studio-font-faces'
import { OwnFonts } from './brand-fonts'
import Link from 'next/link'
import { withFrom } from '@/lib/nav'
import type { BrandSetting } from '@/lib/templates/brand'
import { DEMO_BADGES, stampSvg } from '@/lib/templates/assets'
import type { DocData } from '@/lib/templates/data'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { hexOf, hexTyped } from '@/lib/format'
import styles from '../profile-view.module.css'
import { ReadOnlyScope } from '@/components/om/read-only'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { LeaveGuard } from '@/components/company/leave-guard'

const WEIGHTS: { label: string; value: 400 | 600 | 700 }[] = [{ label: 'Regular', value: 400 }, { label: 'Semibold', value: 600 }, { label: 'Bold', value: 700 }]

const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
/**
 * (Dane UAT · Figma 1517:11, keeps REG-554) What the previewed template sets for itself, so the kit's edits to it don't show on that page —
 * a template's brand is an override drawn over the kit (REG-487, `mergeBrand`). Names only what it overrides: its logo, which colours
 * (all six = "its own colours"), which type roles (all four = "its own fonts"). Null when it follows the kit throughout.
 */
function ownBrandNote(name: string, o: BrandOverrides | undefined): string | null {
  if (!o) return null
  const colours = COLOR_KEYS.filter((k) => o.colors?.[k] !== undefined)
  const fonts = FONT_ROLES.filter((r) => Object.keys(o.fonts?.[r] ?? {}).length > 0)
  const parts = [
    o.logo !== undefined ? 'its own logo' : '',
    colours.length === COLOR_KEYS.length ? 'its own colours' : colours.length ? `its own ${listOf(colours.map((k) => COLOR_LABEL[k]))} ${colours.length === 1 ? 'colour' : 'colours'}` : '',
    fonts.length === FONT_ROLES.length ? 'its own fonts' : fonts.length ? `its own ${listOf(fonts.map((r) => FONT_ROLE_LABEL[r]))} ${fonts.length === 1 ? 'font' : 'fonts'}` : '',
  ].filter(Boolean)
  if (!parts.length) return null
  /* (the calm UI build 2026-10-27, the UI audit's 4-35) the preview draws the template in the kit now — its own settings cleared for the preview —
     so the note no longer admits a preview that doesn't move; it says, once and quietly, what the template keeps when it prints */
  return `When it prints, ${name} keeps ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}` : parts[0]}.`
}

/**
 * Company › Templates › Brand kit (REG-487 → REG-554, owner 2026-09-23: "inside the template is better"): the kit every
 * template starts from — logo, stamp, accreditation badges, the six named colours, the four type roles — as the first tab
 * of Templates, beside the kinds that inherit it. The company details it prints stay under Company › Profile. Saved as
 * one record with them (`settings` key `brand`); the default template's first page on the right redraws as you edit.
 */
export function BrandKitView({ brand, previewDesign, previewName, sample, from, canRun = true, ownFonts = { fonts: [], uses: {} } }: { brand: BrandSetting; previewDesign: TemplateDesign | null; previewName: string | null; sample: DocData; from?: string; /** (REG-646, settings parity Q-07) */ canRun?: boolean; /** (pending modules S11) the studio's uploaded fonts */ ownFonts?: StudioFontsData }) {
  const snackbar = useSnackbar()
  const [kit, setKit] = useState<BrandKit>(brand.kit)
  const [saved, setSaved] = useState<BrandKit>(brand.kit)
  /* (pending modules S11) the studio's own fonts: kept apart from the kit's draft (they save on upload, not with Save changes) and laid over it
     wherever the page draws type — the role boxes' lists, the samples, the preview */
  const [faces, setFaces] = useState<FontFace[]>(brand.kit.faces ?? [])
  const shownKit = useMemo<BrandKit>(() => ({ ...kit, faces }), [kit, faces])
  const [busy, setBusy] = useState(false)
  const details = brand.details
  const logoInput = useRef<HTMLInputElement>(null)
  const stampInput = useRef<HTMLInputElement>(null)
  const badgeInput = useRef<HTMLInputElement>(null)

  /* (UX audit S2) true when the kit landed — the leave guard's Save goes on only then */
  const save = async (): Promise<boolean> => {
    /* (F121) a colour box still holding a half-typed value says so rather than saving the colour it had before */
    const bad = Object.keys(colorDraft).filter((k) => !hexOf(colorDraft[k]!))
    if (bad.length) { setColorShown((d) => ({ ...d, ...Object.fromEntries(bad.map((k) => [k, true])) })); return false }
    setBusy(true)
    try { const { faces: _own, ...kitOnly } = kit; void _own; await settle(saveBrand({ kit: kitOnly }));   /* (REG-646) its own half only */ setSaved(kit); snackbar({ message: 'Brand kit saved' }); return true }   /* saveBrand revalidates the layout; a refresh here rendered twice */
    catch (e) { snackbar({ message: couldnt('save the brand kit', reasonOf(e)) }); return false }   /* (wave E, E7) a refusal answers { error: the rule } — said, never "saved" */
    finally { setBusy(false) }
  }
  const discard = () => { setKit(saved); setColorDraft({}); setColorShown({}) }
  const pick = async (input: HTMLInputElement | null, apply: (urls: string[]) => void, max = 1600) => {
    const files = Array.from(input?.files ?? [])
    if (input) input.value = ''
    if (!files.length) return
    apply(await Promise.all(files.map((f) => readFileAsDataUrl(f, max))))
  }
  /* Drafts for the typed fields: the kit only takes a valid value, the box keeps what was typed until then. (F121) A colour is typed as
     the house reads one (`hexTyped` drops what isn't hex; `hexOf` reads three or six digits), the same way as the Materials colour field;
     a half-typed colour stays in its box with its error once the box is left, rather than jumping back. */
  const [colorDraft, setColorDraft] = useState<Record<string, string>>({})
  const [colorShown, setColorShown] = useState<Record<string, boolean>>({})
  /* (audit 2026-09-26) a half-typed colour is an unsaved change — Discard clears it and Save shows the field's error */
  const dirty = JSON.stringify(kit) !== JSON.stringify(saved) || Object.keys(colorDraft).length > 0
  const setColour = (key: ColorKey, h: string) => {
    setKit((k) => ({ ...k, colors: { ...k.colors, [key]: h } }))
    setColorDraft((d) => { const n = { ...d }; delete n[key]; return n })
    setColorShown((d) => { const n = { ...d }; delete n[key]; return n })
  }
  const [sizeDraft, setSizeDraft] = useState<Record<string, string>>({})
  /* (Dane UAT 2.01 · 3.34) Preview: every page of the default template, large, drawn with the kit as it stands — saved or not. */
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const previewData = useMemo(() => ({ ...sample, studio: details }), [sample, details])
  const ownNote = previewDesign && previewName ? ownBrandNote(previewName, previewDesign.brand) : null
  /* (the calm UI build 2026-10-27, the UI audit's 4-35) the default template drawn with the kit alone — its own brand settings cleared for the
     preview — so a colour, a font or the logo changed here moves the preview at once (the note below says what the template keeps on paper) */
  const kitDesign = useMemo<TemplateDesign | null>(() => (previewDesign ? { ...previewDesign, brand: {} } : null), [previewDesign])

  return (
    <CompanyShell title="Templates" tabs={templateTabs()} from={from} skeleton={<BrandKitGhost />} actions={!canRun ? null : <>
      <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={!dirty || busy}>Discard</Button>
      <Button onPress={() => { void save() }} isDisabled={!dirty || busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
    </>}>
      {canRun ? null : <ReadOnlyNote />}
      <StudioFontFaces faces={faces} />
      {/* (UX audit S2) Unsaved edits are not lost to a move inside the app — a tab, the rail, a card — nor to a tab or a reload. */}
      <LeaveGuard dirty={dirty && canRun} what="the brand kit" onSave={save} onDiscard={discard} />
      <div className={styles.layout} data-testid="brand-kit">
        {/* (Dane UAT 2.01) The scope holds the kit's fields only: the preview and its Preview stay pressable for a member who may only read. */}
        <ReadOnlyScope readOnly={!canRun}>
        <div className={styles.form}>
          <p className={styles.lead}>Your logo, colours and fonts — every template uses them.</p>   {/* (the calm UI build 2026-10-27, W-184) one line */}
          <section id="marks" className={styles.card} aria-labelledby="brand-marks">
            <div className={styles.cardHead}><h2 id="brand-marks" className={styles.cardTitle}>Logo and marks</h2><p className={styles.cardHelp}>PNG, JPG or SVG.</p></div>
            <div className={styles.marks}>
              <div className={styles.mark}>
                <span className={styles.markLabel}>Logo</span>
                <button type="button" className={styles.well} onClick={() => logoInput.current?.click()} aria-label="Change logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {kit.logo ? <img src={kit.logo} alt="" /> : <span className={styles.wellEmpty}><Icon name="add_photo_alternate" size={24} weight={300} />Add logo</span>}
                </button>
                <input ref={logoInput} type="file" accept="image/*" hidden onChange={() => { void pick(logoInput.current, ([u]) => setKit((k) => ({ ...k, logo: u ?? k.logo }))) }} />
                <div className={styles.markActions}>
                  <Button appearance="text" onPress={() => logoInput.current?.click()}>Upload</Button>
                  {kit.logo && kit.logo !== '/figma-assets/logo.svg' ? <Button appearance="text" onPress={() => setKit((k) => ({ ...k, logo: '/figma-assets/logo.svg' }))}>Reset</Button> : null}
                </div>
              </div>
              <div className={styles.mark}>
                <span className={styles.markLabel}>Stamp</span>
                <button type="button" className={styles.well} onClick={() => stampInput.current?.click()} aria-label="Change stamp">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={kit.stamp ?? stampSvg(details.name, details.uen)} alt="" />
                </button>
                <input ref={stampInput} type="file" accept="image/*" hidden onChange={() => { void pick(stampInput.current, ([u]) => setKit((k) => ({ ...k, stamp: u ?? k.stamp })), 800) }} />
                <div className={styles.markActions}>
                  <Button appearance="text" onPress={() => stampInput.current?.click()}>Upload</Button>
                  {kit.stamp ? <Button appearance="text" onPress={() => setKit((k) => ({ ...k, stamp: null }))}>Use generated</Button> : null}
                </div>
              </div>
              <div className={`${styles.mark} ${styles.markWide}`}>
                <span className={styles.markLabel}>Badges</span>
                <div className={styles.badges}>
                  {kit.badges.map((b, i) => (
                    <span key={i} className={styles.badge}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b} alt="" />
                      <span className={styles.badgeRemove}><IconButton icon="close" label="Remove badge" size={24} variant="bare" iconSize={16} onClick={() => setKit((k) => ({ ...k, badges: k.badges.filter((_, j) => j !== i) }))} /></span>
                    </span>
                  ))}
                  <button type="button" className={styles.badgeAdd} onClick={() => badgeInput.current?.click()} aria-label="Add badge"><Icon name="add" size={20} weight={300} /></button>
                </div>
                <input ref={badgeInput} type="file" accept="image/*" multiple hidden onChange={() => { void pick(badgeInput.current, (urls) => setKit((k) => ({ ...k, badges: [...k.badges, ...urls] })), 400) }} />
                <div className={styles.markActions}>
                  <Button appearance="text" onPress={() => badgeInput.current?.click()}>Upload</Button>
                  {kit.badges.length === 0 ? <Button appearance="text" onPress={() => setKit((k) => ({ ...k, badges: DEMO_BADGES }))}>Use the demo badges</Button> : <Button appearance="text" onPress={() => setKit((k) => ({ ...k, badges: [] }))}>Clear</Button>}
                </div>
              </div>
            </div>
          </section>

          <section id="colours" className={styles.card} aria-labelledby="brand-colours">
            <div className={styles.cardHead}><h2 id="brand-colours" className={styles.cardTitle}>Colours</h2></div>
            <div className={styles.colours}>
              {COLOR_KEYS.map((key: ColorKey) => (
                <div key={key} className={styles.colour}>
                  <label className={styles.swatch} style={{ background: kit.colors[key] }}>
                    <input type="color" value={kit.colors[key]} aria-label={`${COLOR_LABEL[key]} colour`} onChange={(e) => setColour(key, e.target.value.toUpperCase())} />
                  </label>
                  <div className={styles.colourField}>
                    <TextField label={COLOR_LABEL[key]} value={colorDraft[key] ?? kit.colors[key]} maxLength={7}
                               error={colorShown[key] && colorDraft[key] !== undefined && !hexOf(colorDraft[key]!) ? 'Six hex digits, like #5500FF' : undefined}
                               onChange={(v) => {
                                 const t = hexTyped(v), h = hexOf(t)
                                 if (h && t.replace('#', '').length === 6) setColour(key, h)   // six digits land at once; three wait for the box to be left
                                 else setColorDraft((d) => ({ ...d, [key]: t }))
                               }}
                               onBlur={() => {
                                 const t = colorDraft[key]; if (t === undefined) return
                                 const h = hexOf(t)
                                 if (h) setColour(key, h)
                                 else setColorShown((d) => ({ ...d, [key]: true }))
                               }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="type" className={styles.card} aria-labelledby="brand-type">
            <div className={styles.cardHead}><h2 id="brand-type" className={styles.cardTitle}>Fonts</h2><p className={styles.cardHelp}>Sizes are in points, as on paper.</p></div>
            <div className={styles.roles}>
              {FONT_ROLES.map((role: FontRole) => {
                const f = kit.fonts[role]
                const set = (patch: Partial<typeof f>) => setKit((k) => ({ ...k, fonts: { ...k.fonts, [role]: { ...k.fonts[role], ...patch } } }))
                return (
                  <div key={role} className={styles.role}>
                    <span className={styles.roleLabel}>{FONT_ROLE_LABEL[role]}</span>
                    <div className={styles.roleFamily}><TextField label="Font" value={f.family} mode="select" options={fontOptions({ faces }, f.family)} onChange={(v) => set({ family: v })} /></div>
                    <div className={styles.roleSize}><TextField label="Size" value={sizeDraft[role] ?? String(f.size)} numeric="digits" maxLength={3} onChange={(v) => { setSizeDraft((d) => ({ ...d, [role]: v })); const n = Number(v); if (n > 0) set({ size: n }) }} onBlur={() => setSizeDraft((d) => { const n = { ...d }; delete n[role]; return n })} /></div>
                    <div className={styles.roleWeight}><TextField label="Weight" value={WEIGHTS.find((w) => w.value === f.weight)?.label ?? 'Regular'} mode="select" options={WEIGHTS.map((w) => w.label)} onChange={(v) => set({ weight: WEIGHTS.find((w) => w.label === v)?.value ?? 400 })} /></div>
                    <span className={styles.roleSample} style={{ fontFamily: fontStack(f.family), fontWeight: f.weight, fontSize: Math.max(11, Math.min(22, f.size * 1.5)) }}>Aa</span>   {/* (pending modules S11) the face's own stack — the self-hosted file, or the studio's upload */}
                  </div>
                )
              })}
            </div>
            {/* (pending modules S11 — card held:quote-templates) the studio's own fonts, under the four roles that use them */}
            <OwnFonts fonts={ownFonts.fonts} uses={ownFonts.uses} canRun={canRun} onFaces={setFaces} />
          </section>

          {/* (pending modules S11 — card held:quote-templates, "Invoice and PO paper live in Settings › Finance, not Templates"; as recommended:
              their one home stays Settings › Finance, beside their numbers and money rules, and this is the door from where a studio looks for
              how its documents look) */}
          <Link href={`${withFrom('/settings?section=finance', '/company/templates/brand')}#invoice-paper`} className={styles.kitLink} data-testid="paper-door">
            <span className={styles.kitLinkIcon}><Icon name="receipt_long" size={24} weight={300} /></span>
            <span className={styles.kitLinkText}><span className={styles.kitLinkTitle}>Invoices, receipts and purchase orders</span><span className={styles.cardHelp}>They print with this kit’s logo and accent colour. Their own words — notes, terms, the acceptance block — are set in Settings › Finance.</span></span>
            <Icon name="chevron_right" size={24} weight={300} />
          </Link>
        </div>
        </ReadOnlyScope>
        <aside className={styles.preview} aria-label="Preview" data-testid="brand-kit-preview">
          <span className={styles.previewLabel}>{previewName ? `Default template · ${previewName}` : 'Sample quote'}</span>
          <div className={styles.previewPage}>
            {kitDesign ? <TemplateThumb design={kitDesign} brand={shownKit} data={previewData} width={276} /> : <span className={styles.cardHelp}>Publish a template to see it here.</span>}
          </div>
          {/* (Dane UAT 2.01 · 3.34) Every page, large — at every width; ≤1024 the first page steps out and this stays beside the label. */}
          {previewDesign ? <span className={styles.previewOpen}><Button appearance="text" iconStart={<Icon name="visibility" size={20} weight={300} />} onPress={() => setPreviewOpen(true)} data-testid="brand-kit-preview-open">Preview</Button></span> : null}
          <Tooltip label="The first page of the studio's default template, drawn with the kit as you edit it">
            {/* (Dane UAT · Figma 1517:11) the stamp is a mark a template places — Letter places none, Form does */}
            <span className={styles.previewHint}><Icon name="info" size={16} weight={300} /><span>Redraws as you edit. The stamp prints only where a template places it.</span></span>
          </Tooltip>
          {ownNote ? <p className={styles.previewNote} data-testid="brand-kit-own-note">{ownNote}</p> : null}
        </aside>
      </div>
      {previewDesign ? (
        <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} size="modal" width={1200} height="xl" title={previewName ?? 'Sample quote'}
                subtitle={`${previewDesign.page.paper}${pageCount ? ` · ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}` : ''} · drawn with this brand kit and a sample quote`}>
          <TemplatePreviewPages paper={previewDesign.page.paper} design={kitDesign ?? previewDesign} brand={shownKit} sample={previewData} onPages={(n) => setPageCount((c) => (c === n ? c : n))} />
        </Dialog>
      ) : null}
    </CompanyShell>
  )
}
