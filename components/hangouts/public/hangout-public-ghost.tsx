import { GhostChips, GhostField, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { GhostLines } from '../ghost-lines'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { DesignerCardGhost } from '@/components/portfolio/designer-card-ghost'
import { AREAS, BUDGET_BANDS, HOME_STATUSES, KEY_TIMES, STYLES, keyLabel } from '@/lib/hangouts/model'
import { MOBILE_HELP } from './public-words'
import sign from '@/components/contracts/sign/signing-page.module.css'
import styles from './public.module.css'

/**
 * (REG-708; pending modules S27) The public pages' ghost — ONE ghost per page, drawn by its loading.tsx and by its PageReveal alike (neither
 * sets the record's words): the studio's letterhead, the event's card (its eyebrow, its title, its line, when · where · the tables), then the
 * booking form — every label and every choice the form always prints in its own words, the shifts as chips — and who they'll meet (the
 * studio's page); or the homeowner's chat with their designer's card (`own`). The page's own classes; data is bars.
 */
export function HangoutPublicGhost({ own = false }: { own?: boolean }) {
  return (
    <GhostSheet label="Loading the page">
      <div className={`${sign.page} ${styles.root}`}>
        <div className={sign.top}><span className={sign.brand}><Bone w={28} h={28} r={4} /><Line w={96} lh={20} h={12} className={sign.studio} /></span></div>
        <div className={styles.body}>
          <div className={styles.column}>
            <div className={styles.card}>
              <Line w={180} lh={16} h={10} className={sign.eyebrow} />
              {own ? <Line w={240} lh={24} h={18} className={sign.cardTitle} /> : <GhostLines className={`${sign.cardTitle} ${styles.ghostLines}`} lh={24} h={18} lines={[330, [110, 'phone']]} />}
              {own ? null : <GhostLines className={`${styles.text} ${styles.ghostLines}`} lines={[500, [120, 'phone']]} />}
              <Facts own={own} />
            </div>
            {own ? <OwnChat /> : <Book />}
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}

/** When (the day, the hours under it) · where (the venue, the address under it) · the tables — the page's facts, their sub-lines its own class */
function Facts({ own }: { own: boolean }) {
  const icon = <span className={styles.factIcon}><Bone w={20} h={20} r={4} /></span>
  return (
    <div className={styles.facts}>
      <span className={styles.fact}>{icon}<span className={styles.factText}><Line w={84} lh={20} h={12} /><Line w={128} lh={20} h={12} className={styles.factSub} /></span></span>
      <span className={styles.fact}>{icon}<span className={styles.factText}><Line w={224} lh={20} h={12} className={styles.placeLink} /><Line w={256} lh={20} h={12} className={styles.factSub} /></span></span>
      {own ? null : <span className={styles.fact}>{icon}<span className={styles.factText}><Line w={160} lh={20} h={12} /></span></span>}
    </div>
  )
}
function Ask({ label, chips }: { label: string; chips: readonly string[] }) {
  return <div className={styles.ask}><Words className={styles.askLabel}>{label}</Words><GhostChips labels={chips} /></div>
}
function Book() {
  return (
    <>
      <div className={styles.card}>
        <Words as="h2" className={styles.sectionTitle}>Book a chat</Words>
        <GhostLines className={`${styles.fine} ${styles.ghostLines}`} lh={16} h={10} lines={[480, [160, 'phone']]} />
        <div className={styles.form}>
          <GhostField />
          <GhostField say={MOBILE_HELP} />
          <GhostField />
          <div className={styles.ask}><Words className={styles.askLabel}>When you’ll come</Words><GhostChips widths={[194, 188]} /></div>
          <GhostField />
          <Ask label="New, resale or already renovated?" chips={HOME_STATUSES} />
          <Ask label="Your budget" chips={BUDGET_BANDS.map((b) => b.label)} />
          <Ask label="Your keys" chips={KEY_TIMES.map((k) => keyLabel(k))} />
          <Ask label="Where it is" chips={AREAS} />
          <Ask label="Styles you like (optional)" chips={STYLES} />
          <span className={styles.consent}><Slot kind="check" /><GhostLines className={styles.ghostLines} lines={[300, [120, 'phone']]} /></span>
          <div className={styles.actions}><Slot kind="btn" w={124} fill /></div>
        </div>
      </div>
      <div className={styles.card}>
        <Words as="h2" className={styles.sectionTitle}>Who you’ll meet</Words>
        <div className={styles.designers}><DesignerCardGhost when /><DesignerCardGhost when /><DesignerCardGhost when /></div>
      </div>
    </>
  )
}
function OwnChat() {
  return (
    <>
      <div className={styles.card}>
        <div className={styles.chat}>
          <Line w={240} lh={24} h={16} className={styles.sectionTitle} />
          <p className={styles.status}><span className={styles.statusIcon}><Bone w={20} h={20} r="50%" /></span><Line w={280} lh={20} h={12} /></p>
          <div className={styles.actions}><Slot kind="btn" w={152} fill /></div>
          <DesignerCardGhost />
        </div>
      </div>
      <span className={styles.contact}><Slot kind="btn" w={180} /></span>
    </>
  )
}
