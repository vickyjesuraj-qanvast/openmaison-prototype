import { redirect } from 'next/navigation'

/** Templates lands on Quotes (owner 2026-09-18: no "All templates" tab — it only repeated the strip). */
export default function TemplatesPage() {
  redirect('/company/templates/quotes')
}
