'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line, Slot } from '@/components/shell/ghost-kit'
import { useFlagPref } from '@/lib/prefs'
import { ContractSkeleton } from '@/components/contracts/editor/contract-skeleton'
import bar from '@/components/quotes/screen/screen-bar.module.css'
import g from '@/components/quotes/editor/editor-skeleton.module.css'
import cs from '@/components/contracts/editor/contract-skeleton.module.css'
import styles from './template-ghost.module.css'

/*
 * (REG-708 · Contracts on the move, P-10 — 2026-10-22) A contract template's ghost, drawn as the page lands at its width: from 1025 up the
 * desk editor's own (C1's ContractSkeleton, kind "template", unchanged); at ≤1024 the reading screen — the bar, the status row, the clause
 * rows and the two signing rows (a PDF: its picture and Open the PDF) — or, by the address, the Document screen (`?edit=document`: the bar,
 * C2's tool row, the paper) or a section screen (`?edit=fields` · `?edit=gates`: the bar and its rows). The loader streams before the page
 * knows its width, so it ships both and the stylesheet picks (the quote editor's twin, editor-skeleton.module.css). `loading.tsx` and the
 * editor's PageReveal draw the same thing.
 */
export function TemplateGhost({ pdf }: { pdf: boolean }) {
  return (
    <>
      <div className={styles.desk}><ContractSkeleton kind="template" pdf={pdf} /></div>
      <div className={styles.touch}><TouchGhost pdf={pdf} /></div>
    </>
  )
}

/** The route's loader: the shape this browser remembers for the address's template (a PDF one draws its picture — C1's key, S42 B-17). */
export function TemplateRouteGhost() {
  const id = /\/templates\/contracts\/([^/?#]+)/.exec(usePathname() ?? '')?.[1] ?? '_none'
  const [pdf] = useFlagPref(`om.shape.contract-pdf.${id}`, false)
  return <TemplateGhost pdf={pdf} />
}

function TouchGhost({ pdf }: { pdf: boolean }) {
  const edit = useSearchParams().get('edit')
  const shape = edit === 'gates' ? 'gates' : edit === 'fields' && !pdf ? 'fields' : edit === 'document' && !pdf ? 'document' : 'read'
  return (
    <GhostSheet label="Loading template">
      <div className={`${g.page} ${styles.page}`} data-shape={shape} data-testid="template-ghost-touch">
        {shape === 'read' ? <ReadGhost pdf={pdf} /> : shape === 'document' ? <DocumentGhost /> : <SectionGhost rows={shape === 'fields' ? 4 : 2} title={shape === 'fields' ? 120 : 168} />}
      </div>
    </GhostSheet>
  )
}

/** The 56 bar: a leading icon, the title over its line, the trailing controls. */
function BarGhost({ title, sub, trailing }: { title: number; sub: number; trailing: ('icon' | number)[] }) {
  return (
    <div className={`${bar.bar} ${g.bar}`}>
      <span className={bar.ctl}><Slot kind="icon" /></span>
      <div className={bar.text}><Line w={title} lh={24} h={16} /><Line w={sub} lh={20} h={12} /></div>
      <div className={bar.trailing}>{trailing.map((t, i) => (t === 'icon' ? <span key={i} className={bar.ctl}><Slot kind="icon" /></span> : <Slot key={i} kind="btn" w={t} />))}</div>
    </div>
  )
}

function ReadGhost({ pdf }: { pdf: boolean }) {
  const row = (t: number, s: number, i: number) => (
    <div key={i} className={g.row}><div className={g.heroText}><Line w={t} lh={24} h={16} /><Line w={`${s}%`} lh={20} h={12} /><Line w={`${s - 24}%`} lh={20} h={12} /></div><Slot kind="icon" /></div>
  )
  return (
    <>
      <BarGhost title={210} sub={110} trailing={['icon']} />
      <div className={g.screenBody}>
        <div className={g.next}><Slot kind="icon" /><div className={g.heroText}><Line w="92%" lh={24} h={14} /><Line w="40%" lh={24} h={14} /></div></div>
        {pdf ? (
          <div className={styles.pdf}><Bone w="100%" h={420} r={4} /><Bone w="100%" h={48} r={4} /><Line w="90%" lh={20} h={12} /><Line w="70%" lh={20} h={12} /></div>
        ) : (
          <div className={styles.rows}>{([[220, 88], [150, 92], [130, 84], [110, 90], [124, 80], [168, 86]] as [number, number][]).map(([t, s], i) => row(t, s, i))}</div>
        )}
        <div className={styles.rows}>{pdf ? row(168, 70, 0) : [row(120, 80, 0), row(168, 70, 1)]}</div>
      </div>
    </>
  )
}

function DocumentGhost() {
  return (
    <>
      <BarGhost title={84} sub={150} trailing={['icon', 52]} />
      <div className={cs.toolRow}>{[0, 1, 2, 3, 4, 5, 6].map((i) => <Slot key={i} kind="icon" />)}</div>
      <div className={g.sectionBody}>
        <div className={cs.paper}><Bone w="55%" h={24} />{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w={i % 3 === 2 ? '70%' : '100%'} h={14} />)}</div>
      </div>
    </>
  )
}

function SectionGhost({ rows, title }: { rows: number; title: number }) {
  return (
    <>
      <BarGhost title={title} sub={180} trailing={[]} />
      <div className={g.screenBody}>
        <div className={cs.rowList}>{Array.from({ length: rows }, (_, i) => <div key={i} className={cs.ghostRow}><div className={g.heroText}><Line w={120 + (i % 2) * 40} lh={24} h={16} /><Line w={180} lh={20} h={12} /></div><Slot kind={rows === 4 ? 'btn' : 'switch'} {...(rows === 4 ? { w: 64 } : {})} /></div>)}</div>
        <Line w="86%" lh={20} h={12} />
      </div>
    </>
  )
}
