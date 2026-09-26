import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },

  /**
   * A tunnelled dev server (ngrok, for showing the prototype to someone off this machine) reaches Next under a
   * host it does not recognise, and Next refuses cross-origin dev requests. The page itself still renders, but
   * the HMR websocket's upgrade is rejected and the dev client retries it forever — which reads as a page that
   * never finishes loading. Free ngrok domains are `*.ngrok-free.dev` today (they used to be `.ngrok-free.app`,
   * which is why that one alone was not enough); the paid and legacy hosts are here too. Dev only: `next build`
   * / `next start` ignore this entirely, so a production demo is unaffected.
   */
  allowedDevOrigins: [
    '*.ngrok-free.dev', '*.ngrok-free.app', '*.ngrok.dev', '*.ngrok.app', '*.ngrok.io',
    /* (REG-669) The UAT's phone chapter opens the "Network" address `npm run dev` prints (a phone on the same Wi-Fi) — the
       private ranges a home or office network hands out, and a Mac's own `.local` name. */
    '192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local',
  ],

  /**
   * Every lead route is `force-dynamic`, and the client router treats dynamic entries as stale the moment they land —
   * so a prefetched tab was refetched on click anyway and the ghost flashed each time (user 2026-08-30: "why is there
   * a jerk when i navigate through tabs"). Holding them makes tab-to-tab instant; 30s → 300s so the cache outlasts a
   * demo's talking pauses (REG-238 — a tab explained for a minute went stale and the next hop refetched). Safe here
   * because every mutation goes through a server action that calls `revalidatePath`, which evicts these entries regardless.
   */
  experimental: {
    staleTimes: { dynamic: 300, static: 300 },
    /* (REG-673) The AI Visualizer saves renders and room photos through server actions as data URLs (up to three versions of a
       1600 px photo per Generate); the 1 MB default refused them. */
    serverActions: { bodySizeLimit: '12mb' },
  },

  transpilePackages: ['@openmaison/react'],   // @openmaison/icons is unused: the prototype renders Material Symbols (audit 2026-08-30)

  /*
   * `turbopack.root` and its react / react-dom / react-aria-components aliases used to live here: the design
   * system was linked from a sibling checkout OUTSIDE this repo, which forced the root to widen to the parent
   * directory, and the linked package carried its own node_modules — a second React instance that broke hooks
   * and every React Aria context. Both problems went with the link: the DS is vendored into `vendor/` now
   * (`npm run ds:vendor`), it declares no dependencies of its own, and it resolves inside this repo.
   */
}

export default nextConfig
