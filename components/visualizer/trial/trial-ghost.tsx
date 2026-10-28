import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Words } from '@/components/shell/ghost-kit'
import { cx } from '@/components/site/primitives'
import { START, TOOL_INFO } from '@/lib/visualizer/trial/content'
import { allowanceLine, SAMPLE_ONLY, TRIAL_LIMIT, type TrialTool } from '@/lib/visualizer/trial/policy'
import s from '@/components/site/site.module.css'
import p from '@/components/site/pages.module.css'
import g from '@/components/site/site-ghosts.module.css'
import t from './trial.module.css'

/**
 * (pending modules S36 — REG-708) The trial's ghosts, server-drawn like the site's (a ghost needs no script to show — a slow hop paints it at
 * once): the start's first screen on the page's own classes — the crumb, the eyebrow, the title and the line, the upload button, the sample
 * tiles, and on the root the before / after beside it — so the hand-over lands every line where its bar was. The root's words are its own;
 * a tool page's ghost (its loader has no word for which tool) draws its one-line title and its line as bars. (S42E, E-13) Told which tool
 * (TrialToolGhost reads it from the address), it draws that tool's own words — its title, its line, the sample-only line — and its samples:
 * the sketch page's one sample sketch under its own head, every other page's three rooms.
 */
export function TrialGhost({ tool = false }: { /** a tool's page — one title word, its line, no before / after; its key when known */ tool?: boolean | TrialTool }) {
  const info = typeof tool === 'string' ? TOOL_INFO[tool] : null
  const only = typeof tool === 'string' ? SAMPLE_ONLY[tool] : undefined
  const sketch = tool === 'sketch'
  return (
    <GhostSheet label="Loading the AI Visualizer">
      <div className={g.page}>
        <section className={cx(s.section, s.pageTop, p.heroBand)}>
          <div className={s.container}>
            <div className={p.crumbs}><Bone w={tool ? 176 : 112} h={16} /><Bone w={8} h={16} /><Bone w={tool ? 88 : 48} h={16} /></div>
            <div className={t.hero} data-tool={tool || undefined}>
              <div>
                <Words className={s.eyebrow}>{`${START.eyebrow} · ${allowanceLine(TRIAL_LIMIT)}`}</Words>   {/* (the calm UI build 2026-10-27, W-463) the page's own line */}
                {info ? <Words as="h2" className={cx(s.displayL, p.mt20)}>{info.title}</Words> : tool ? <h2 className={cx(s.displayL, p.mt20)} aria-hidden><Bone w="34%" h={44} r={4} /></h2> : <Words as="h2" className={cx(s.displayL, p.mt20)}>{START.title}</Words>}
                {info ? <Words as="p" className={cx(s.lede, p.mt20)}>{info.subtitle}</Words> : tool ? <div className={cx(g.lines, p.mt20)}><Bone w="100%" h={16} /><Bone w="72%" h={16} /></div> : <Words as="p" className={cx(s.lede, p.mt20)}>{START.lede}</Words>}
                <div className={cx(t.uploadRow, p.mt32)}><Bone w={232} h={48} r={4} className={g.button} /></div>
                {only ? <Words as="p" className={cx(s.fine, p.mt12)}>{only}</Words> : null}
                <div className={p.mt32}>
                  <Words as="p" className={t.samplesHead}>{sketch ? START.sketchSample : START.samples}</Words>
                  <div className={t.samples}>{Array.from({ length: sketch ? 1 : 3 }, (_, i) => <Bone key={i} w="100%" r={8} style={{ height: 'auto' }} className={g.tile} />)}</div>
                </div>
              </div>
              {!tool ? <Bone w="100%" r={12} style={{ height: 'auto' }} className={t.compareGhost} /> : null}
            </div>
          </div>
        </section>
      </div>
    </GhostSheet>
  )
}
