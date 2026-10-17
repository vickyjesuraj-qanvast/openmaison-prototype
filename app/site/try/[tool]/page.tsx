import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Ld } from '@/components/site/ld'
import { TrialVisualizer } from '@/components/visualizer/trial/trial-visualizer'
import { TrialToolMarketing } from '@/components/visualizer/trial/trial-marketing'
import { breadcrumbJsonLd, faqJsonLd, siteMetadata } from '@/lib/site/seo'
import { TOOL_INFO, TRIAL_SEO, TRIAL_TOOL_CONTENT } from '@/lib/visualizer/trial/content'
import { isTrialTool, TRIAL_TOOLS, trialHref } from '@/lib/visualizer/trial/policy'
import { botCheck, trialLeft } from '@/lib/visualizer/trial/server'

/* (pending modules S36 — 1.0's /try-visualizer/{style, materials, lighting, furniture, defurnish, sketch}) The six landing pages: each opens the
   trial on its tool and says what it does, with its own search copy; an unknown one is the site's own 404. */
/* (pending modules S41b-3) built ahead, but no `dynamicParams = false`: with it, Next 16 answered every one of these pages 404 (NoFallbackError)
   after any whole-app revalidation (View as, a task, a sign-in — revalidatePath('/', 'layout')) until the next build; an unknown one is the
   site's own 404, said by this segment's layout above the streamed ghost */
export function generateStaticParams() { return TRIAL_TOOLS.map((tool) => ({ tool })) }

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const tool = (await params).tool
  if (!isTrialTool(tool)) return {}
  return siteMetadata({ title: TRIAL_SEO[tool].title, description: TRIAL_SEO[tool].description, path: trialHref(tool), card: `try-${tool}` })
}

export default async function TryToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const tool = (await params).tool
  if (!isTrialTool(tool)) notFound()
  const left = await trialLeft()
  return (
    <>
      <Ld data={[breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Try the AI Visualizer', path: trialHref() }, { name: TOOL_INFO[tool].title, path: trialHref(tool) }]), faqJsonLd(TRIAL_TOOL_CONTENT[tool].faqs)]} />
      <TrialVisualizer tool={tool} left={left} botSiteKey={botCheck().siteKey} />
      <TrialToolMarketing tool={tool} />
    </>
  )
}
