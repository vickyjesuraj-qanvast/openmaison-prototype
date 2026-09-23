'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { COLOR_KEYS, COLOR_LABEL, FONT_FAMILIES, FONT_ROLE_LABEL, FONT_ROLES, mergeBrand, type BrandKit, type BrandOverrides, type FontSpec, type TemplateDesign } from '@/lib/templates/model'
import { readFileAsDataUrl } from '@/lib/templates/files'
import styles from './brand-pane.module.css'
import controls from './inspector.module.css'

type Props = { design: TemplateDesign; brand: BrandKit; onDesign: (fn: (d: TemplateDesign) => TemplateDesign, opts?: { coalesce?: string }) => void }
const WEIGHTS: { label: string; value: 400 | 600 | 700 }[] = [{ label: 'Regular', value: 400 }, { label: 'Semibold', value: 600 }, { label: 'Bold', value: 700 }]

/**
 * Brand (REG-487; 6b corrected): the studio's kit as this template uses it. Every value shows the kit's, and a change here
 * is an override on this template only, marked and one click from "Reset to brand". The kit itself is Company › Templates › Brand kit (REG-554).
 */
export function BrandPane({ design, brand, onDesign }: Props) {
  const pathname = usePathname()
  const o = design.brand
  const merged = mergeBrand(brand, o)
  /* Empty `colors` / `fonts` containers are dropped, so a reset really equals the published design. */
  const prune = (x: BrandOverrides): BrandOverrides => { const y = { ...x }; if (y.colors && !Object.keys(y.colors).length) delete y.colors; if (y.fonts && !Object.keys(y.fonts).length) delete y.fonts; return y }
  const setO = (fn: (x: BrandOverrides) => BrandOverrides, coalesce?: string) => onDesign((d) => ({ ...d, brand: prune(fn(d.brand)) }), coalesce ? { coalesce } : undefined)
  const logoInput = useRef<HTMLInputElement>(null)
  const overridden = Object.keys(o).length > 0 || Object.keys(o.colors ?? {}).length > 0 || Object.keys(o.fonts ?? {}).length > 0
  const fontOverride = (role: (typeof FONT_ROLES)[number]) => !!o.fonts?.[role] && Object.keys(o.fonts[role]!).length > 0
  const setFont = (role: (typeof FONT_ROLES)[number], patch: Partial<FontSpec>) => setO((x) => { const cur = { ...(x.fonts?.[role] ?? {}), ...patch }; for (const k of Object.keys(cur) as (keyof FontSpec)[]) if (cur[k] === brand.fonts[role][k]) delete cur[k]; const fonts = { ...(x.fonts ?? {}), [role]: cur }; if (!Object.keys(cur).length) delete fonts[role]; return { ...x, fonts } }, `font-${role}`)
  const resetFont = (role: (typeof FONT_ROLES)[number]) => setO((x) => { const fonts = { ...(x.fonts ?? {}) }; delete fonts[role]; return { ...x, fonts } })
  const setColor = (key: (typeof COLOR_KEYS)[number], v: string) => setO((x) => { const colors = { ...(x.colors ?? {}) }; if (v.toUpperCase() === brand.colors[key].toUpperCase()) delete colors[key]; else colors[key] = v.toUpperCase(); return { ...x, colors } }, `color-${key}`)
  return (
    <div className={styles.pane}>
      <div className={styles.body}>
        <div className={styles.intro}>
          <span className={styles.introText}>Values come from the brand kit. Change one here and only this template differs.</span>
          <Link href={withFrom('/company/templates/brand', pathname)} className={styles.link}>Edit the brand kit <Icon name="arrow_outward" size={16} weight={300} /></Link>   {/* (REG-554) Templates › Brand kit, with this editor as the way back */}
        </div>
        <section className={styles.section}>
          <h3 className={styles.title}>Logo</h3>
          <div className={styles.logoRow}>
            <button type="button" className={styles.logoWell} onClick={() => logoInput.current?.click()} aria-label="Replace the logo on this template">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {merged.logo ? <img src={merged.logo} alt="" /> : <span>No logo</span>}
            </button>
            <div className={styles.logoActions}>
              <Button appearance="text" onPress={() => logoInput.current?.click()}>Replace</Button>
              {o.logo !== undefined ? <Button appearance="text" onPress={() => setO((x) => { const n = { ...x }; delete n.logo; return n })}>Reset to brand</Button> : <span className={styles.fromKit}>From the kit</span>}
            </div>
            <input ref={logoInput} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { const url = await readFileAsDataUrl(f, 1200); setO((x) => ({ ...x, logo: url })) } }} />
          </div>
        </section>
        <section className={styles.section}>
          <h3 className={styles.title}>Colours</h3>
          <div className={styles.colours}>
            {COLOR_KEYS.map((key) => {
              const over = !!o.colors?.[key]
              return (
                <div key={key} className={styles.colour} data-over={over || undefined}>
                  <label className={styles.swatch} style={{ background: merged.colors[key] }}>
                    <input type="color" value={merged.colors[key]} aria-label={`${COLOR_LABEL[key]} colour`} onChange={(e) => setColor(key, e.target.value)} />
                  </label>
                  <span className={styles.colourText}>
                    <span className={styles.colourLabel}>{COLOR_LABEL[key]}</span>
                    <span className={styles.colourHex}>{merged.colors[key]}{over ? ' · this template' : ''}</span>
                  </span>
                  {over ? <Tooltip label="Reset to brand"><IconButton icon="restart_alt" label={`Reset ${COLOR_LABEL[key]} to brand`} size={24} variant="bare" iconSize={18} onClick={() => setO((x) => { const colors = { ...(x.colors ?? {}) }; delete colors[key]; return { ...x, colors } })} /></Tooltip> : null}
                </div>
              )
            })}
          </div>
        </section>
        <section className={styles.section}>
          <h3 className={styles.title}>Fonts</h3>
          <div className={styles.roles}>
            {FONT_ROLES.map((role) => {
              const f = merged.fonts[role]
              return (
                <div key={role} className={styles.role} data-over={fontOverride(role) || undefined}>
                  <div className={styles.roleHead}>
                    <span className={styles.roleLabel}>{FONT_ROLE_LABEL[role]}</span>
                    {fontOverride(role) ? <Button appearance="text" onPress={() => resetFont(role)}>Reset to brand</Button> : <span className={styles.fromKit}>From the kit</span>}
                  </div>
                  <div className={controls.grid}>
                    <div className={controls.field} data-wide><TextField label="Font" value={f.family} mode="select" options={[...FONT_FAMILIES]} onChange={(v) => setFont(role, { family: v })} /></div>
                    <div className={controls.field}><TextField label="Size (pt)" value={String(f.size)} numeric="amount" maxLength={4} onChange={(v) => { const n = Number(v); if (n > 0) setFont(role, { size: n }) }} /></div>
                    <div className={controls.field}><TextField label="Weight" value={WEIGHTS.find((w) => w.value === f.weight)?.label ?? 'Regular'} mode="select" options={WEIGHTS.map((w) => w.label)} onChange={(v) => setFont(role, { weight: WEIGHTS.find((w) => w.label === v)?.value ?? 400 })} /></div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
        <section className={styles.section}>
          <h3 className={styles.title}>Badges and stamp</h3>
          <span className={styles.introText}>{merged.badges.length ? `${merged.badges.length} badge${merged.badges.length === 1 ? '' : 's'} from the kit` : 'No badges in the kit'} · {merged.stamp ? 'custom stamp' : 'generated stamp'}. Manage them in Templates › Brand kit.</span>
        </section>
      </div>
      <div className={styles.foot}>
        <Button appearance="outlined" variant="secondary" isDisabled={!overridden} onPress={() => onDesign((d) => ({ ...d, brand: {} }))}>Reset everything to the brand kit</Button>
      </div>
    </div>
  )
}
