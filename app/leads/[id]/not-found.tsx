import { RecordNotFound } from '@/components/shell/record-not-found'

/** (fix-G, G-38) A lead the viewer can't open — inside the shell, with the way back to Leads. */
export default function LeadNotFound() {
  return <RecordNotFound section="Leads" noun="lead" back="/leads" />
}
