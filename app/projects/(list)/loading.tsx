import { ProjectsGhost } from '@/components/projects/projects-ghost'

/** (REG-708 · REG-929) Streams instantly while the projects load; the page's PageReveal holds the same ghost. */
export default function Loading() {
  return <ProjectsGhost />
}
