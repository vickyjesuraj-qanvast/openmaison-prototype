import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

/**
 * First-run setup: create .env.local from the example and give AUTH_SECRET a
 * real value, so `pnpm setup && pnpm dev` works with no manual editing.
 */

if (!existsSync('.env.local')) {
  copyFileSync('.env.example', '.env.local')
  console.log('created .env.local from .env.example')
}

const env = readFileSync('.env.local', 'utf8')

if (/^AUTH_SECRET=""\s*$/m.test(env)) {
  writeFileSync(
    '.env.local',
    env.replace(/^AUTH_SECRET=""\s*$/m, `AUTH_SECRET="${randomBytes(32).toString('base64')}"`),
  )
  console.log('generated AUTH_SECRET')
} else {
  console.log('AUTH_SECRET already set — leaving it alone')
}
