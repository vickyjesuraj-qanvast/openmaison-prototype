import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostField, Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import { EditorHeadGhost } from '@/components/shell/editor-head-ghost'
import page from '@/components/contracts/editor/contract-editor.module.css'
import styles from './library-editor.module.css'

/**
 * (REG-708) The template libraries' editors' ghost — Tasks, T&Cs & Notes, Payments — which drew the quote editor's (its tab strip and
 * General Info card): the editor header (Done, the kebab, close), the name row with what sits at its right (the two Keep switches · the
 * kind · the split), then the one centred card in its own words — Steps, Text or Milestones — and its rows, on the editors' own classes
 * (the steps grid, the milestones grid), so a phone reflows them as it reflows the page. `loading.tsx` and the editor's PageReveal draw
 * the same one.
 */
const CARD = {
  tasks: { title: 'Steps', help: 'Use Template adds these to a lead as open tasks, in this order.' },
  terms: { title: 'Text', help: 'Tokens fill in from the quote when a studio adds this to one.' },
  payments: { title: 'Payments', help: 'Shares of the quote’s total. The first is due on signing; the rest are estimated across the renovation.' },
} as const

export function LibraryEditorGhost({ kind }: { kind: keyof typeof CARD }) {
  const c = CARD[kind]
  return (
    <GhostSheet label="Loading the template">
      <div className={page.page}>
        <EditorHeadGhost crumb={170} title={kind === 'terms' ? 300 : 110} chips={kind === 'terms' ? [110] : []} />   {/* (the calm UI build 2026-10-27, the UI audit's 4-11) the headers keep their standing mark only — the kind of a text */}
        <div className={page.meta}>
          <Line w={kind === 'terms' ? 260 : 90} lh={36} h={14} />
          {kind === 'tasks' ? (
            <div className={`${page.metaEnd} ${styles.switches}`}>
              {['Keep team members', 'Keep descriptions'].map((label) => <span key={label} className={styles.switchRow}><Words>{label}</Words><Slot kind="switch" /></span>)}
            </div>
          ) : kind === 'terms' ? <div className={page.metaEnd}><Slot kind="chip" w={118} /></div> : null}   {/* (4-17) the payment schedule's name row says its name alone */}
        </div>
        <div className={styles.body}>
          <div className={styles.card}>
            <div className={styles.cardHead}><Words className={styles.cardTitle}>{c.title}</Words><Words className={styles.cardHelp}>{c.help}</Words></div>
            <div className={kind === 'terms' ? `${styles.cardBody} ${styles.textEditor}` : styles.cardBody}>
              {kind === 'tasks' ? (
                <>
                  <ol className={styles.steps}>
                    {[0, 1].map((i) => (
                      <li key={i} className={styles.step}>
                        <span className={styles.handle}><Bone w={12} h={16} /></span>
                        <span className={styles.stepNo}><Bone w={8} h={12} /></span>
                        <span className={styles.stepFields}><GhostField size="s" /><GhostField size="s" /></span>
                        <GhostField size="s" />
                        <Slot kind="btn" w={100} />
                        <Slot kind="btn" w={70} />
                        <Slot kind="icon" />
                      </li>
                    ))}
                  </ol>
                  <Slot kind="btn" w={120} />
                </>
              ) : kind === 'terms' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
                  {/* (pending modules S29) the toolbar's end: Write with AI · Insert a field */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{[16, 16, 16, 16, 40, 60, 16].map((w, i) => <Bone key={i} w={w} h={16} />)}<span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}><Slot kind="btn" w={124} /><Slot kind="btn" w={110} /></span></div>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Line key={i} w={cycle(['36%', '22%', '100%', '84%', '26%', '100%', '62%', '30%', '96%'], i)} lh={20} h={10} />)}
                </div>
              ) : (
                <>
                  <div className={styles.bar}><Bone w="100%" h={12} r={6} /></div>
                  <div className={styles.milestones}>
                    <span />{['Payment', 'Description', 'Share', 'Due'].map((h) => <Words key={h} className={styles.mHead}>{h}</Words>)}<span />
                    {[0, 1, 2].map((i) => (
                      <div key={i} className={styles.mRow}>
                        <Bone w={8} h={12} /><GhostField size="s" /><GhostField size="s" /><GhostField size="s" /><Line w={cycle([80, 60, 60], i)} lh={20} h={12} /><Slot kind="icon" />
                      </div>
                    ))}
                  </div>
                  <Slot kind="btn" w={128} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
