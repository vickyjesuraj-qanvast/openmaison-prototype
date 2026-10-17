import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line } from '@/components/shell/ghost-kit'
import { EditorHeadGhost } from '@/components/shell/editor-head-ghost'
import styles from './contract-skeleton.module.css'

/**
 * (sweep S2 #22) The contract pages' own ghosts — the quote editor's was drawn for them before. `editor`: the 76 header, the meta row,
 * the formatting bar and the paper; `template`: the contract template editor's (Done in Send's place); `preview`: the bar and the paper;
 * `sign`: the signing page's letterhead bar, the paper and its card (the quote's confirmation link draws the same); `quote`: the quote a
 * signing link shows read-only — the bar and the paper. (REG-708) The editors' header is the editor header's own ghost, and
 * the Outline pane stands at the paper's left from 1025 up, as the page draws it (a drawer below).
 */
export function ContractSkeleton({ kind = 'editor', pdf = false, signed = false }: { kind?: 'editor' | 'template' | 'preview' | 'sign' | 'quote'
  /** (pending modules S03) a PDF contract or standard PDF: no formatting bar or Outline, the PDF's card in the paper's place (PageReveal knows it) */
  pdf?: boolean
  /** (S42 B-19) a signed contract's bar has no Write with AI (PageReveal knows it) */ signed?: boolean }) {
  const editing = (kind === 'editor' || kind === 'template') && !pdf
  const heads = kind === 'editor' || kind === 'template'
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
      <div className={styles.page} data-kind={kind}>
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
    </GhostSheet>
  )
}
