import 'server-only'
import type { Metadata } from 'next'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'
import { trialEnabled } from '@/lib/visualizer/trial/policy'
import { TRY_PATH, type TrialToolKey } from './policy'
import { toolsOpen } from './server'

/* (pending modules S41b-3) The three no-account tool pages' search copy (invented copy — REG-S41b3; S36's titles' shape), crumbs and the
   other tools open beside them — what each page's server half reads. */
type Tool = Exclude<TrialToolKey, 'visualizer'>
const SEO: Record<Tool, { title: string; description: string; card: string; module: { name: string; path: string } }> = {
  leads: { title: 'Try Leads — free, no sign-up', description: 'Add your own enquiries to OpenMaison’s Leads, the way your studio would — no account needed. Start your studio and they come with you.', card: 'try-leads', module: { name: 'Leads', path: '/site/platform/leads' } },
  quote: { title: 'Try Upload a quote — free, no sign-up', description: 'Read a quote spreadsheet into its lines with OpenMaison — no account needed. Start your studio and it starts there as a quote.', card: 'try-upload-a-quote', module: { name: 'Upload a quote', path: '/site/platform/upload-a-quote' } },
  xray: { title: 'Try Quote X-Ray — free, no sign-up', description: 'Compare another studio’s quote with yours, line by line, and see what to tell the client — no account needed.', card: 'try-quote-x-ray', module: { name: 'Upload a quote', path: '/site/platform/upload-a-quote' } },
}
export const toolMetadata = (tool: Tool): Metadata => siteMetadata({ title: SEO[tool].title, description: SEO[tool].description, path: TRY_PATH[tool], card: SEO[tool].card })
export const toolCrumbs = (tool: Tool) => breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Platform', path: '/site/platform' }, { name: SEO[tool].module.name, path: SEO[tool].module.path }, { name: SEO[tool].title.split(' — ')[0]!, path: TRY_PATH[tool] }])
/** Which trials are open on this server — the pages' "More to try without an account". */
export function openTrials(): Partial<Record<TrialToolKey, boolean>> {
  const tools = toolsOpen()
  return { visualizer: trialEnabled(), leads: tools, quote: tools, xray: tools }
}
