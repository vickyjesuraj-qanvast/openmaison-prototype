'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, SegmentedButton, SegmentedButtonItem, Switch, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { resolveFields } from '@/lib/templates/fields'
import { COLOR_KEYS, COLOR_LABEL, fontOptions, FONT_ROLE_LABEL, FONT_ROLES, isColorKey, type Align, type BrandKit, type TextStyle } from '@/lib/templates/model'
import { FIELD_GROUPS } from '@/lib/templates/fields'
import { WritingHelp } from '@/components/writing/writing-help'
import { htmlToText, plainOf, textToHtml } from '@/lib/writing/html'
import { RichEditor, type RichEditorHandle } from '@/components/quotes/editor/text/rich-editor'
import { kitHtml, kitTextColors } from '@/lib/templates/kit-html'
import styles from './inspector.module.css'

/* The inspector's controls (REG-486): every one is a house primitive — TextField (text · select · numeric), the DS
   SegmentedButton and Switch, the anchored Dropdown — laid out as label-over-control fields in a 2-column grid. */

export function Field({ label, children, wide, hint }: { label?: string; children: ReactNode; wide?: boolean; hint?: string }) {
  return (
    <div className={styles.field} data-wide={wide || undefined}>
      {label ? <span className={styles.fieldLabel}>{label}{hint ? <Tooltip label={hint}><span className={styles.hint}><Icon name="info" size={14} weight={300} /></span></Tooltip> : null}</span> : null}
      {children}
    </div>
  )
}

export function Seg<T extends string>({ label, value, options, onChange, wide = true }: { label: string; value: T; options: { value: T; label: string; icon?: string }[]; onChange: (v: T) => void; wide?: boolean }) {
  return (
    <Field label={label} wide={wide}>
      <SegmentedButton aria-label={label} selectedKeys={[value]} onSelectionChange={(keys) => { const k = [...keys][0]; const o = options.find((x) => x.value === k); if (o) onChange(o.value) }}>
        {options.map((o) => <SegmentedButtonItem key={o.value} id={o.value}>{o.icon ? <Icon name={o.icon} size={18} weight={300} /> : o.label}</SegmentedButtonItem>)}
      </SegmentedButton>
    </Field>
  )
}

/** (REG-542) A select spans the pane unless paired on purpose: a half column truncated "Restart per section" to "Restart per r…". */
export function Sel<T extends string>({ label, value, options, onChange, wide = true, helper }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; wide?: boolean; /** (Dane UAT) a line under the box saying what a choice means */ helper?: string }) {
  const current = options.find((o) => o.value === value)?.label ?? ''
  return (
    <Field wide={wide}>
      <TextField label={label} mode="select" value={current} options={options.map((o) => o.label)} onChange={(l) => { const o = options.find((x) => x.label === l); if (o) onChange(o.value) }} helper={helper} />
    </Field>
  )
}

export function Num({ label, value, onChange, min = 0, max = 400, unit, wide, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string; wide?: boolean; step?: number }) {
  const [text, setText] = useState<string | null>(null)
  const shown = text ?? String(Math.round(value * 100) / 100)
  const commit = (raw: string) => { const n = Number(raw); setText(null); if (raw.trim() !== '' && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n / step) * step))) }
  return (
    <Field wide={wide}>
      <TextField label={unit ? `${label} (${unit})` : label} value={shown} numeric="amount" maxLength={7}
                 onChange={(v) => { setText(v); const n = Number(v); if (v.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(Math.round(n / step) * step) }}
                 onBlur={() => commit(shown)} onKeyDown={(e) => { if (e.key === 'Enter') commit(shown) }} />
    </Field>
  )
}

export function Sw({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className={styles.switchRow}>
      <span className={styles.switchLabel}>{label}{hint ? <Tooltip label={hint}><span className={styles.hint}><Icon name="info" size={14} weight={300} /></span></Tooltip> : null}</span>
      <Switch size="sm" isSelected={value} onChange={(v: boolean) => onChange(v)} aria-label={label} />
    </label>
  )
}

/**
 * Text with an "Insert field" menu that appends a {field}. Multiline for intros and paragraphs. (REG-569) The menu is a portal, so the
 * pane's edge never clips it; and when `values` are given, a field in the text shows what it prints as ("Prints as: Mr & Mrs Tan") —
 * the words in braces read as code to a studio owner, the line under them says what they mean.
 * (Dane UAT, Figma 1517:57) `reset` = the words a new block starts with here: once the text differs from them, a Reset under the box puts
 * them back — `onReset` makes that one undo step of its own (a cleared box had no way back but ⌘Z).
 * (pending modules S29 — 1.0's quote document sections, Introduction and Scope, carried the ✨ menu) `help` = a paragraph of prose (the cover
 * letter's introduction, a text block): Write with AI under Insert a field — Improve · Shorten · Plain English, a proposal first; its {fields}
 * are never touched, and the change is one step of the editor's own undo.
 */
export function Txt({ label, value, onChange, multiline, fields = true, wide = true, values, reset, onReset, help = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; fields?: boolean; wide?: boolean; values?: Record<string, string>; reset?: string; onReset?: () => void; help?: boolean }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const preview = values && /\{[a-z_]+\}/.test(value) ? resolveFields(value, values).replace(/\s+/g, ' ').trim() : null
  const helper = preview !== null ? (preview ? `Prints as: ${preview}` : 'Prints as: nothing on this quote') : undefined
  const resetBtn = reset !== undefined && value !== reset ? (
    <span className={styles.reset}><Button appearance="text" iconStart={<Icon name="restart_alt" size={18} />} onPress={() => (onReset ? onReset() : onChange(reset))} aria-label={`Reset ${label}`} data-testid="txt-reset">Reset</Button></span>
  ) : null
  return (
    <Field wide={wide}>
      <div className={styles.txt}>
        {/* (REG-542) a paragraph field keeps its label — a placeholder vanished as soon as one typed. (REG-729) The DS TextArea's own label,
            inside the box while it is empty and on its top edge once it holds text, as every single-line field's. */}
        {multiline ? (
          <span className={styles.txtGrow}><TextArea label={label} value={value} onChange={(v: string) => onChange(v)} className={styles.area} />{helper ? <span className={styles.helper}>{helper}</span> : null}{resetBtn}</span>
        ) : (
          <span className={styles.txtGrow}><TextField label={label} value={value} onChange={onChange} helper={helper} />{resetBtn}</span>
        )}
        {fields ? (
          <span className={help ? styles.txtTools : styles.txtToolsBare}>
          <span ref={anchor} className={styles.fieldsAnchor}>
            <Tooltip label="Insert a field — the client’s name, the date, the quote number…" disabled={open}>
              <IconButton icon="data_object" label="Insert a field" size={36} variant="bare" iconSize={20} iconWeight={300} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
            </Tooltip>
            {/* (REG-728) An insert-field list: 240; each group under the house group title. */}
            <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle="Insert a field">
              <FieldItems onPick={(key) => { setOpen(false); onChange(value ? `${value}${value.endsWith(' ') || value.endsWith('\n') ? '' : ' '}{${key}}` : `{${key}}`) }} />
            </PortalMenu>
          </span>
            {help ? <WritingHelp label={label} kind="template-text" trigger="icon" testId="txt-writing" sources={{}} read={() => ({ html: textToHtml(value) })} apply={(h) => onChange(htmlToText(h))} /> : null}
          </span>
        ) : null}
      </div>
    </Field>
  )
}

/** (REG-728) The Insert a field list: each group under the house group title — one list for the plain boxes and the Text block. */
function FieldItems({ onPick }: { onPick: (key: string) => void }) {
  return (
    <>
      {FIELD_GROUPS.map((g) => (
        <div key={g.label}>
          <DropdownLabel>{g.label}</DropdownLabel>
          {g.fields.map((f) => <DropdownItem key={f.key} onSelect={() => onPick(f.key)}>{f.label}</DropdownItem>)}
        </div>
      ))}
    </>
  )
}

/**
 * (S44G — NB-08, F2-05; her ask 2026-10-15, as recommended) A Text block's words, formatted: the house rich editor (the quote's Terms and a line's
 * description use it) in its dense form for the 320 pane — Bold · Italic · Underline | Bulleted list · Numbered list | Text colour (the kit's
 * four, never a free colour: C2) | Link. Insert a field puts the field where the caret was; Write with AI works on the formatted words; "Prints as"
 * reads the fields under the box, as every plain box does (REG-569). The stored words are the editor's HTML: the allowlist cleans them on save
 * (`parseDesign`) and at print; a block written before this opens as its same words and stays as it was on the page until it is edited. Each
 * change is a step of the editor's own undo (typing folds into one step as in a plain box; Write with AI's words are a step of their own).
 */
export function RichTxt({ label, value, onChange, brand, values, help = false, placeholder }: { label: string; value: string; onChange: (html: string, step?: boolean) => void; brand: BrandKit; values?: Record<string, string>; help?: boolean; placeholder: string }) {
  const editor = useRef<RichEditorHandle>(null)
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const colors = useMemo(() => kitTextColors(brand.colors), [brand.colors])
  const shown = useMemo(() => kitHtml(value, brand), [value, brand])   // the editor paints a coloured run in the kit's colour as the kit has it today
  const words = plainOf(value)
  const preview = values && /\{[a-z_]+\}/.test(words) ? resolveFields(words, values).replace(/\s+/g, ' ').trim() : null
  return (
    <Field label={label} wide>
      <RichEditor ref={editor} dense framed tools="block" colors={colors} value={shown} onChange={(h) => onChange(h)} label={label} placeholder={placeholder} minHeight={96}
                  right={<>
                    <span ref={anchor} className={styles.fieldsAnchorText}>
                      <Button variant="secondary" appearance="text" iconStart={<Icon name="data_object" size={20} weight={300} />} onPress={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} data-testid="text-insert-field">Insert a field</Button>
                      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Insert a field">
                        <FieldItems onPick={(key) => { setOpen(false); editor.current?.insertField(`{${key}}`) }} />
                      </PortalMenu>
                    </span>
                    {help ? <WritingHelp label={label} kind="template-text" trigger="text" menuAlign="left" testId="text-writing" sources={{}} read={() => ({ html: value })} apply={(h) => onChange(h, true)} /> : null}
                  </>} />
      {preview !== null ? <span className={styles.helper}>{preview ? `Prints as: ${preview}` : 'Prints as: nothing on this quote'}</span> : null}
    </Field>
  )
}

/** A colour: one of the brand's six by name (they follow the kit), or any hex. `none` allows "no colour". */
export function ColorPick({ label, value, onChange, brand, none, wide }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void; brand: BrandKit; none?: boolean; wide?: boolean }) {
  const custom = value && !isColorKey(value) ? value : null
  return (
    <Field label={label} wide={wide}>
      <div className={styles.swatches} role="radiogroup" aria-label={label}>
        {none ? (
          <Tooltip label="None"><button type="button" role="radio" aria-checked={!value} className={styles.swatch} data-none data-on={!value || undefined} onClick={() => onChange(undefined)} aria-label="No colour" /></Tooltip>
        ) : null}
        {COLOR_KEYS.map((k) => (
          <Tooltip key={k} label={COLOR_LABEL[k]}>
            <button type="button" role="radio" aria-checked={value === k} className={styles.swatch} data-on={value === k || undefined} style={{ background: brand.colors[k] }} onClick={() => onChange(k)} aria-label={COLOR_LABEL[k]} />
          </Tooltip>
        ))}
        <Tooltip label={custom ? `Custom ${custom}` : 'Custom colour'}>
          <label className={styles.swatch} data-custom data-on={custom ? '' : undefined} style={{ background: custom ?? undefined }}>
            <input type="color" value={custom ?? '#888888'} aria-label={`${label} custom colour`} onChange={(e) => onChange(e.target.value.toUpperCase())} />
            {!custom ? <Icon name="add" size={14} weight={300} /> : null}
          </label>
        </Tooltip>
      </div>
    </Field>
  )
}

const WEIGHTS: { value: 'inherit' | '400' | '600' | '700'; label: string }[] = [{ value: 'inherit', label: 'As the style' }, { value: '400', label: 'Regular' }, { value: '600', label: 'Semibold' }, { value: '700', label: 'Bold' }]

/** A TextStyle: the role it follows, then what it changes on top — font, size, weight, B/I/U/Aa, alignment, colour. */
export function StyleEditor({ label, value, onChange, brand, align = true, more = false }: { label: string; value: TextStyle; onChange: (s: TextStyle) => void; brand: BrandKit; align?: boolean; more?: boolean }) {
  const [open, setOpen] = useState(false)
  const role = value.role ?? 'body'
  const set = (patch: Partial<TextStyle>) => { const next = { ...value, ...patch }; for (const k of Object.keys(next) as (keyof TextStyle)[]) if (next[k] === undefined) delete next[k]; onChange(next) }
  const toggle = (k: 'italic' | 'underline' | 'uppercase') => set({ [k]: value[k] ? undefined : true })
  const bold = (value.weight ?? brand.fonts[role].weight) >= 700
  return (
    <div className={styles.style}>
      <button type="button" className={styles.styleHead} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={styles.styleTitle}>{label}</span>
        <span className={styles.styleSummary}>{FONT_ROLE_LABEL[role]}{value.font ? ` · ${value.font}` : ''}{value.size ? ` · ${value.size}pt` : ''}</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={20} weight={300} />
      </button>
      {open ? (
        <div className={styles.grid}>
          <Sel label="Text style" value={role} options={FONT_ROLES.map((r) => ({ value: r, label: `${FONT_ROLE_LABEL[r]} · ${brand.fonts[r].family} ${brand.fonts[r].size}pt` }))} onChange={(r) => set({ role: r })} wide />
          <Sel label="Font" value={value.font ?? 'inherit'} options={[{ value: 'inherit', label: 'Same as the text style' }, ...fontOptions(brand, value.font).map((f) => ({ value: f, label: f }))]} onChange={(f) => set({ font: f === 'inherit' ? undefined : f })} wide />   {/* (REG-569) a half column cut "Same as the text style" to "Same as th…" */}
          <Num label="Size" unit="pt" value={value.size ?? brand.fonts[role].size} min={4} max={72} step={0.5} onChange={(n) => set({ size: n })} />
          <Sel label="Weight" value={value.weight ? (String(value.weight) as '400' | '600' | '700') : 'inherit'} options={WEIGHTS} onChange={(w) => set({ weight: w === 'inherit' ? undefined : (Number(w) as 400 | 600 | 700) })} wide={false} />
          <Field label="Emphasis">
            <div className={styles.toggles} role="group" aria-label="Emphasis">
              <IconButton icon="format_bold" label="Bold" size={36} variant="bare" iconSize={20} selected={bold} onClick={() => set({ weight: bold ? 400 : 700 })} />
              <IconButton icon="format_italic" label="Italic" size={36} variant="bare" iconSize={20} selected={!!value.italic} onClick={() => toggle('italic')} />
              <IconButton icon="format_underlined" label="Underline" size={36} variant="bare" iconSize={20} selected={!!value.underline} onClick={() => toggle('underline')} />
              <IconButton icon="format_size" label="Uppercase" size={36} variant="bare" iconSize={20} selected={!!value.uppercase} onClick={() => toggle('uppercase')} />
            </div>
          </Field>
          {align ? <Seg label="Align" value={(value.align ?? 'left') as Align} options={[{ value: 'left', label: 'Left', icon: 'format_align_left' }, { value: 'center', label: 'Centre', icon: 'format_align_center' }, { value: 'right', label: 'Right', icon: 'format_align_right' }]} onChange={(a) => set({ align: a === 'left' ? undefined : a })} /> : null}
          <ColorPick label="Colour" value={value.color} onChange={(c) => set({ color: c })} brand={brand} none wide />
          {more ? (<>
            <Num label="Letter spacing" unit="em" value={value.letterSpacing ?? 0} min={-0.1} max={1} step={0.01} onChange={(n) => set({ letterSpacing: n || undefined })} />
            <Num label="Line height" value={value.lineHeight ?? 1.3} min={0.8} max={3} step={0.05} onChange={(n) => set({ lineHeight: n })} />
          </>) : null}
        </div>
      ) : null}
    </div>
  )
}

/** (REG-542) A caption that splits a long group into readable parts — "Table look", "Amounts", "Placement". */
export function Sub({ children }: { children: ReactNode }) {
  return <span className={styles.subHead}>{children}</span>
}

/** A collapsible group of fields ("More options"); `sub` is a muted summary beside the title (the page setup's "A4 · 12/18/10/18 mm"). */
export function Group({ title, sub, children, open: initial = false }: { title: string; sub?: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial)
  return (
    <div className={styles.group}>
      <button type="button" className={styles.groupHead} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={styles.groupTitle}>{title}{sub ? <span className={styles.groupSub}>{sub}</span> : null}</span><Icon name={open ? 'expand_less' : 'expand_more'} size={20} weight={300} />
      </button>
      {open ? <div className={styles.grid}>{children}</div> : null}
    </div>
  )
}
