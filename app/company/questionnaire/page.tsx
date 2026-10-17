import type { Metadata } from 'next'
import { fetchScopeQuestions } from '@/lib/company/scope-questions'
import { fetchViewer, refusesPath } from '@/lib/leads/visibility'
import { QuestionnaireView } from '@/components/company/questionnaire-view'
import { readFrom } from '@/lib/nav'
import { AccessGate } from '@/components/shell/access-gate'

export const metadata: Metadata = { title: 'Company · Questionnaire' }
export const dynamic = 'force-dynamic'

/** (REG-612, parity Q-21) Company › Questionnaire — the studio's question bank, 1.0's Scope Questions builder on 2.0's pieces. */
export default async function QuestionnairePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/questionnaire')) return <AccessGate section="Questionnaire" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [questions, viewer, sp] = await Promise.all([fetchScopeQuestions(), fetchViewer(), searchParams])
  return <QuestionnaireView questions={questions} viewer={viewer} from={readFrom(sp.from)} />
}
