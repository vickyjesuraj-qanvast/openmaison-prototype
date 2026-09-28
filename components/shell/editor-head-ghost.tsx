import { Line, Slot } from './ghost-kit'
import head from '@/components/quotes/editor/editor-header.module.css'

/**
 * (REG-708) The editors' header ghost — the contract editor's and the template libraries' (their LibraryHeader draws the same header) — on
 * the header's own classes (components/quotes/editor/editor-header.module.css): 76 tall, the crumb over the title and its chips, the send
 * group, then the actions — the foldable ones, the kebab, the rule and the close. ≤1024 the foldable ones fold into the kebab and ≤767 the
 * header wraps (title · kebab and close, then Send across), as the real one does.
 */
export function EditorHeadGhost({ crumb = 180, title = 220, chips = [64], status, primary = 67, spans = true, foldable = [] }: {
  crumb?: number; title?: number; chips?: number[]
  /** the status pill before the primary button (the contract's Draft ▾) */
  status?: number
  /** the primary button (Send · Done) */
  primary?: number
  /** the primary spans its row on a phone (the contract's Send, a template's Done); the quote editor's Send ▾ keeps its width */
  spans?: boolean
  /** the actions that fold into the kebab from the tablet down (widths; 36 = an icon) */
  foldable?: number[]
}) {
  return (
    <div className={head.header}>
      <div className={head.titleBlock}>
        <span className={head.crumb}><Line w={crumb} lh={16} h={10} /></span>
        <div className={head.titleRow}><Line w={title} lh={24} h={20} /><span className={head.chips}>{chips.map((w, i) => <Slot key={i} kind="chip" w={w} />)}</span></div>
      </div>
      <span className={head.send}>
        {status ? <Slot kind="btn" w={status} /> : null}
        <span className={head.sendBtn}><Slot kind="btn" w={primary} fill={spans} /></span>
      </span>
      <div className={head.actions}>
        {foldable.map((w, i) => <Slot key={i} kind={w === 36 ? 'icon' : 'btn'} w={w === 36 ? undefined : w} className={head.foldable} />)}
        <Slot kind="icon" />
        <span className={`${head.rule} ${head.foldable}`} />
        <Slot kind="icon" />
      </div>
    </div>
  )
}
