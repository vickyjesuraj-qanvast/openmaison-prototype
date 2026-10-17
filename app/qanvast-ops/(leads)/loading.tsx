import { QanvastSkeleton } from '@/components/shell/skeleton'

/**
 * Streams instantly while the Qanvast leads load; PageReveal takes over the same skeleton (app/leads/loading.tsx twin).
 * QanvastSkeleton mirrors this screen's own frame: header · 44px tab row · toolbar · 56/64 table on the page's tracks.
 */
export default function Loading() {
  return <QanvastSkeleton />
}
