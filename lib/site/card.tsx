import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { CARD_SIZE, clip } from '@/lib/link-cards/model'
import { articleOf } from './blog/articles'
import { getModule } from './platform'
import { HERO_COMPARE, START, TRIAL_CARDS, TRIAL_TOOL_CONTENT } from '@/lib/visualizer/trial/content'
import { isTrialTool } from '@/lib/visualizer/trial/policy'
import { LEADS_WORDS, QUOTE_WORDS, XRAY_WORDS } from '@/lib/trial/policy'

/*
 * (pending modules S35 — 1.0's src/app/api/og/route.tsx, the branded 1200×630 link-preview card) What a chat or a search result shows beside a page
 * of OpenMaison's website: OpenMaison's own card — the paper, the accent rule along the top, the wordmark, the eyebrow, the page's line, the
 * address and the four words — with a photograph on the right (1.0 floated a screenshot of its own Finance page there; a picture of 1.0's
 * screens would show the wrong product, so the site's interior photograph stands in, and an article's own cover on an article). Drawn by
 * next/og through S02's one card route (`/card/site/<page>`), in Inter (the card renderer reads TTF; 1.0's Outfit is a WOFF2 here). The site
 * is the company's, so its name is right on this card — unlike a client link's, which wears only the studio's.
 */

const DEFAULT_LINE = 'The AI Operating System for Interior Design Studios'
const STATIC: Record<string, string> = {
  home: DEFAULT_LINE,
  platform: 'Everything your studio needs, nothing it doesn’t',
  story: 'Built by the team behind Qanvast',
  trust: 'Your studio’s data is yours. Full stop.',
  blog: 'Insights for modern design studios.',
  changelog: 'Everything we’ve shipped lately.',
  careers: 'Come build software that studios actually use.',
  contact: 'Let’s talk.',
  pricing: 'Start free. Upgrade when you’re ready.',   // (S46D — D4)
  privacy: 'Privacy Policy', terms: 'Terms of Service', cookies: 'Cookie Policy',
}

/** The card's line and picture for a page key — or null when the key is no page of the site. */
export function siteCardOf(key: string): { line: string; picture: string } | null {
  const photo = '/site/marketing/modules/leads.jpg'
  if (key in STATIC) return { line: STATIC[key]!, picture: photo }
  if (key.startsWith('module-')) { const m = getModule(key.slice(7)); return m ? { line: m.headline, picture: photo } : null }
  if (key.startsWith('blog-')) { const a = articleOf(key.slice(5)); return a ? { line: a.title, picture: a.heroImage ?? photo } : null }
  /* (pending modules S36) the AI Visualizer trial's pages: the start's line and its live after; a tool page, its own headline and after */
  if (key === 'try') return { line: START.title, picture: HERO_COMPARE.after }
  /* (pending modules S41b-3) the no-account tools' pages: each its own title, its module's picture */
  if (key === 'try-leads') return { line: LEADS_WORDS.title, picture: photo }
  if (key === 'try-upload-a-quote') return { line: QUOTE_WORDS.title, picture: '/site/marketing/modules/quote-digitizer.jpg' }
  if (key === 'try-quote-x-ray') return { line: XRAY_WORDS.title, picture: '/site/marketing/modules/quote-digitizer.jpg' }
  if (key.startsWith('try-')) { const tool = key.slice(4); return isTrialTool(tool) ? { line: TRIAL_TOOL_CONTENT[tool].headline, picture: TRIAL_CARDS[tool].after } : null }
  return null
}

type CardFont = { name: string; data: Buffer; weight: 400 | 600; style: 'normal' }
let fonts: Promise<CardFont[]> | null = null
const loadFonts = () => (fonts ??= Promise.all([
  readFile(join(process.cwd(), 'lib/link-cards/fonts/Inter-Regular.ttf')).then((data): CardFont => ({ name: 'Inter', data, weight: 400, style: 'normal' })),
  readFile(join(process.cwd(), 'lib/link-cards/fonts/Inter-SemiBold.ttf')).then((data): CardFont => ({ name: 'Inter', data, weight: 600, style: 'normal' })),
]).catch(() => { fonts = null; return [] }))
const asData = async (path: string, mime: string) => { try { return `data:${mime};base64,${(await readFile(join(process.cwd(), 'public', path))).toString('base64')}` } catch { return null } }

export async function siteCardImage(key: string): Promise<Response> {
  const card = siteCardOf(key)
  if (!card) return new Response('Not found', { status: 404 })
  const [f, mark, word, picture] = await Promise.all([loadFonts(), asData('/figma-assets/logo.svg', 'image/svg+xml'), asData('/figma-assets/logo-wordmark.svg', 'image/svg+xml'), asData(card.picture, 'image/jpeg')])
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', fontFamily: 'Inter', background: '#F4F2ED', borderTop: '10px solid #5500FF' }}>
        <div style={{ width: 600, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '60px 32px 58px 64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {mark ? <img src={mark} width={56} height={56} alt="" /> : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {word ? <img src={word} width={230} height={36} alt="OpenMaison" style={{ objectFit: 'contain' }} /> : <div style={{ fontSize: 40, fontWeight: 600, color: '#1A1A1A', display: 'flex' }}>OpenMaison</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 5, color: '#5500FF', textTransform: 'uppercase', display: 'flex' }}>AI-Powered Studio OS</div>
            <div style={{ fontSize: 46, fontWeight: 600, lineHeight: 1.14, color: '#1A1A1A', marginTop: 18, display: 'flex' }}>{clip(card.line, 90)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#5500FF', display: 'flex' }}>openmaison.ai</div>
            <div style={{ fontSize: 22, color: '#B8B2A6', margin: '0 12px', display: 'flex' }}>·</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#666666', display: 'flex' }}>Quotes · Projects · Finance · AI</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {picture ? <img src={picture} alt="" width={640} height={480} style={{ position: 'absolute', top: 62, left: 24, width: 640, height: 480, objectFit: 'cover', borderRadius: 16, border: '1px solid rgba(0,0,0,0.10)', boxShadow: '0 30px 72px rgba(23,10,55,0.22)' }} /> : null}
        </div>
      </div>
    ),
    { ...CARD_SIZE, ...(f.length ? { fonts: f } : {}), headers: { 'Cache-Control': 'public, max-age=86400' } },
  )
}
