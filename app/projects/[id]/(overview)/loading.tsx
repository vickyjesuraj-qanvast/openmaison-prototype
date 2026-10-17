import { ProjectGhost } from '@/components/projects/project-ghost'

/** (REG-708) Streams instantly while the project loads; the page's PageReveal holds the same ghost. */
export default function Loading() {
  return <ProjectGhost tab="" />
}
