import type { ReactNode } from 'react'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line, Words } from '@/components/shell/ghost-kit'
import { PORTAL_TABS, portalBar } from '@/lib/portal/model'
import { PortalFootGhost } from './portal-foot'   // (pending modules S13)
import styles from './portal.module.css'
import choices from './choices/choices.module.css'
import project from './project/project.module.css'

/*
 * (Projects round 4a, REG-708) The portal's ghosts — one per page, drawn by its loading.tsx and handed to its PageReveal, each on the page's
 * own classes (portal.module.css): the studio's bar, Hello, the cards. A loader can't know the studio's colour, so the marks are bones.
 */

/** (r4b: exported for the project tabs' ghosts; its sections follow `PORTAL_TABS`, so the ghost's bar has as many as the page's) */
export function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <GhostSheet label={label}>
      <div className={styles.page} aria-hidden>
        {/* (fix-F, F-42) the bar as the page draws it: the studio's mark a plain bone (a logo sits on white — never a solid colour block), the
            sections, then the bell's glyph, the name and Sign out as text (it goes to More on a phone, data-dock) */}
        <header className={styles.top} data-dock="">
          <span className={styles.brand}><Bone w={36} h={36} r={8} /><Line w={112} lh={24} h={16} /></span>
          <span className={styles.navWrap}><span className={styles.nav}>{PORTAL_TABS.map((t) => <Line key={t.key} w={t.label.length * 7 + 2} lh={64} />)}</span></span>
          <span className={styles.who}><span className={styles.ghostBell}><Bone w={20} h={20} r={4} /></span><Line w={110} className={styles.whoName} /><Line w={56} lh={36} className={styles.signOutTop} /></span>
        </header>
        <main className={styles.main}>{children}<PortalFootGhost /></main>
        {/* (REG-1050) the phone's bar as the page draws it: four tabs and More */}
        <nav className={styles.dock}>{[...portalBar(PORTAL_TABS).bar.map((t) => t.key), 'more'].map((k) => <span key={k} className={styles.dockLink}><span className={styles.dockIcon}><Bone w={24} h={24} r={12} /></span><Bone w={32} h={10} /></span>)}</nav>
      </div>
    </GhostSheet>
  )
}

const Hello = ({ title, lede }: { title: number; lede: string }) => (
  <div className={styles.hello}><Line w={title} lh={36} h={24} /><Line w={lede} lh={24} h={14} /></div>
)

function NeedsGhost({ rows }: { rows: number }) {
  return (
    <section className={`${styles.card} ${styles.needs}`} data-slot="needs">
      <div className={styles.h2}><Line w={170} lh={24} h={16} /></div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.need}>
          <Bone w={40} h={40} r={20} />
          <span className={styles.needText}><Line w={[240, 210, 190][i % 3]!} /><Line w={[180, 150, 200][i % 3]!} lh={16} h={10} /></span>
          <Bone w={120} h={40} r={4} className={styles.needAction} />
        </div>
      ))}
    </section>
  )
}

/** Home: Hello, What needs you, the home's card and the line to the designer. */
export function PortalHomeGhost() {
  return (
    <Frame label="Loading your page">
      <Hello title={240} lede="62%" />
      <div className={`${styles.cols} ${project.homeOrder}`}>
        <div className={styles.colMain}><NeedsGhost rows={1} /></div>
        <div className={styles.colSide}>
          {/* (fix-F, F-42) where the work stands as the page draws it — on a phone its title, the bar of stages and its line; at a desk its
              head with the Schedule link and a row per stage — then the Money card */}
          <section className={project.stands} data-slot="stands">
            <div className={project.standsPhone}><Line w={200} lh={24} h={16} /><Bone w="100%" h={8} r={4} /><Line w="80%" /></div>
            <div className={project.standsDesk}>
              <div className={project.standsHead}><Line w={150} lh={24} h={16} /><Line w={64} /></div>
              <ul className={project.standsList}>{[180, 150, 200, 170, 120, 160, 190].map((w, i) => <li key={i} className={project.standsRow}><Bone w={12} h={12} r={6} /><Line w={w} lh={20} h={12} /></li>)}</ul>
            </div>
          </section>
          <section className={`${styles.card} ${styles.cardPad}`} data-slot="money"><Line w={90} lh={16} h={10} /><Line w={220} lh={32} h={20} /><Bone w="100%" h={8} r={4} /><Line w={180} /></section>
          <Line w={260} />
        </div>
      </div>
    </Frame>
  )
}

/** Files: the title, the documents card, the shared files' tiles. */
export function PortalFilesGhost() {
  return (
    <Frame label="Loading your files">
      <div className={styles.hello}><Words as="h2" className={styles.h1}>Files</Words><Line w={260} lh={24} h={14} /></div>
      <section className={styles.card}>
        <div className={styles.cardPad}><Words as="h2" className={styles.h3}>Documents</Words></div>
        {[0, 1].map((i) => (
          <div key={i} className={styles.row}><span className={styles.rowLead}><Bone w={40} h={40} r={4} /><span className={styles.rowText}><Line w={[260, 220][i]!} /><Line w={120} lh={16} h={10} /></span></span><Bone w={40} h={20} /></div>
        ))}
      </section>
      <section className={styles.card}>
        <div className={styles.cardPad}><Line w={160} lh={24} h={16} /></div>
        {/* (parity map, CP-099) the kind's heading over its tiles */}
        <div className={styles.docGroup}><Line w={84} lh={16} h={10} /></div>
        <div className={styles.tiles}>{[0, 1].map((i) => <span key={i} className={styles.tile}><span className={styles.tileBox} /><span className={styles.tileText}><Line w="80%" /><Line w={80} lh={16} h={10} /></span></span>)}</div>
      </section>
    </Frame>
  )
}

/** The questions: the title, the lede, a card per question with its field. */
export function PortalQuestionsGhost() {
  return (
    <Frame label="Loading the questions">
      <div className={styles.hello}><Words as="h2" className={styles.h1}>Tell us about your home</Words><Line w="58%" lh={24} h={14} /></div>
      <div className={styles.questions}>
        {[0, 1, 2].map((i) => (
          <section key={i} className={`${styles.card} ${styles.question}`}><Line w={110} lh={16} h={10} /><Line w={[320, 280, 360][i]!} lh={24} h={14} /><Bone w="100%" h={48} r={4} /></section>
        ))}
      </div>
    </Frame>
  )
}

/** Sign-in (board 5): the mark, the title, the line, the field and the button, the foot. */
export function PortalSignInGhost() {
  return (
    <GhostSheet label="Loading">
      <div className={`${styles.page} ${styles.signinPage}`} aria-hidden>
        <div className={styles.signin}>
          <div className={styles.signinHead}>
            <Bone w={56} h={56} r={12} />
            <div className={styles.signinText}><Line w="86%" lh={32} h={20} /><Line w="94%" lh={24} h={14} /><Line w="60%" lh={24} h={14} /></div>
          </div>
          <div className={styles.form}><Bone w="100%" h={48} r={4} /><Bone w="100%" h={52} r={4} /></div>
          {/* (pending modules S13) the foot's sentence as the page sets it (it wraps to two lines in the 392 column — a one-line bar was 20 short),
              then the studio's links when this browser has seen them */}
          <div className={styles.foot}><Words as="p" className={styles.line}>Only the numbers your studio has added can open this page.</Words><PortalFootGhost inline /></div>
        </div>
      </div>
    </GhostSheet>
  )
}

/** (Projects round 8) Choices: the title, the lede, then a choice's card — its head, three option cards, the note and Confirm. */
export function PortalChoicesGhost() {
  return (
    <Frame label="Loading your choices">
      <div className={styles.hello}><Words as="h2" className={styles.h1}>Choices</Words><Line w="54%" lh={24} h={14} /></div>
      <div className={choices.list}>
        <Line w={140} lh={24} h={16} />
        <section className={choices.choice}>
          <div className={choices.head}><div className={choices.titleRow}><Line w={180} lh={24} h={16} /><Bone w={104} h={20} r={10} /></div><Line w={260} /></div>
          <div className={choices.opts}>
            {[0, 1, 2].map((i) => <span key={i} className={choices.opt}><span className={choices.pic} /><span className={choices.optText}><Line w={[120, 96, 132][i]!} lh={24} h={14} /><Line w={110} lh={20} h={12} /></span></span>)}
          </div>
          <div className={choices.foot}><Bone w="100%" h={48} r={4} /><Bone w={180} h={36} r={4} /></div>
        </section>
      </div>
    </Frame>
  )
}
