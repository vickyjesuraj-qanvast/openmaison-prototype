import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Ld } from '@/components/site/ld'
import { ModulePage } from '@/components/site/platform-pages'
import { MODULES, getModule } from '@/lib/site/platform'
import { breadcrumbJsonLd, siteMetadata } from '@/lib/site/seo'

/* (pending modules S35 — 1.0's platform/[module]/page.tsx) The eight module pages, built ahead; an unknown one is the site's own 404. 1.0's FAQ
   (and its FAQPage schema) stays held back from the pages for now, as 1.0 held it — the data lives in lib/site/platform.ts MODULE_FAQS. */
/* (pending modules S41b-3) built ahead, but no `dynamicParams = false`: with it, Next 16 answered every one of these pages 404 (NoFallbackError)
   after any whole-app revalidation (View as, a task, a sign-in — revalidatePath('/', 'layout')) until the next build; an unknown one is the
   site's own 404, said by this segment's layout above the streamed ghost */
export function generateStaticParams() { return MODULES.map((m) => ({ module: m.slug })) }

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const mod = getModule((await params).module)
  if (!mod) return {}
  return siteMetadata({ title: `${mod.name}, OpenMaison`, description: mod.subcopy, path: mod.href, card: `module-${mod.slug}` })
}

export default async function ModuleRoute({ params }: { params: Promise<{ module: string }> }) {
  const mod = getModule((await params).module)
  if (!mod) notFound()
  return <><Ld data={breadcrumbJsonLd([{ name: 'Home', path: '/site' }, { name: 'Platform', path: '/site/platform' }, { name: mod.name, path: mod.href }])} /><ModulePage mod={mod} /></>
}
