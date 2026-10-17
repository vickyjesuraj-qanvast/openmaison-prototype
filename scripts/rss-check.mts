/**
 * (pending modules S22 — api:industry-news) The Industry News reader's harness: it reads a sample feed (invented stories on `.example`
 * addresses — never a real newsroom's) through 1.0's rules (lib/market-insights/rss.ts), checks each rule and prints `ok` / `FAIL` lines;
 * with `--db <scratch.db>` it also writes the headlines through Market Insights' one mapper (`rowsFromFeed` → `feedStatements`, scope
 * headlines) so a probe can see them on the pages, and `--clean` takes them out again. Never local.db.
 *   npx tsx scripts/rss-check.mts [--db <scratch.db>] [--clean]
 */
import { createClient } from '@libsql/client'
import { headlineArticles, parseFeed, readHeadlines, storyId, topicOf } from '../lib/market-insights/rss'
import { feedStatements, rowsFromFeed } from '../lib/market-insights/feed'

const args = process.argv.slice(2)
const db = args.includes('--db') ? args[args.indexOf('--db') + 1] : null
if (db && /local\.db$/.test(db)) { console.error('Give a scratch DB — never local.db'); process.exit(2) }
let failed = 0
const check = (cond: boolean, name: string) => { console.log(`${cond ? 'ok' : 'FAIL'} ${name}`); if (!cond) failed++ }

const item = (n: number, title: string, link: string, extra = '') => `<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>Mon, ${10 + n} Oct 2026 09:00:00 +0800</pubDate><description><![CDATA[<p>Story ${n} &amp; its <b>summary</b> — a sample written for the check.</p>]]></description>${extra}</item>`
const SAMPLE = `<?xml version="1.0"?><rss><channel><title>Sample</title>
${item(1, 'HDB resale flats in the north see more renovation briefs', 'https://news.example/a1')}
${item(2, 'BCA guideline on balcony works', 'https://news.example/a2')}
${item(3, 'Interior design: warm woods return', 'https://news.example/a3')}
${item(4, 'Renovation costs: what moved this quarter', 'https://news.example/a4')}
${item(5, 'A story with no safe link', 'javascript:alert(1)')}
${item(6, 'Condo launches in the west', 'https://news.example/a6')}
${item(7, 'A seventh story past the first five', 'https://news.example/a7')}
</channel></rss>`

const list = parseFeed(SAMPLE, 'Sample Desk')
check(list.length === 5, 'a feed gives its first five readable stories (1.0 read five)')
check(!list.some((h) => h.title.includes('no safe link')), 'a story whose link is not the web over https is left out')
check(list[0]?.summary === 'Story 1 & its summary — a sample written for the check.', 'the summary is the description with its tags and entities taken out')
check(topicOf('BCA guideline on balcony works') === 'regulation' && topicOf('Interior design: warm woods return') === 'design' && topicOf('Renovation costs: what moved this quarter') === 'market' && topicOf('Condo launches in the west') === 'property', '1.0’s topics by the title’s words')
check(storyId('https://news.example/a1') === storyId('https://news.example/a1') && storyId('https://news.example/a1') !== storyId('https://news.example/a2'), 'a story keeps its id from one read to the next')
const now = Date.parse('2026-10-13T09:00:00+08:00')
const rows = rowsFromFeed(headlineArticles(list, now))
check(rows.length === 5 && rows.every((r) => r.id.startsWith('mi-rss-') && r.category === 'industry-news' && r.author === 'Sample Desk'), 'each headline is an Industry News article in Market Insights, its source the byline')
check(rows.every((r) => /\[Read it on Sample Desk\]\(https:\/\/news\.example\/a\d\)$/.test(r.content)), 'its body is the summary and the way to the whole story')
const hs = feedStatements(rows, now, { scope: 'headlines' }), es = feedStatements([], now)
check(/id LIKE \?$/.test(hs[hs.length - 1]!.sql.trim()) && /id NOT LIKE \?$/.test(es[es.length - 1]!.sql.trim()), 'each sync keeps to its own rows — the editors’ never take a headline down, nor the headlines an article')
const offline = await readHeadlines(async (u) => { if (u.includes('bad')) throw new Error('down'); return SAMPLE }, [{ name: 'Up', url: 'https://up.example/feed' }, { name: 'Down', url: 'https://bad.example/feed' }])
check(offline.length === 5 && offline.every((h) => h.source === 'Up'), 'a source that fails is left out, the others still read (1.0’s allSettled)')

if (db) {
  const client = createClient({ url: `file:${db}` })
  if (args.includes('--clean')) {
    await client.execute(`DELETE FROM market_insights WHERE id LIKE 'mi-rss-%'`)
    console.log('ok cleaned the headlines')
  } else {
    for (const s of hs) await client.execute({ sql: s.sql, args: s.args })
    const n = Number((await client.execute(`SELECT count(*) AS n FROM market_insights WHERE id LIKE 'mi-rss-%' AND removed_at IS NULL`)).rows[0]?.n ?? 0)
    const editors = Number((await client.execute(`SELECT count(*) AS n FROM market_insights WHERE id NOT LIKE 'mi-rss-%' AND removed_at IS NULL`)).rows[0]?.n ?? 0)
    check(n === 5 && editors > 0, `the headlines are written beside the editors’ articles (${n} headlines, ${editors} articles still live)`)
  }
  client.close()
}
console.log(failed ? `${failed} FAIL` : 'all ok')
process.exit(failed ? 1 : 0)
