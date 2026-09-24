import type { Metadata } from 'next'
import { fetchScopeQuestions } from '@/lib/company/scope-questions'
import { fetchViewer } from '@/lib/leads/visibility'
import { QuestionnaireView } from '@/components/company/questionnaire-view'
import { readFrom } from '@/lib/nav'

export const metadata: Metadata = { title: 'Company · Questionnaire' }
export const dynamic = 'force-dynamic'

/** (REG-612, parity Q-21) Company › Questionnaire — the studio's question bank, 1.0's Scope Questions builder on 2.0's pieces. */
export default async function QuestionnairePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [questions, viewer, sp] = await Promise.all([fetchScopeQuestions(), fetchViewer(), searchParams])
  return <QuestionnaireView questions={questions} viewer={viewer} from={readFrom(sp.from)} />
}
