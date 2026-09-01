import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * The OpenMaison design system is consumed straight from its sibling checkout
 * (`link:../openmaison-design-system/...`), so its real path is outside this
 * repo. Turbopack refuses to resolve outside its root, hence the widened root.
 */
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },

  /**
   * Every lead route is `force-dynamic`, and the client router treats dynamic entries as stale the moment they land —
   * so a prefetched tab was refetched on click anyway and the ghost flashed each time (user 2026-08-30: "why is there
   * a jerk when i navigate through tabs"). Holding them makes tab-to-tab instant; 30s → 300s so the cache outlasts a
   * demo's talking pauses (REG-238 — a tab explained for a minute went stale and the next hop refetched). Safe here
   * because every mutation goes through a server action that calls `revalidatePath`, which evicts these entries regardless.
   */
  experimental: { staleTimes: { dynamic: 300, static: 300 } },

  transpilePackages: ['@openmaison/react'],   // @openmaison/icons is unused: the prototype renders Material Symbols (audit 2026-08-30)

  turbopack: {
    root: path.resolve(rootDir, '..'),
    /**
     * Without this, `react` inside the linked design system resolves to the
     * design system's OWN copy — a second React instance, which breaks hooks
     * and every React Aria context the DS components rely on.
     */
    resolveAlias: {
      react: './openmaison-prototype/node_modules/react',
      'react-dom': './openmaison-prototype/node_modules/react-dom',
      'react-aria-components': './openmaison-prototype/node_modules/react-aria-components',
    },
  },
}

export default nextConfig
