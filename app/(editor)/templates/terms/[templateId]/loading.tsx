import { LibraryEditorGhost } from '@/components/company/templates/editors/library-editor-ghost'

/** Streams instantly while the template loads; PageReveal takes over the same ghost — (REG-708) this editor's own, not the quote editor's. */
export default function Loading() {
  return <LibraryEditorGhost kind="terms" />
}
