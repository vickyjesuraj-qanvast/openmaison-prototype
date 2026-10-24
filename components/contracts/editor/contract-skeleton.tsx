'use client'

import { useSearchParams } from 'next/navigation'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line, Slot } from '@/components/shell/ghost-kit'
import { EditorHeadGhost } from '@/components/shell/editor-head-ghost'
import bar from '@/components/quotes/screen/screen-bar.module.css'
import g from '@/components/quotes/editor/editor-skeleton.module.css'
import qp from '@/components/quotes/preview/quote-preview.module.css'
import pk from '@/components/quotes/preview/preview-skeleton.module.css'
import styles from './contract-skeleton.module.css'

/**
 * (sweep S2 #22) The contract pages' own ghosts — the quote editor's was drawn for them before. `editor`: the 76 header, the meta row,
 * the formatting bar and the paper; `template`: the contract template editor's (Done in Send's place); `preview`: the bar and the paper;
 * `sign`: the signing page's letterhead bar, the paper and its card (the quote's confirmation link draws the same); `quote`: the quote a
 * signing link shows read-only — the bar and the paper. (REG-708) The editors' header is the editor header's own ghost, and
 * the Outline pane stands at the paper's left from 1025 up, as the page draws it (a drawer below).
 * (Contracts on the move, P-01 · P-02 · P-03 — 2026-10-22) At ≤1024 `editor` is the Contract screen, the section list or a section screen, by
 * the address (`?edit=`), and `preview` is the one-line bar over the reflowed paper (or the viewer, `?paper=1`): the ghost draws that shape —
 * the loader (streamed, so it ships both and the stylesheet picks by width) and the reveal alike, as REG-708 asks. The sign, quote and
 * template ghosts are as they were.
 */
export function ContractSkeleton({ kind = 'editor', pdf = false, signed = false }: { kind?: 'editor' | 'template' | 'preview' | 'sign' | 'quote'
  /** (pending modules S03) a PDF contract or standard PDF: no formatting bar or Outline, the PDF's card in the paper's place (PageReveal knows it) */
  pdf?: boolean
  /** (S42 B-19) a signed contract's bar has no Write with AI (PageReveal knows it) */ signed?: boolean }) {
  const params = useSearchParams()
  const edit = params.get('edit')
  const paperAsked = params.get('paper') === '1'
  const editing = (kind === 'editor' || kind === 'template') && !pdf
  const heads = kind === 'editor' || kind === 'template'
  const twin = kind === 'editor' || kind === 'preview'   // the kinds with an on-the-move shape
  const paper = pdf ? (
    <div className={styles.paper} data-pdf="">
      <div className={styles.letterhead}><Line w={220} lh={24} h={14} /><span className={styles.lines}><Bone w={96} h={28} r={4} /></span></div>
      <Bone w="100%" h={720} r={4} />
    </div>
  ) : (
    <div className={styles.paper}>
      <div className={styles.letterhead}><Bone w={120} h={28} r={4} /><span className={styles.lines}><Bone w={180} h={12} /><Bone w={140} h={12} /></span></div>
      <Bone w="55%" h={24} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w={i % 3 === 2 ? '70%' : '100%'} h={14} />)}
    </div>
  )
  return (
    <GhostSheet label={kind === 'sign' ? 'Loading the agreement' : kind === 'quote' ? 'Loading the quote' : 'Loading contract'}>
      <div className={twin ? `${styles.page} ${g.desk}` : styles.page} data-kind={kind}>
        {kind === 'sign' || kind === 'quote' ? (
          <div className={styles.signTop}><Bone w={177} h={28} />{kind === 'quote' ? <Bone w={180} h={20} /> : <Bone w={107} h={28} r={14} />}</div>
        ) : heads ? (
          kind === 'editor' ? <EditorHeadGhost crumb={196} title={230} chips={[90]} status={89} primary={67} foldable={[86, 36, 36]} />
            : <EditorHeadGhost crumb={170} title={262} chips={[62, 104]} primary={67} />
        ) : (
          <div className={styles.header}>
            <div className={styles.titleCol}><Bone w={250} h={12} /><div className={styles.titleRow}><Bone w={220} h={24} /><Bone w={44} h={20} r={4} /></div></div>
            <div className={styles.actions}><Bone w={96} h={36} r={4} /><Bone w={36} h={36} r={4} /><Bone w={36} h={36} r={4} /><Bone w={67} h={36} r={4} /></div>
          </div>
        )}
        {heads ? (
          <>
            <div className={styles.meta}><Line w={kind === 'editor' ? 180 : 230} lh={36} h={14} /><span className={styles.metaEnd}>{kind === 'editor' ? <><span className={styles.mRec}><Bone w="100%" h={36} r={4} style={{ height: '100%' }} /></span><span className={styles.mQuote}><Bone w="100%" h={36} r={4} style={{ height: '100%' }} /></span><span className={styles.mDate}><Bone w="100%" h={36} r={4} style={{ height: '100%' }} /></span></> : <Line w={100} lh={20} h={12} />}</span></div>
            {/* (pending modules S29) the bar's end: Write with AI, then Insert a field · eSignatures */}
            {editing ? <div className={styles.bar}>{[56, 96, 120, 60, 88, 36].map((w, i) => <Bone key={i} w={w} h={24} r={4} />)}<span className={styles.barEnd}>{signed ? null : <Bone w={124} h={28} r={4} />}<Bone w={110} h={28} r={4} /></span></div> : null}
          </>
        ) : null}
        <div className={styles.stage} data-outline={editing || undefined}>
          {editing ? <div className={styles.outline}><Line w={64} lh={48} h={12} />{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => <Line key={i} w={i === 0 ? '88%' : `${[48, 40, 34, 44, 38, 56, 62, 46, 40, 36, 60][(i - 1) % 11]}%`} lh={30} h={10} />)}</div> : null}
          {heads ? <div className={styles.paperWrap}>{paper}</div> : paper}
          {kind === 'sign' ? <div className={styles.card}><Bone w={120} h={12} /><Bone w="80%" h={24} /><Bone w="100%" h={48} r={4} /><Bone w={120} h={36} r={4} /></div> : null}
        </div>
      </div>
      {kind === 'editor' ? (
        <div className={`${g.page} ${g.touch}`} data-shape={edit === null || signed ? 'read' : edit === '1' ? 'list' : edit} data-testid="contract-ghost-touch">
          {edit === null || signed ? <ReadGhost pdf={pdf} signed={signed} /> : edit === 'document' ? <SectionGhost k={edit} pdf={pdf} /> : (
            /* (responsive audit 2026-10-23, W5-13) a landscape tablet: the 300 list pane and the open section (Details while none is
               picked), as the page; the Document screen stays whole */
            <div className={g.split} data-open={edit === '1' ? 'list' : 'section'} style={{ '--list-pane': '300px' } as React.CSSProperties}>
              <div className={g.splitPane}><ListGhost /></div>
              <div className={g.splitMain}><SectionGhost k={edit === '1' ? 'details' : edit} pdf={pdf} /></div>
            </div>
          )}
        </div>
      ) : kind === 'preview' ? (
        <div className={`${g.page} ${g.touch}`} data-shape={paperAsked ? 'paper' : 'page'} data-testid="contract-ghost-touch"><PreviewGhost pdf={pdf} paper={paperAsked} /></div>
      ) : null}
    </GhostSheet>
  )
}

/** The 56 bar: a leading icon, the title over its line, the trailing controls. */
function BarGhost({ title = 150, sub = 190, trailing = ['icon'] as ('icon' | number)[] }: { title?: number; sub?: number; trailing?: ('icon' | number)[] }) {
  return (
    <div className={`${bar.bar} ${g.bar}`}>
      <span className={bar.ctl}><Slot kind="icon" /></span>
      <div className={bar.text}><Line w={title} lh={24} h={16} />{sub ? <Line w={sub} lh={20} h={12} /> : null}</div>
      <div className={bar.trailing}>{trailing.map((t, i) => (t === 'icon' ? <span key={i} className={bar.ctl}><Slot kind="icon" /></span> : <Slot key={i} kind="btn" w={t} />))}</div>
    </div>
  )
}

/** (P-01) The Contract screen's shape: the hero with its two rows and the client, the Next line, the document's cards, the folds, the foot. */
function ReadGhost({ pdf, signed }: { pdf: boolean; signed: boolean }) {
  return (
    <>
      <BarGhost />
      <div className={g.screenBody}>
        <div className={g.hero}>
          <div className={g.heroTop}><Slot kind="btn" w={89} /><Line w={96} lh={20} h={12} /></div>
          {signed ? <Line w={220} lh={20} h={12} /> : null}
          <div className={styles.heroRow}><Slot kind="icon" /><Line w={88} lh={20} h={12} /><Line w={72} lh={24} h={14} /></div>
          <div className={styles.heroRow}><Slot kind="icon" /><Line w={150} lh={24} h={14} /><Slot kind="chip" w={64} /></div>
          <div className={g.heroClient}><Slot kind="avatar40" /><div className={g.heroText}><Line w={130} lh={24} h={14} /><Line w={96} lh={20} h={12} /></div><Slot kind="icon" /><Slot kind="icon" />{signed ? null : <Slot kind="icon" />}</div>
        </div>
        <div className={g.next}><Slot kind="icon" /><div className={g.heroText}><Line w="92%" lh={24} h={14} /><Line w="60%" lh={24} h={14} /></div></div>
        <div className={g.docHead}><Line w={64} lh={20} h={12} /><Slot kind="btn" w={110} /></div>
        {pdf ? <Bone w="100%" h={240} r={8} /> : (
          <>
            <div className={g.fold} data-open>
              <div className={g.foldHead}><Line w={200} lh={24} h={14} /><Slot kind="icon" /></div>
              {[0, 1, 2, 3].map((i) => <Line key={i} w={i === 3 ? '58%' : '100%'} lh={24} h={14} />)}
            </div>
            {[150, 110, 130, 96].map((w, i) => <div key={i} className={g.fold}><div className={g.foldHead}><Line w={w} lh={24} h={14} />{i === 3 ? <Line w={120} lh={20} h={12} /> : null}<Slot kind="icon" /></div></div>)}
          </>
        )}
        {([[120, 160], [168, 140], [84, 40], [60, 100], [64, 120]] as [number, number][]).map(([t, s], i) => <div key={i} className={g.fold}><div className={g.foldHead}><div className={g.heroText}><Line w={t} lh={24} h={14} /><Line w={s} lh={20} h={12} /></div><Slot kind="icon" /></div></div>)}
      </div>
      <div className={g.foot}>{signed ? null : <Bone w="100%" h={48} r={4} />}<Bone w="100%" h={48} r={4} /></div>
    </>
  )
}

/** (P-02) The section list's shape: six rows. */
function ListGhost() {
  return (
    <>
      <BarGhost title={112} sub={190} trailing={[52]} />
      <div className={g.rows}>
        {([[60, 230], [84, 200], [120, 150], [168, 160], [88, 180], [40, 150]] as [number, number][]).map(([t, s], i) => (
          <div key={i} className={g.row}><div className={g.heroText}><Line w={t} lh={24} h={14} /><Line w={s} lh={20} h={12} /></div><Slot kind="icon" /></div>
        ))}
      </div>
    </>
  )
}

/** (P-02 · P-03) A section screen's shape: Details' five fields, the Document screen's tool row and paper, the others' rows. */
function SectionGhost({ k, pdf }: { k: string; pdf: boolean }) {
  const title = { details: 60, document: 84, fields: 120, gates: 168, automation: 88, files: 40 }[k] ?? 100
  if (k === 'document') {
    return (
      <>
        <BarGhost title={title} sub={150} trailing={pdf ? [52] : ['icon', 52]} />
        {pdf ? <div className={g.sectionBody}><Bone w="100%" h={240} r={8} /></div> : (
          <>
            <div className={styles.toolRow}>{[0, 1, 2, 3, 4, 5, 6].map((i) => <Slot key={i} kind="icon" />)}</div>
            <div className={g.sectionBody}>
              <div className={styles.paper}><Bone w="55%" h={24} />{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w={i % 3 === 2 ? '70%' : '100%'} h={14} />)}</div>
            </div>
          </>
        )}
      </>
    )
  }
  const rows = k === 'details' ? 0 : k === 'fields' ? 4 : k === 'gates' ? 2 : k === 'automation' ? 2 : 1
  return (
    <>
      <BarGhost title={title} sub={160} trailing={[]} />
      <div className={g.sectionBody}>
        {k === 'details' ? [0, 1, 2, 3, 4].map((i) => <Bone key={i} w="100%" h={48} r={4} />)
          : <div className={styles.rowList}>{Array.from({ length: rows }, (_, i) => <div key={i} className={styles.ghostRow}><div className={g.heroText}><Line w={120 + (i % 2) * 40} lh={24} h={14} /><Line w={180} lh={20} h={12} /></div><Slot kind={k === 'fields' ? 'btn' : 'switch'} {...(k === 'fields' ? { w: 64 } : {})} /></div>)}</div>}
      </div>
    </>
  )
}

/** (P-01) The Preview's shape on the move: the one-line bar, a phone's "Paper" row over the reflowed paper and its foot — or the viewer (`?paper=1`); a tablet's paper at 1:1. */
function PreviewGhost({ pdf, paper }: { pdf: boolean; paper: boolean }) {
  const sheet = (
    <div className={styles.paper}>
      <div className={styles.letterhead}><Bone w={120} h={28} r={4} /><span className={styles.lines}><Bone w={180} h={12} /><Bone w={140} h={12} /></span></div>
      <Bone w="55%" h={24} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w={i % 3 === 2 ? '70%' : '100%'} h={14} />)}
    </div>
  )
  return (
    <div className={styles.previewTouch} data-paper={paper || undefined}>
      <header className={qp.touchBar}>
        <Slot kind="icon" />
        <div className={qp.touchTitle}><Line w={78} lh={24} h={16} /><Line w={190} lh={20} h={12} /></div>
        <Slot kind="icon" />
        <span className={pk.tabletOnly}><Slot kind="btn" w={67} /></span>
        <Slot kind="icon" />
      </header>
      <div className={qp.body}>
        <div className={qp.column}>
          {pdf ? null : <div className={`${qp.readHead} ${pk.phoneOnly}`}><Line w={140} lh={20} h={12} /><Line w={80} lh={36} h={14} /></div>}
          <div className={styles.previewStage}>{pdf ? <Bone w="100%" h={240} r={8} /> : sheet}</div>
        </div>
      </div>
      <div className={`${qp.foot} ${pk.phoneOnly}`}><Bone w="100%" h={48} r={4} /></div>
      {paper && !pdf ? (
        <div className={`${pk.viewer} ${pk.phoneOnly}`} aria-hidden>
          <div className={pk.viewerHead}><Slot kind="icon" /><span className={pk.viewerTitle}><Line w={60} lh={24} h={20} /><Line w={190} lh={16} h={10} /></span><Slot kind="icon" /></div>
          <div className={pk.viewerBody}><div className={`${pk.sheet} ${pk.viewerSheet}`}>
            <div className={pk.letterhead}><Bone w={120} h={32} r={4} /><span className={pk.lines}><Bone w={160} h={12} /><Bone w={120} h={12} /></span></div>
            <Bone w="45%" h={20} />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <Bone key={i} w="100%" h={14} />)}
          </div></div>
          <div className={pk.dotsRow}><Line w={236} lh={28} h={10} /></div>
        </div>
      ) : null}
    </div>
  )
}
