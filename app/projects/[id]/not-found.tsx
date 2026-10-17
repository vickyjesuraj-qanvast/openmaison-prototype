import { RecordNotFound } from '@/components/shell/record-not-found'

/** (fix-G, G-38) A project the viewer can't open — inside the shell, with the way back to Projects. */
export default function ProjectNotFound() {
  return <RecordNotFound section="Projects" noun="project" back="/projects" />
}
