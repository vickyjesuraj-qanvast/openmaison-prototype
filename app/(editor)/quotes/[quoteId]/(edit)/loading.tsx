import { EditorSkeleton } from '@/components/quotes/editor/editor-skeleton'

/** Streams instantly while the quote loads; PageReveal takes over the same skeleton (the editor's own layout). */
export default function Loading() {
  return <EditorSkeleton />
}
