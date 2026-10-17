import { TemplateEditorSkeleton } from '@/components/templates/editor/editor-skeleton'
import { LockAware } from '@/components/credits/pro-locked-ghost'
import { TemplateLockedGhost } from '@/components/templates/editor/template-locked'

/** Streams instantly while the template loads — the editor's own frame, so nothing jumps when it lands. */
export default function Loading() {
  return <LockAware feature="template_editor" locked={<TemplateLockedGhost />}><TemplateEditorSkeleton /></LockAware>   // (pending modules S19) the lock's ghost on Free
}
