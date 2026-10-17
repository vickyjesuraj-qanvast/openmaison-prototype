import { Icon } from '@/components/om/icon'
import { displayDate } from '@/lib/format'
import { clientPriceText } from '@/lib/projects/choices-model'
import { fingerprintText, pickedLine, receiptStateLabel, type SelectionReceiptData } from '@/lib/projects/choice-receipt-model'
import { Bone } from '@/components/shell/skeleton'
import { Line } from '@/components/shell/ghost-kit'
import styles from './selection-receipt.module.css'

const time = (ms: number) => new Date(ms).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '').toLowerCase()

/**
 * (gaps build D, item 7 — 1.0 F-129 · F-163 · I-287) A confirmed pick's **selection receipt** on the invoice's own paper (the letterhead, the
 * title block, the parties): the choice and its room, every option put to the client with what it does to the price — the pick ticked — who
 * chose and when, their note, and the fingerprint that ties the copy to the record. The studio's page, the portal's Documents and the PDF (the
 * browser's print) draw this one paper. No cost, no studio note, no member's own record (I-240's rule): only what the client was shown.
 * (parity map, TD-044) The client's no draws the same paper: no option ticked, and *Their answer* in the pick's place — turned down or other
 * options asked for, who and when, their reason.
 */
export function SelectionReceiptPaper({ d }: { d: SelectionReceiptData }) {
  const h = d.letterhead
  const line = [h.address, d.studioPhone, d.studioEmail, h.uen ? `UEN ${h.uen}` : '', h.gstReg ? `GST Reg ${h.gstReg}` : ''].filter(Boolean).join(' · ')
  const picked = d.options.find((o) => o.picked) ?? null
  return (
    <article className={styles.paper} data-testid="selection-receipt">
      <header className={styles.head}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {h.logo ? <img className={styles.logo} src={h.logo} alt="" /> : null}
        <span className={styles.studio}>
          <span className={styles.studioName}>{h.name}</span>
          {line ? <span className={styles.studioLine}>{line}</span> : null}
        </span>
      </header>
      <div className={styles.body}>
        <div className={styles.top}>
          <h1 className={styles.docTitle}>Selection receipt</h1>
          <dl className={styles.facts}>
            <dt>Choice</dt><dd>{d.choice.title}</dd>
            <dt>{d.answer ? 'Answered' : 'Chosen'}</dt><dd>{`${displayDate(new Date(d.pick.at))}, ${time(d.pick.at)}`}</dd>
            <dt>Project no.</dt><dd>{d.project.number}</dd>
          </dl>
        </div>
        <div className={styles.parties}>
          <div className={styles.party}>
            <span className={styles.eyebrow}>For</span>
            <strong>{d.client}</strong>
            {d.property ? <span>{d.property}</span> : null}
          </div>
          <div className={styles.party}>
            <span className={styles.eyebrow}>Project</span>
            <strong>{d.project.name}</strong>
            {d.choice.room ? <span>{d.choice.room}</span> : null}
          </div>
        </div>
        <table className={styles.lines}>
          <thead><tr><th>Options put to {d.client.split(' ')[0]}</th><th className={styles.amt}>Price</th></tr></thead>
          <tbody>
            {d.options.map((o) => (
              <tr key={o.id} data-picked={o.picked || undefined} data-testid="receipt-option">
                <td>
                  <span className={styles.optName}>{o.picked ? <span className={styles.tick} aria-label="Picked"><Icon name="check_circle" size={20} /></span> : null}{o.name}</span>
                  {o.description || o.vendor ? <span className={styles.lineSub}>{[o.description, o.vendor ? `From ${o.vendor}` : null].filter(Boolean).join(' · ')}</span> : null}
                </td>
                <td className={styles.amt}>{clientPriceText(o.priceMinor, d.gstPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.pickBlock} data-testid="receipt-pick" data-answer={d.answer ?? undefined}>
          <span className={styles.eyebrow}>{d.answer ? 'Their answer' : 'The pick'}</span>
          <strong>{d.answer ? receiptStateLabel(d) : picked ? picked.name : '—'}</strong>
          <span>{`${pickedLine(d)} on ${displayDate(new Date(d.pick.at))} at ${time(d.pick.at)}.`}</span>
          {d.pick.note ? <span className={styles.note}>{`${d.answer ? 'Their reason' : 'Their note'}: “${d.pick.note}”`}</span> : null}
        </div>
        <p className={styles.fingerprint} data-testid="receipt-fingerprint">
          <span className={styles.eyebrow}>Fingerprint</span>
          <span className={styles.hash}>{fingerprintText(d.hash)}</span>
          <span className={styles.lineSub}>{`${h.name} keeps this record. A copy whose fingerprint differs has been changed.`}</span>
        </p>
      </div>
    </article>
  )
}

/** The receipt's ghost — the paper's own parts (letterhead, title and facts, the parties, the options, the pick, the fingerprint). */
export function SelectionReceiptGhost() {
  return (
    <div className={styles.paper}>
      <div className={styles.head}><Bone w={120} h={32} r={4} /><span className={styles.studio}><Line w={160} lh={22} h={14} /><Line w={320} lh={16} h={10} /></span></div>
      <div className={styles.body}>
        <div className={styles.top}><Line w={240} lh={36} h={24} /><span className={styles.party}><Line w={180} lh={22} h={12} /><Line w={180} lh={22} h={12} /><Line w={180} lh={22} h={12} /></span></div>
        <div className={styles.parties}>
          <span className={styles.party}><Line w={48} lh={16} h={10} /><Line w={140} lh={24} h={14} /><Line w={220} lh={20} h={12} /></span>
          <span className={styles.party}><Line w={60} lh={16} h={10} /><Line w={200} lh={24} h={14} /><Line w={100} lh={20} h={12} /></span>
        </div>
        <span className={styles.party}><Line w="100%" lh={20} h={10} /><Line w="70%" lh={24} h={12} /><Line w="62%" lh={24} h={12} /><Line w="66%" lh={24} h={12} /></span>
        <span className={styles.party}><Line w={70} lh={16} h={10} /><Line w={160} lh={24} h={14} /><Line w={300} lh={20} h={12} /></span>
        <Line w={260} lh={20} h={12} />
      </div>
    </div>
  )
}
