'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Checkbox, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { isRefusal } from '@/lib/company/template-rules'
import { removeStudioFont, restoreStudioFont, uploadStudioFont } from '@/app/company/font-actions'
import { faceAlias, FONT_FAMILIES, fontStack, type FontFace } from '@/lib/templates/model'
import type { StudioFontRow } from '@/lib/company/studio-fonts'
import { cleanFamily, FONT_ACCEPT, FONT_FAMILY_NEEDED, FONT_FAMILY_TAKEN, FONT_LICENCE_NEEDED, FONT_MAX_BYTES, FONT_NOT_A_FONT, FONT_TOO_BIG, faceWords, sniffFont, suggestFromFileName, WEIGHT_WORD } from '@/lib/templates/fonts'
import { fileSizeLabel } from '@/lib/templates/files'
import { displayDate } from '@/lib/format'
import profile from '../profile-view.module.css'
import styles from './brand-fonts.module.css'

const WEIGHTS: FontFace['weight'][] = [400, 600, 700]

/**
 * (pending modules S11 — card held:quote-templates, "fonts a studio uploads"; 1.0's studio_assets type `font`, 2 MB) Brand kit › Fonts ›
 * Your own fonts: the files the studio has uploaded, on the card table (REG-727) — each face with its sample, its file, who added it and where
 * its family is named — Upload a font (a dialog that closes once the file is kept) and Remove with Undo. Their families join every font list.
 */
export function OwnFonts({ fonts: initial, uses, canRun, onFaces }: { fonts: StudioFontRow[]; uses: Record<string, string[]>; canRun: boolean; onFaces: (faces: FontFace[]) => void }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [fonts, setFonts] = useState(initial)
  const [seen, setSeen] = useState(initial)
  if (seen !== initial) { setSeen(initial); setFonts(initial) }   // a refresh brings the server's list (render-phase adjust)
  const [open, setOpen] = useState(false)
  const facesOf = (list: StudioFontRow[]): FontFace[] => list.map(({ id, family, weight, italic, format }) => ({ id, family, weight, italic, format }))
  const put = (list: StudioFontRow[]) => { setFonts(list); onFaces(facesOf(list)) }

  const remove = async (f: StudioFontRow) => {
    const before = fonts
    put(fonts.filter((x) => x.id !== f.id))
    const lastOfFamily = !before.some((x) => x.id !== f.id && x.family.toLowerCase() === f.family.toLowerCase())
    const named = lastOfFamily ? uses[f.family.toLowerCase()] ?? [] : []
    try {
      const r = await removeStudioFont({ id: f.id })
      if (isRefusal(r)) { put(before); snackbar({ message: couldnt('remove the font', refusalOf(r.error)) }); return }   // the value goes back when refused
      snackbar({
        message: `${f.family} ${faceWords(f).toLowerCase()} removed${named.length ? ` — ${named.join(', ')} ${named.length === 1 ? 'prints' : 'print'} in a standard font until it is back` : ''}`,
        actionLabel: 'Undo',
        onAction: () => { void restoreStudioFont({ id: f.id }).then((u) => { if (isRefusal(u)) { snackbar({ message: couldnt('put the font back', refusalOf(u.error)) }); return } put([...before]); router.refresh() }) },
      })
      router.refresh()
    } catch { put(before); snackbar({ message: couldnt('remove the font') }) }
  }

  return (
    <div className={styles.own} data-testid="own-fonts">
      <div className={styles.ownHead}>
        <h3 className={profile.subTitle}>Your own fonts</h3>
        {canRun ? <span className={styles.ownAction}><Button appearance="text" iconStart={<Icon name="upload" size={20} />} onPress={() => setOpen(true)} data-testid="font-upload-open">Upload a font</Button></span> : null}
      </div>
      <p className={profile.cardHelp}>Fonts the studio has the licence for. They join the font lists here and in the template editor, and every quote set in them prints in them. Upload each weight as its own file under the same name.</p>
      {fonts.length ? (
        <div className={styles.table} role="table" aria-label="Your own fonts" data-card-table="">
          <div className={styles.head} role="row">
            <span role="columnheader">Font</span><span role="columnheader">File</span><span role="columnheader">Used in</span><span role="columnheader" className={styles.actionsHead} />
          </div>
          {fonts.map((f) => {
            const named = uses[f.family.toLowerCase()] ?? []
            return (
              <div key={f.id} className={styles.row} role="row" data-testid="own-font" data-family={f.family}>
                <span role="cell" className={styles.font}>
                  <span className={styles.sample} style={{ fontFamily: `"${faceAlias(f)}", ${fontStack(f.family)}` }} aria-hidden>Aa</span>
                  <span className={styles.fontText}><Tooltip label={f.family} whenCut><span className={styles.fontName}>{f.family}</span></Tooltip><span className={styles.meta}>{faceWords(f)}</span></span>
                </span>
                <span role="cell" className={styles.file}><Tooltip label={f.fileName} whenCut><span className={styles.fileName}>{f.fileName}</span></Tooltip><span className={styles.meta}>{fileSizeLabel(f.size)}{f.by ? ` · added by ${f.by.name}` : ''} · {displayDate(new Date(f.createdAt))}</span></span>
                <span role="cell" className={styles.meta} data-label="Used in">{named.length ? named.join(', ').replace(/^./, (c) => c.toUpperCase()) : 'Not used yet'}</span>
                <span role="cell" className={styles.actions}>
                  {canRun ? <Tooltip label="Remove"><IconButton icon="delete" label={`Remove ${f.family} ${faceWords(f).toLowerCase()}`} size={36} variant="bare" iconSize={20} onClick={() => { void remove(f) }} /></Tooltip> : null}
                </span>
              </div>
            )
          })}
        </div>
      ) : <p className={styles.none} data-testid="own-fonts-none">None yet.</p>}
      <UploadFontDialog open={open} onClose={() => setOpen(false)} families={[...new Set(fonts.map((f) => f.family))]}
                        onUploaded={(row) => { put([...fonts.filter((x) => !(x.family.toLowerCase() === row.family.toLowerCase() && x.weight === row.weight && x.italic === row.italic)), row]); setOpen(false); snackbar({ message: `${row.family} ${faceWords(row).toLowerCase()} uploaded — it is in the font lists now` }); router.refresh() }} />
    </div>
  )
}

type Picked = { file: File; dataUrl: string; format: FontFace['format'] }

/** Upload a font: the file, its name in the lists, its weight and italic, the licence tick; a sample in the face itself. */
function UploadFontDialog({ open, onClose, families, onUploaded }: { open: boolean; onClose: () => void; families: string[]; onUploaded: (row: StudioFontRow) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [family, setFamily] = useState('')
  const [weight, setWeight] = useState<FontFace['weight']>(400)
  const [italic, setItalic] = useState(false)
  const [licensed, setLicensed] = useState(false)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [sampleFamily, setSampleFamily] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {   // every opening starts empty (render-phase adjust)
    setWasOpen(open)
    if (open) { setPicked(null); setFileError(null); setFamily(''); setWeight(400); setItalic(false); setLicensed(false); setTried(false); setBusy(false); setServerError(null); setSampleFamily(null) }
  }
  /* the sample draws in the picked file itself, loaded into the page under a name of its own */
  useEffect(() => {
    if (!picked || typeof FontFace === 'undefined') return
    let on = true
    const name = `om-font-sample-${Math.random().toString(36).slice(2, 8)}`
    const face = new FontFace(name, `url(${picked.dataUrl})`)
    void face.load().then((f) => { if (!on) return; document.fonts.add(f); setSampleFamily(name) }).catch(() => { if (on) setSampleFamily(null) })
    return () => { on = false; try { document.fonts.delete(face) } catch { /* never added */ } }
  }, [picked])

  const take = async (f: File | undefined) => {
    if (!f) return
    setServerError(null)
    if (f.size > FONT_MAX_BYTES) { setPicked(null); setFileError(FONT_TOO_BIG); return }
    const head = new Uint8Array(await f.slice(0, 4).arrayBuffer())
    const format = sniffFont(head)
    if (!format) { setPicked(null); setFileError(FONT_NOT_A_FONT); return }
    const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f) })
    setFileError(null)
    setPicked({ file: f, dataUrl, format })
    const s = suggestFromFileName(f.name)
    setFamily((cur) => cur || s.family); setWeight(s.weight); setItalic(s.italic)
  }

  const name = cleanFamily(family)
  const nameError = !name ? FONT_FAMILY_NEEDED : (FONT_FAMILIES as readonly string[]).some((x) => x.toLowerCase() === name.toLowerCase()) ? FONT_FAMILY_TAKEN : null
  const ready = !!picked && !nameError && licensed
  const submit = async () => {
    setTried(true)
    if (!picked) { setFileError((e) => e ?? 'Choose the font file.'); return }
    if (!ready) return
    setBusy(true); setServerError(null)
    try {
      const r = await uploadStudioFont({ family: name, weight, italic, fileName: picked.file.name, dataUrl: picked.dataUrl, licensed })
      if (isRefusal(r)) { setServerError(r.error); return }   // said in the dialog; what was typed stays
      onUploaded({ ...r.face, fileName: picked.file.name, size: picked.file.size, createdAt: Date.now(), by: null })
    } catch { setServerError('Couldn’t upload the font — please try again') }
    finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Upload a font" size="form" width={600} closeOnScrim={false}
            subtitle="A font the studio has the licence for. It joins every font list in the brand kit and the template editor."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void submit() }} isDisabled={busy} data-testid="font-upload-submit">{busy ? 'Uploading…' : 'Upload'}</Button></>}>
      <div className={styles.form} data-testid="font-upload-dialog">
        <div className={styles.fileRow}>
          {picked ? (
            <span className={styles.picked} data-testid="font-upload-file"><Icon name="text_fields" size={24} weight={300} /><span className={styles.fileText}><span className={styles.fileName}>{picked.file.name}</span><span className={styles.meta}>{fileSizeLabel(picked.file.size)}</span></span></span>
          ) : <span className={styles.meta}>WOFF2, WOFF, TTF or OTF, up to 2 MB.</span>}
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="upload" size={20} />} onPress={() => input.current?.click()}>{picked ? 'Choose another' : 'Choose a font file'}</Button>
          <input ref={input} type="file" accept={FONT_ACCEPT} hidden data-testid="font-upload-input" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void take(f) }} />
        </div>
        {fileError ? <p className={styles.error} role="alert">{fileError}</p> : null}
        <TextField label="Font name" value={family} onChange={(v) => { setFamily(v); setServerError(null) }} maxLength={40} helper={families.length ? `Use the same name to add a weight to ${families[0]}${families.length > 1 ? ' or another of yours' : ''}` : 'How it reads in the font lists'} error={tried ? nameError ?? undefined : undefined} />
        <div className={styles.pair}>
          <TextField label="Weight" value={WEIGHT_WORD[weight]} mode="select" options={WEIGHTS.map((w) => WEIGHT_WORD[w])} onChange={(v) => setWeight(WEIGHTS.find((w) => WEIGHT_WORD[w] === v) ?? 400)} />
          <label className={`${profile.switchRow} ${styles.italic}`}><Switch size="sm" isSelected={italic} onChange={(v: boolean) => setItalic(v)} aria-label="Italic" /><span>Italic</span></label>
        </div>
        {picked ? (
          <div className={styles.preview} aria-label="Sample">
            <span className={styles.previewText} style={{ fontFamily: sampleFamily ? `"${sampleFamily}", sans-serif` : undefined }} data-testid="font-upload-sample" data-ready={sampleFamily ? '' : undefined}>Aa Bb Cc — Quotation S$12,480.00</span>
          </div>
        ) : null}
        <label className={styles.licence} data-error={tried && !licensed ? '' : undefined}>
          <Checkbox isSelected={licensed} onChange={(on: boolean) => setLicensed(on)} aria-label="The studio has the licence to use this font in the documents it sends" />
          <span>The studio has the licence to use this font in the documents it sends to clients</span>
        </label>
        {tried && !licensed ? <p className={styles.error} role="alert">{FONT_LICENCE_NEEDED}</p> : null}
        {serverError ? <p className={styles.error} role="alert">{serverError}</p> : null}
      </div>
    </Dialog>
  )
}
