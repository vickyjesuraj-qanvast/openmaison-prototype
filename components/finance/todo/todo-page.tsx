'use client'

import type { TodoData } from '@/lib/finance/todo'
import { FinanceFrame } from '../finance-frame'
import { TodoWorkspace } from './todo-workspace'

/** (simplify S-10) Finance › To do in Finance's frame — the strip's To do carries what waits on you. */
export function TodoPage({ data, todoCount, open }: { data: TodoData; todoCount: number; open: string | null }) {
  return (
    <FinanceFrame tab="todo" runs={data.finance.viewer.runs} todoCount={todoCount}>
      <TodoWorkspace data={data} open={open} />
    </FinanceFrame>
  )
}
