import { EditorSkeleton } from '@/components/quotes/editor/editor-skeleton'

/** Streams instantly while the template loads; PageReveal takes over the same skeleton. */
export default function Loading() {
  return <EditorSkeleton />
}
