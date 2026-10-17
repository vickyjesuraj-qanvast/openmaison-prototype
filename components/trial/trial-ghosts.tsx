import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Words } from '@/components/shell/ghost-kit'
import { cx } from '@/components/site/primitives'
import { LEADS_WORDS, QUOTE_WORDS, TRIAL_WORDS, XRAY_WORDS, leadsLeftLine, readLeftLine, xrayLeftLine, LEAD_LIMIT } from '@/lib/trial/policy'
import s from '@/components/site/site.module.css'
import p from '@/components/site/pages.module.css'
import g from '@/components/site/site-ghosts.module.css'
import x from './trial-tools.module.css'

type Tool = 'leads' | 'quote' | 'xray'
const HERO: Record<Tool, { back: string; here: string; allowance: string; title: string; lede: string }> = {
  leads: { back: LEADS_WORDS.crumbBack, here: LEADS_WORDS.crumbHere, allowance: leadsLeftLine(LEAD_LIMIT), title: LEADS_WORDS.title, lede: LEADS_WORDS.lede },
  quote: { back: QUOTE_WORDS.crumbBack, here: QUOTE_WORDS.crumbHere, allowance: readLeftLine(1), title: QUOTE_WORDS.title, lede: QUOTE_WORDS.lede },
  xray: { back: XRAY_WORDS.crumbBack, here: XRAY_WORDS.crumbHere, allowance: xrayLeftLine(1), title: XRAY_WORDS.title, lede: XRAY_WORDS.lede },
}

/**
 * (pending modules S41b-3 — REG-708) A no-account tool page's ghost, server-drawn like S36's (a slow hop paints it at once): the hero's crumb,
 * eyebrow, title and line set as bars in the page's own classes — so they wrap where the page's do — then the top of the tool in its studio
 * frame (the leads' table, the quote's drop box, the two quotes' tiles). A first visit's words: the allowance at its full.
 */
export function TrialToolGhost({ tool }: { tool: Tool }) {
  const h = HERO[tool]
  return (
    <GhostSheet label="Loading the free trial">
      <div className={g.page}>
        <section className={cx(s.section, s.pageTop, p.heroBand)}>
          <div className={s.container}>
            <div className={p.crumbs}><Words className={p.crumbBack}>{`← ${h.back}`}</Words><Bone w={8} h={16} /><Words className={p.crumbHere}>{h.here}</Words></div>
            <div className={x.hero}>
              <Words className={s.eyebrow}>{`${TRIAL_WORDS.eyebrow} · ${h.allowance}`}</Words>
              <Words as="h2" className={cx(s.displayL, p.mt20)}>{h.title}</Words>
              <Words as="p" className={cx(s.lede, p.mt20)}>{h.lede}</Words>
            </div>
          </div>
        </section>
        <section className={cx(s.compact, x.appBand)}>
          <div className={s.container}>
            <div className={x.app}>
              {tool === 'leads' ? (
                <>
                  <div className={x.blockTitles}><Words as="h2" className={x.blockTitle}>{LEADS_WORDS.listTitle}</Words><Words as="p" className={x.blockHelp}>{LEADS_WORDS.listHelp}</Words></div>
                  <Bone w="100%" h={240} r={8} className={x.ghostBlock} />
                </>
              ) : tool === 'quote' ? (
                <div className={x.block}>
                  <div className={x.blockTitles}><Words as="h2" className={x.blockTitle}>{QUOTE_WORDS.upload}</Words><Words as="p" className={x.blockHelp}>{QUOTE_WORDS.fine}</Words></div>
                  <Bone w="100%" h={120} r={8} className={x.ghostBlock} />
                  <div className={x.samples}><Words className={x.samplesHead}>{QUOTE_WORDS.sample}</Words><Bone w={232} h={40} r={4} /></div>
                </div>
              ) : (
                <div className={x.block}>
                  <div className={x.sides}>
                    <div className={x.side}><Words className={x.fine}>{XRAY_WORDS.theirs}</Words><Bone w="100%" h={120} r={8} className={x.ghostBlock} /></div>
                    <div className={x.side}><Words className={x.fine}>{XRAY_WORDS.yours}</Words><Bone w="100%" h={120} r={8} className={x.ghostBlock} /></div>
                  </div>
                  <div className={x.samples}><Words className={x.samplesHead}>{XRAY_WORDS.samples}</Words><Bone w={232} h={40} r={4} /></div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </GhostSheet>
  )
}
