/*
 * (pending modules S34) Next calls `register` once when a server starts, before it serves a request — the one place the real services are
 * plugged in (lib/services/install.ts). Node only: the edge runtime runs no seams.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { installServices } = await import('./lib/services/install')
    installServices()
  }
}
