'use client'

import { Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { withFrom } from '@/lib/nav'
import { isAppPath, type Block, type Inline } from '@/lib/market-insights/markdown'
import { ArticleChart } from './article-chart'
import styles from './article.module.css'

/** A run of words: bold, italic, code and links — a link inside the app opens in place with the way back; one to the web in a new tab. */
function Words({ c, here }: { c: readonly Inline[]; here: string }): ReactNode {
  return c.map((x, i) => {
    switch (x.t) {
      case 'text': return <Fragment key={i}>{x.v}</Fragment>
      case 'b': return <strong key={i}><Words c={x.c} here={here} /></strong>
      case 'i': return <em key={i}><Words c={x.c} here={here} /></em>
      case 'code': return <code key={i} className={styles.inlineCode}>{x.v}</code>
      case 'a':
        if (isAppPath(x.href)) return <Link key={i} className={styles.link} href={withFrom(x.href, here)} data-testid="insight-link">{<Words c={x.c} here={here} />}</Link>
        if (x.href.startsWith('#') || x.href.startsWith('mailto:')) return <a key={i} className={styles.link} href={x.href}><Words c={x.c} here={here} /></a>
        return (
          <a key={i} className={styles.link} href={x.href} target="_blank" rel="noopener noreferrer" data-testid="insight-link-out">
            <Words c={x.c} here={here} /><span className={styles.out}><Icon name="open_in_new" size={14} weight={400} /></span><span className={styles.srOnly}> (opens in a new tab)</span>
          </a>
        )
    }
  })
}

/**
 * (pending modules S25 — 1.0's article body: ReactMarkdown's headings, paragraphs, lists, quotes, rules, tables, pictures and ```chart) The
 * article's blocks in the house type: sections as headings the page can scroll to (under the sticky header), paragraphs at the reading size,
 * a quote as the house tinted block, a table in its own sideways scroller, a picture with its words under it, a chart drawn by ArticleChart —
 * or, when its block can't be read, one line saying so (1.0: "Invalid chart specification.").
 */
export function ArticleBody({ blocks, here }: { blocks: readonly Block[]; here: string }) {
  return (
    <div className={styles.body} data-testid="insight-body">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h': {
            const Tag = b.level === 2 ? 'h2' : b.level === 3 ? 'h3' : 'h4'
            return <Tag key={i} id={b.id} className={styles[`h${b.level}`]} data-testid="insight-section">{<Words c={b.c} here={here} />}</Tag>
          }
          case 'p': return <p key={i} className={styles.p}><Words c={b.c} here={here} /></p>
          case 'list': {
            const items = b.items.map((it, k) => <li key={k} className={styles.li}><Words c={it} here={here} /></li>)
            return b.ordered ? <ol key={i} className={styles.list} start={b.start}>{items}</ol> : <ul key={i} className={styles.list}>{items}</ul>
          }
          case 'quote': return <blockquote key={i} className={styles.quote}>{b.paras.map((p, k) => <p key={k} className={styles.quoteP}><Words c={p} here={here} /></p>)}</blockquote>
          case 'rule': return <hr key={i} className={styles.rule} />
          case 'table': return (
            <div key={i} className={styles.tableWrap} data-testid="insight-table">
              <table className={styles.table}>
                <thead><tr>{b.head.map((h, k) => <th key={k} scope="col" style={{ textAlign: b.align[k] }}><Words c={h} here={here} /></th>)}</tr></thead>
                <tbody>{b.rows.map((r, k) => <tr key={k}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row" style={{ textAlign: b.align[j] }}><Words c={c} here={here} /></th> : <td key={j} style={{ textAlign: b.align[j] }}><Words c={c} here={here} /></td>))}</tr>)}</tbody>
              </table>
            </div>
          )
          case 'figure': return (
            <figure key={i} className={styles.figure} data-testid="insight-figure">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.src} alt={b.alt} loading="lazy" decoding="async" />
              {b.alt ? <figcaption className={styles.caption}>{b.alt}</figcaption> : null}
            </figure>
          )
          case 'chart': return b.spec ? <ArticleChart key={i} spec={b.spec} /> : <p key={i} className={styles.chartNote} data-testid="insight-chart-broken"><Icon name="info" size={20} weight={300} />This chart couldn’t be drawn — its figures came in a shape the page can’t read.</p>
          case 'code': return <pre key={i} className={styles.code}><code>{b.text}</code></pre>
        }
      })}
    </div>
  )
}
