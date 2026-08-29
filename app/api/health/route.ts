import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.run(sql`select 1`)
    return NextResponse.json({ status: 'ok', database: 'reachable' })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        database: 'unreachable',
        hint: 'Run `npm run db:migrate` and check DATABASE_URL in .env.local.',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    )
  }
}
