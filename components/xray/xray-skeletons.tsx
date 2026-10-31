import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { GhostField, GhostHead2, GhostTextButton, Line, phoneOnly, Slot, Words } from '@/components/shell/ghost-kit'
import { DROP_HELP, RECENTS_HEAD, SETUP_WORDS, XRAY_INTRO } from './intro-copy'
import cc from '@/components/om/choice-card.module.css'
import fields from '@/components/leads/move-stage/fields.module.css'
import k from '@/components/shell/ghost-kit.module.css'
import ws from './xray-workspace.module.css'
import { ProLockedGhost } from '@/components/credits/pro-locked-ghost'
import shell from '@/components/shell/skeleton.module.css'
import detail from '@/components/shell/detail-skeleton.module.css'
import styles from './xray-skeletons.module.css'

/**
 * Quote X-Ray's own ghosts (REG-639, parity §8.2 — the checklist's rule that a ghost mirrors its screen; X-Ray borrowed the
 * Leads listing's and Lead Details'). The setup: the header, the intro card, the setup card beside Recent comparisons. The
 * record: the L2 header, then the centred reading column — summary with its three tiles, Say this, key points, the table.
 */
export function XraySetupSkeleton({ scoped = false, intro = true, locked = false }: { scoped?: boolean; /** (sweep S3) the intro card was dismissed — its bone isn't drawn either; (the calm UI build, 6-10) a first run's box, else the page's one line */ intro?: boolean
  /** (pending modules S19) the studio is on Free: the setup card is the lock */ locked?: boolean }) {
  return (
    <GhostSheet label="Loading Quote X-Ray">
      {scoped ? (
        <div className={detail.header}>
          <Bone w={24} h={24} r={4} />
          <div className={detail.titleCol}><Bone w={120} h={12} /><Bone w={132} h={24} /></div>
        </div>
      ) : (
        <div className={shell.header}><Bone w={132} h={28} /></div>
      )}
      <div className={styles.content}>
        {/* (pending modules S19 — REG-708) the intro in the page's own classes and words: its title, the three points, the note and the close —
            the four bars it was drew it 40px short, and every block under it rose at the hand-off */}
        {intro ? (
          <div className={ws.intro} aria-hidden>
            <div className={ws.introText}>
              <Words className={ws.introTitle}>{XRAY_INTRO.title}</Words>
              <ul className={ws.introList}>
                {XRAY_INTRO.points.map(([b, rest]) => <li key={b}><Bone w={18} h={18} r={4} /><span className={k.words}><span className={k.wordBars}><b>{b}</b>{rest}</span></span></li>)}
              </ul>
            </div>
            <Bone w={24} h={24} r={4} />
          </div>
        ) : (
          <div className={ws.lede} aria-hidden><Words>{XRAY_INTRO.lede}</Words><GhostTextButton label={XRAY_INTRO.how} /></div>
        )}
        <div className={styles.columns}>
          {/* (pending modules S21 — REG-708) the setup card in the page's own classes and words: the toggle, the lead (a field, or the page's lead
              with its quote when scoped), the dropzone as the page draws it, the foot — it was drawn 90px taller than the page before a lead */}
          {locked ? <ProLockedGhost feature="quote_xray" /> : <div className={ws.card} aria-hidden>
            <Bone w={256} h={36} r={4} />
            <div className={ws.grid}>
              <div className={ws.side}>
                {scoped ? (
                  <>
                    <span className={ws.lockedLead}><Line w={92} lh={20} /><Line w={84} lh={16} h={10} /></span>
                    <div className={ws.quotes}>
                      <Words className={ws.question}>{SETUP_WORDS.question}</Words>
                      <span className={cc.card}><span className={cc.text}><Line w="64%" lh={20} /><Line w="92%" lh={16} h={10} /><span className={phoneOnly}><Line w="36%" lh={16} h={10} /></span></span><Bone w={20} h={20} r="50%" /></span>
                    </div>
                  </>
                ) : <GhostField />}
              </div>
              <div className={ws.side}>
                <div className={fields.dropzone}><Words className={fields.dropTitle}>{SETUP_WORDS.other}</Words><Words className={fields.dropHelper}>{DROP_HELP}</Words></div>
              </div>
            </div>
            <div className={ws.foot}><Line w={180} lh={20} /><Bone w={94} h={36} r={4} /></div>
          </div>}
          <div className={styles.recents}>
            {/* (the calm UI build) the page's own head, its words as bars; (the close-out round 2026-10-31, C-08) and its ⋮ */}
            <div className={ws.recentsHead}><Words className={ws.recentsTitle}>{RECENTS_HEAD}</Words><Slot kind="icon" /></div>
            {[196, 164, 212, 180].map((w, i) => <div key={i} className={styles.recent}><Bone w={w} h={16} /><Bone w={Math.round(w * 0.6)} h={12} /></div>)}
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}

/** (pending modules S19) A comparison opened on a Free studio: the record's header (no New comparison; the kit's L2 head, which folds to the
    title alone on a phone as PageHeaderL2 does) over the lock. */
export function XrayLockedRecordSkeleton() {
  return (
    <GhostSheet label="Loading comparison">
      <GhostHead2 crumb={96} title={220} chips={[80]} />
      <div className={styles.column}><ProLockedGhost feature="quote_xray" kept="This comparison is kept" /></div>
    </GhostSheet>
  )
}

export function XrayRecordSkeleton() {
  return (
    <GhostSheet label="Loading comparison">
      <div className={detail.header}>
        <Bone w={24} h={24} r={4} />
        <div className={detail.titleCol}>
          <Bone w={96} h={12} />
          <div className={detail.titleRow}><Bone w={220} h={24} /><Line w={72} lh={20} h={10} /></div>
        </div>
        <div className={detail.actions}><Bone w={176} h={40} r={4} /></div>
      </div>
      <div className={styles.column}>
        <div className={styles.card}>
          <Bone w="86%" h={24} />
          <div className={styles.tiles}>{[0, 1, 2].map((i) => <Bone key={i} w="100%" h={88} r={8} />)}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHead}><Bone w={96} h={20} /><Bone w={152} h={40} r={4} /></div>
          {[0, 1, 2].map((i) => <div key={i} className={styles.point}><Bone w={24} h={24} r="var(--om-radius-full)" /><div className={styles.pointBody}><Bone w="94%" h={16} /><Bone w="72%" h={16} /></div><Bone w={24} h={24} r={4} /></div>)}
        </div>
        <div className={styles.card}><Bone w={200} h={20} /><Bone w="100%" h={96} r={8} /><Bone w="100%" h={96} r={8} /></div>
        <div className={styles.card}><Bone w={160} h={20} />{[0, 1, 2, 3, 4, 5].map((i) => <Bone key={i} w="100%" h={44} r={4} />)}</div>
      </div>
    </GhostSheet>
  )
}
