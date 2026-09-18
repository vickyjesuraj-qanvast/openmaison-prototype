import { EditorSkeleton } from '@/components/quotes/editor/editor-skeleton'

/** Streams instantly while the contract loads; PageReveal takes over the same skeleton (the editor's layout). */
export default function Loading() {
  return <EditorSkeleton />
}
