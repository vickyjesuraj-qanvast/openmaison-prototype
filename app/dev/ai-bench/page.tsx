import type { Metadata } from 'next'
import { AiBench } from '@/components/dev/ai-bench/ai-bench'
import { devPreviewsOpen } from '@/lib/services/dev-previews'

/** (pending modules S41 — card studio:ai-sandboxes; 1.0's seven /tools/*-sandbox pages) The developers' AI bench — no studio data, no
    model, nothing saved. Never indexed; while it is shut (a production build without OPENMAISON_DEV_PREVIEWS=1) not even its name is sent. */
export function generateMetadata(): Metadata {
  return devPreviewsOpen() ? { title: 'AI benches', robots: { index: false, follow: false } } : { robots: { index: false, follow: false } }
}
export const dynamic = 'force-dynamic'

export default function AiBenchPage() {
  return <AiBench />
}
