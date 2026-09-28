import { TasksListGhost } from '@/components/shell/list-ghosts'

/** Streams instantly while the tasks load; PageReveal takes over the same ghost — (REG-708) the page's own: Add Task, the scope chip, the tasks table with its Lead column. */
export default function Loading() {
  return <TasksListGhost />
}
