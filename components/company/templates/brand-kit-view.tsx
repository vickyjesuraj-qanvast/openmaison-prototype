'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { CompanyShell, templateTabs } from '../company-shell'
import { BrandKitGhost } from '@/components/company/company-ghosts'
import { TemplateThumb } from '@/components/templates/render/document'
import { saveBrand } from '@/app/company/templates-actions'
import { reasonOf, settle } from './refusal'
import { couldnt } from '@/components/leads/tasks/use-run'
import { COLOR_KEYS, COLOR_LABEL, FONT_FAMILIES, FONT_ROLES, FONT_ROLE_LABEL, type BrandKit, type ColorKey, type FontRole, type TemplateDesign } from '@/lib/templates/model'
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

/**
 * Company › Templates › Brand kit (REG-487 → REG-554, owner 2026-09-23: "inside the template is better"): the kit every
 * template starts from — logo, stamp, accreditation badges, the six named colours, the four type roles — as the first tab
 * of Templates, beside the kinds that inherit it. The company details it prints stay under Company › Profile. Saved as
 * one record with them (`settings` key `brand`); the default template's first page on the right redraws as you edit.
 */
export function BrandKitView({ brand, previewDesign, previewName, sample, from, canRun = true }: { brand: BrandSetting; previewDesign: TemplateDesign | null; previewName: string | null; sample: DocData; from?: string; /** (REG-646, settings parity Q-07) */ canRun?: boolean }) {
  const snackbar = useSnackbar()
  const [kit, setKit] = useState<BrandKit>(brand.kit)
  const [saved, setSaved] = useState<BrandKit>(brand.kit)
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
    try { await settle(saveBrand({ kit }));   /* (REG-646) its own half only */ setSaved(kit); snackbar({ message: 'Brand kit saved' }); return true }   /* saveBrand revalidates the layout; a refresh here rendered twice */
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

  return (
    <CompanyShell title="Templates" tabs={templateTabs()} from={from} skeleton={<BrandKitGhost />} actions={!canRun ? null : <>
      <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={!dirty || busy}>Discard</Button>
      <Button onPress={() => { void save() }} isDisabled={!dirty || busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
    </>}>
      {canRun ? null : <ReadOnlyNote />}
      {/* (UX audit S2) Unsaved edits are not lost to a move inside the app — a tab, the rail, a card — nor to a tab or a reload. */}
      <LeaveGuard dirty={dirty && canRun} what="the brand kit" onSave={save} onDiscard={discard} />
      <ReadOnlyScope readOnly={!canRun}>
      <div className={styles.layout} data-testid="brand-kit">
        <div className={styles.form}>
          <p className={styles.lead}>Every template starts from this kit — its logo, stamp, badges, colours and type. Change one thing here and every template that uses it follows. A template can still differ on its own Brand tab.</p>
          <section id="marks" className={styles.card} aria-labelledby="brand-marks">
            <div className={styles.cardHead}><h2 id="brand-marks" className={styles.cardTitle}>Logo and marks</h2><p className={styles.cardHelp}>The logo, the company stamp and the accreditation badges a template can place. PNG, JPG or SVG.</p></div>
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
            <div className={styles.cardHead}><h2 id="brand-colours" className={styles.cardTitle}>Colours</h2><p className={styles.cardHelp}>Six named colours every template refers to by name — change one here and every template that uses it follows.</p></div>
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
            <div className={styles.cardHead}><h2 id="brand-type" className={styles.cardTitle}>Fonts</h2><p className={styles.cardHelp}>Four roles a template’s text takes. Sizes are in points, as on paper.</p></div>
            <div className={styles.roles}>
              {FONT_ROLES.map((role: FontRole) => {
                const f = kit.fonts[role]
                const set = (patch: Partial<typeof f>) => setKit((k) => ({ ...k, fonts: { ...k.fonts, [role]: { ...k.fonts[role], ...patch } } }))
                return (
                  <div key={role} className={styles.role}>
                    <span className={styles.roleLabel}>{FONT_ROLE_LABEL[role]}</span>
                    <div className={styles.roleFamily}><TextField label="Font" value={f.family} mode="select" options={[...FONT_FAMILIES]} onChange={(v) => set({ family: v })} /></div>
                    <div className={styles.roleSize}><TextField label="Size" value={sizeDraft[role] ?? String(f.size)} numeric="digits" maxLength={3} onChange={(v) => { setSizeDraft((d) => ({ ...d, [role]: v })); const n = Number(v); if (n > 0) set({ size: n }) }} onBlur={() => setSizeDraft((d) => { const n = { ...d }; delete n[role]; return n })} /></div>
                    <div className={styles.roleWeight}><TextField label="Weight" value={WEIGHTS.find((w) => w.value === f.weight)?.label ?? 'Regular'} mode="select" options={WEIGHTS.map((w) => w.label)} onChange={(v) => set({ weight: WEIGHTS.find((w) => w.label === v)?.value ?? 400 })} /></div>
                    <span className={styles.roleSample} style={{ fontFamily: f.family, fontWeight: f.weight, fontSize: Math.max(11, Math.min(22, f.size * 1.5)) }}>Aa</span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
        <aside className={styles.preview} aria-label="Preview">
          <span className={styles.previewLabel}>{previewName ? `Default template · ${previewName}` : 'Sample quote'}</span>
          <div className={styles.previewPage}>
            {previewDesign ? <TemplateThumb design={previewDesign} brand={kit} data={{ ...sample, studio: details }} width={276} /> : <span className={styles.cardHelp}>Publish a template to see it here.</span>}
          </div>
          <Tooltip label="The first page of the studio's default template, drawn with the kit as you edit it">
            <span className={styles.previewHint}><Icon name="info" size={16} weight={300} /> Redraws as you edit</span>
          </Tooltip>
        </aside>
      </div>
      </ReadOnlyScope>
    </CompanyShell>
  )
}
