import { RecordNotFound } from '@/components/shell/record-not-found'

/** (S42 audit A-11) A project the record layout refused (app/projects/[id]/layout.tsx) — the same record-not-found its own pages draw
    (app/projects/[id]/not-found.tsx), caught one level up because the layout is above that page's boundary. */
export default function ProjectsNotFound() {
  return <RecordNotFound section="Projects" noun="project" back="/projects" />
}
