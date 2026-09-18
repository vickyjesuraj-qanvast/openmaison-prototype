'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { CompanyShell } from './company-shell'
import { TemplateThumb } from '@/components/templates/render/document'
import { saveBrand } from '@/app/company/templates-actions'
import { COLOR_KEYS, COLOR_LABEL, FONT_FAMILIES, FONT_ROLES, FONT_ROLE_LABEL, type BrandKit, type ColorKey, type FontRole, type StudioDetails, type TemplateDesign } from '@/lib/templates/model'
import type { BrandSetting } from '@/lib/templates/brand'
import { DEMO_BADGES, stampSvg } from '@/lib/templates/assets'
import type { DocData } from '@/lib/templates/data'
import { readFileAsDataUrl } from '@/lib/templates/files'
import styles from './profile-view.module.css'

const WEIGHTS: { label: string; value: 400 | 600 | 700 }[] = [{ label: 'Regular', value: 400 }, { label: 'Semibold', value: 600 }, { label: 'Bold', value: 700 }]
const DETAIL_FIELDS: { key: keyof StudioDetails; label: string }[] = [
  { key: 'name', label: 'Company name' }, { key: 'uen', label: 'UEN / Co. Reg. No.' }, { key: 'address', label: 'Address' }, { key: 'phone', label: 'Phone' }, { key: 'fax', label: 'Fax' },
  { key: 'email', label: 'Email' }, { key: 'website', label: 'Website' }, { key: 'gstReg', label: 'GST Reg. No.' }, { key: 'licence', label: 'HDB licence' },
]

/**
 * Company › Profile (REG-487): the brand kit every quote template starts from — logo, stamp, accreditation badges, the six
 * named colours, the four type roles — and the company details the templates print. Saved as one record; the default
 * template's first page on the right redraws as you edit.
 */
export function ProfileView({ brand, previewDesign, previewName, sample }: { brand: BrandSetting; previewDesign: TemplateDesign | null; previewName: string | null; sample: DocData }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [kit, setKit] = useState<BrandKit>(brand.kit)
  const [details, setDetails] = useState<StudioDetails>(brand.details)
  const [saved, setSaved] = useState<BrandSetting>(brand)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify({ kit, details }) !== JSON.stringify(saved)
  const logoInput = useRef<HTMLInputElement>(null)
  const stampInput = useRef<HTMLInputElement>(null)
  const badgeInput = useRef<HTMLInputElement>(null)

  const save = async () => {
    setBusy(true)
    try { await saveBrand({ kit, details }); setSaved({ kit, details }); snackbar({ message: 'Brand kit saved' }); router.refresh() }
    catch { snackbar({ message: 'Couldn’t save the brand kit — please try again' }) }
    finally { setBusy(false) }
  }
  const discard = () => { setKit(saved.kit); setDetails(saved.details) }
  const pick = async (input: HTMLInputElement | null, apply: (urls: string[]) => void, max = 1600) => {
    const files = Array.from(input?.files ?? [])
    if (input) input.value = ''
    if (!files.length) return
    apply(await Promise.all(files.map((f) => readFileAsDataUrl(f, max))))
  }
  const hex = (v: string) => (/^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null)

  return (
    <CompanyShell title="Profile" actions={<>
      <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={!dirty || busy}>Discard</Button>
      <Button onPress={() => { void save() }} isDisabled={!dirty || busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
    </>}>
      <div className={styles.layout}>
        <div className={styles.form}>
          <section id="marks" className={styles.card} aria-labelledby="profile-marks">
            <div className={styles.cardHead}><h2 id="profile-marks" className={styles.cardTitle}>Logo and marks</h2><p className={styles.cardHelp}>The logo, the company stamp and the accreditation badges a template can place. PNG, JPG or SVG.</p></div>
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

          <section id="colours" className={styles.card} aria-labelledby="profile-colours">
            <div className={styles.cardHead}><h2 id="profile-colours" className={styles.cardTitle}>Colours</h2><p className={styles.cardHelp}>Six named colours every template refers to by name — change one here and every template that uses it follows.</p></div>
            <div className={styles.colours}>
              {COLOR_KEYS.map((key: ColorKey) => (
                <div key={key} className={styles.colour}>
                  <label className={styles.swatch} style={{ background: kit.colors[key] }}>
                    <input type="color" value={kit.colors[key]} aria-label={`${COLOR_LABEL[key]} colour`} onChange={(e) => setKit((k) => ({ ...k, colors: { ...k.colors, [key]: e.target.value.toUpperCase() } }))} />
                  </label>
                  <div className={styles.colourField}>
                    <TextField label={COLOR_LABEL[key]} value={kit.colors[key]} maxLength={7} onChange={(v) => { const h = hex(v); if (h) setKit((k) => ({ ...k, colors: { ...k.colors, [key]: h } })) }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="type" className={styles.card} aria-labelledby="profile-type">
            <div className={styles.cardHead}><h2 id="profile-type" className={styles.cardTitle}>Type</h2><p className={styles.cardHelp}>Four roles a template’s text takes. Sizes are in points, as on paper.</p></div>
            <div className={styles.roles}>
              {FONT_ROLES.map((role: FontRole) => {
                const f = kit.fonts[role]
                const set = (patch: Partial<typeof f>) => setKit((k) => ({ ...k, fonts: { ...k.fonts, [role]: { ...k.fonts[role], ...patch } } }))
                return (
                  <div key={role} className={styles.role}>
                    <span className={styles.roleLabel}>{FONT_ROLE_LABEL[role]}</span>
                    <div className={styles.roleFamily}><TextField label="Font" value={f.family} mode="select" options={[...FONT_FAMILIES]} onChange={(v) => set({ family: v })} /></div>
                    <div className={styles.roleSize}><TextField label="Size" value={String(f.size)} numeric="amount" maxLength={4} onChange={(v) => { const n = Number(v); if (n > 0) set({ size: n }) }} /></div>
                    <div className={styles.roleWeight}><TextField label="Weight" value={WEIGHTS.find((w) => w.value === f.weight)?.label ?? 'Regular'} mode="select" options={WEIGHTS.map((w) => w.label)} onChange={(v) => set({ weight: WEIGHTS.find((w) => w.label === v)?.value ?? 400 })} /></div>
                    <span className={styles.roleSample} style={{ fontFamily: f.family, fontWeight: f.weight, fontSize: Math.max(11, Math.min(22, f.size * 1.5)) }}>Aa</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section id="details" className={styles.card} aria-labelledby="profile-details">
            <div className={styles.cardHead}><h2 id="profile-details" className={styles.cardTitle}>Company details</h2><p className={styles.cardHelp}>What the templates print through their fields — {'{studio_name}'}, {'{studio_uen}'}, {'{studio_address}'} and the rest.</p></div>
            <div className={styles.details}>
              {DETAIL_FIELDS.map((f) => (
                <div key={f.key} className={f.key === 'address' ? styles.detailWide : undefined}>
                  <TextField label={f.label} value={details[f.key]} onChange={(v) => setDetails((d) => ({ ...d, [f.key]: v }))} />
                </div>
              ))}
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
    </CompanyShell>
  )
}
