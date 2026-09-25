import { PreviewSkeleton } from '@/components/quotes/preview/preview-skeleton'

/** (sweep S1 #27) Preview streams its own ghost — the editor's belongs to the editor; PageReveal takes over the same skeleton. */
export default function Loading() {
  return <PreviewSkeleton />
}
