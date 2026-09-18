import { TemplateEditorSkeleton } from '@/components/templates/editor/editor-skeleton'

/** Streams instantly while the template loads — the editor's own frame, so nothing jumps when it lands. */
export default function Loading() {
  return <TemplateEditorSkeleton />
}
