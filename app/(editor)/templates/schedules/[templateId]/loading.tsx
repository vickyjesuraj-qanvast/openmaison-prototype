import { ScheduleTemplateGhost } from '@/components/company/templates/schedules/schedule-template-ghost'

/** Streams instantly while the template loads; PageReveal takes over the same ghost (REG-708). */
export default function Loading() {
  return <ScheduleTemplateGhost />
}
