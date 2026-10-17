import { Bone } from '@/components/shell/skeleton'
import { Line } from '@/components/shell/ghost-kit'
import { ReceiptPaperGhost } from '@/components/projects/money/payments-receipt-ghost'
import { Frame } from '../portal-ghosts'
import portal from '../portal.module.css'
import styles from './money.module.css'

/*
 * (Projects round 6, REG-708) The portal's Money ghosts — one per page, drawn by its loading.tsx and handed to its PageReveal, each on the
 * page's own classes: the title, the payments (paid rows, the tinted block with the pay box and its button, a planned row), Paid so far with
 * its bar, the quote's link and the line to the designer; and a document (an invoice or a receipt) under Back to Money.
 */
export function PortalMoneyGhost() {
  return (
    <Frame label="Loading your payments">
      <div className={portal.hello}><Line w={110} lh={36} h={24} /></div>
      <div className={styles.split}>
        <div className={styles.main}>
          <section className={styles.list} data-slot="payments">
            {[0, 1].map((k) => <div key={k} className={styles.stage}><span className={styles.stageText}><Line w={[130, 190][k]!} /><Line w={110} lh={16} h={10} /></span><Line w={90} /></div>)}
            <div className={styles.due}>
              <div className={styles.dueHead}><span className={styles.stageText}><Line w={150} /><Line w={70} lh={16} h={10} /></span><Line w={110} lh={28} h={16} /></div>
              <div className={styles.payBox}><Bone w={88} h={88} r={4} /><span className={styles.payText}><Line w={50} lh={16} h={10} /><Line w={160} /><Line w={140} lh={16} h={10} /><Line w={150} lh={16} h={10} /></span></div>
              <Bone w="100%" h={48} r={4} />
              <Line w="80%" lh={16} h={10} />
            </div>
            <div className={styles.stage}><span className={styles.stageText}><Line w={130} /><Line w={140} lh={16} h={10} /></span><Line w={90} /></div>
          </section>
        </div>
        <div className={styles.side}>
          <section className={styles.paid} data-slot="paid"><Line w={80} lh={16} h={10} /><Line w={260} lh={32} h={22} /><Bone w="100%" h={8} r={4} /></section>
          <span data-slot="quote"><Line w={170} lh={44} /></span>
          <Line w={280} />
        </div>
      </div>
    </Frame>
  )
}

export function PortalDocGhost({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <div className={styles.docBar}><Line w={130} lh={44} /><Bone w={40} h={40} r={20} /></div>
      <div className={styles.docStage}><ReceiptPaperGhost /></div>
    </Frame>
  )
}
