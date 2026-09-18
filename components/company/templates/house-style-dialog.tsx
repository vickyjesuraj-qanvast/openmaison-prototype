'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { TextField } from '@/components/om/text-field'
import { Icon } from '@/components/om/icon'
import { TemplateThumb } from '@/components/templates/render/document'
import { TemplatePreviewPages } from '@/components/templates/template-preview-dialog'
import { PRESETS, type PresetKey } from '@/lib/templates/presets'
import type { BrandKit } from '@/lib/templates/model'
import type { DocData } from '@/lib/templates/data'
import styles from './house-style-dialog.module.css'

/** The one panel both states share — the xl 1200, 960 tall (viewport-capped), so Preview and Back never move an edge. */
const HEIGHT = 960

/**
 * New template › Use a ready-made design (REG-487 → REG-510 → REG-512): the four house styles as radio cards drawn with the
 * studio's own brand kit and the sample quote — Letter, Scope, Form, Presentation — each with a Preview. Preview turns the
 * SAME dialog into the design's pages at reading size, with arrow_back and the "Choose a ready-made design /" crumb in the
 * head (the text templates modal's New Template head, 1238:33173) — owner 2026-09-18: "have back on the header like we do
 * it in the other modals which has back so that there is no ui jump and both has the same modal sizes". A name, Create.
 * The xl 1200 modal with 220-wide pages in 300-tall wells. The studio's three reference quotes are the first three.
 */
export function HouseStyleDialog({ open, brand, sample, onClose, onCreate, nested, onRecreate, createLabel = 'Create template' }: { open: boolean; brand: BrandKit; sample: DocData; onClose: () => void; onCreate: (key: PresetKey, name: string) => void; nested?: boolean; onRecreate?: () => void; createLabel?: string }) {
  const [key, setKey] = useState<PresetKey>('letter')
  const [name, setName] = useState('')
  const [touched, setTouched] = useState(false)
  const [previewKey, setPreviewKey] = useState<PresetKey | null>(null)
  const [pages, setPages] = useState<Record<string, number>>({})
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setPreviewKey(null) }   // reopen on the cards
  const designs = useMemo(() => Object.fromEntries(PRESETS.map((p) => [p.key, p.design()])), [])
  const preset = PRESETS.find((p) => p.key === key)!
  const previewed = previewKey ? PRESETS.find((p) => p.key === previewKey)! : null
  const finalName = touched && name.trim() ? name.trim() : preset.name
  const pick = (k: PresetKey) => { setKey(k); if (!touched) setName('') }
  const preview = (k: PresetKey) => { pick(k); setPreviewKey(k) }
  const count = previewed ? pages[previewed.key] : undefined
  return (
    <Dialog open={open} onClose={onClose} size="modal" width={1200} height={HEIGHT} nested={nested}
            title={previewed ? `${previewed.name} design` : 'Choose a ready-made design'}
            eyebrow={previewed ? 'Choose a ready-made design /' : undefined}
            leading={previewed ? <Tooltip label="Back"><IconButton icon="arrow_back" label="Back to designs" size={24} variant="bare" iconSize={24} onClick={() => setPreviewKey(null)} /></Tooltip> : undefined}
            subtitle={previewed
              ? `${previewed.paper}${count ? ` · ${count} page${count === 1 ? '' : 's'}` : ''} · drawn with your brand and a sample quote`
              : 'Four complete designs, drawn with your brand — preview each, change anything after.'}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => onCreate(key, finalName)}>{createLabel}</Button></>}>
      {previewed ? (
        /* (REG-512) The design's every page at 100%, in the same panel — no jump. */
        <TemplatePreviewPages key={previewed.key} paper={previewed.paper} design={designs[previewed.key]!} brand={brand} sample={sample}
                              onPages={(n) => setPages((c) => (c[previewed.key] === n ? c : { ...c, [previewed.key]: n }))} />
      ) : (
        <>
          <div className={styles.grid} role="radiogroup" aria-label="House style">
            {PRESETS.map((p) => (
              <div key={p.key} className={styles.card} data-on={key === p.key || undefined}>
                <button type="button" role="radio" aria-checked={key === p.key} className={styles.pickBtn} onClick={() => pick(p.key)}>
                  <span className={styles.thumb}><span className={styles.page}><TemplateThumb design={designs[p.key]!} brand={brand} data={sample} width={220} /></span></span>
                  <span className={styles.name}>{p.name}<span className={styles.paper}>{p.paper}</span></span>
                  <span className={styles.blurb}>{p.blurb}</span>
                </button>
                {/* (REG-512) Preview selects the card and shows the design at reading size in this dialog. */}
                <button type="button" className={styles.previewBtn} onClick={() => preview(p.key)} aria-label={`Preview ${p.name}`}>
                  <Icon name="visibility" size={18} weight={300} />Preview
                </button>
              </div>
            ))}
          </div>
          <div className={styles.nameRow2}>
            <div className={styles.nameField}><TextField label="Template name" value={touched ? name : preset.name} onChange={(v) => { setTouched(true); setName(v) }} /></div>
            {onRecreate ? <Button appearance="text" iconStart={<Icon name="upload_file" size={20} />} onPress={onRecreate}>Or upload my existing quote</Button> : null}
          </div>
        </>
      )}
    </Dialog>
  )
}
