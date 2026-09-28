import { XraySetupGhost } from '@/components/xray/xray-setup-ghost'

/** Streams instantly while the leads and quotes load; PageReveal takes over the same ghost (REG-639: X-Ray's own; REG-708: scoped and the
    intro as the page will draw them). Its own route group: a comparison's record has its own. */
export default function Loading() {
  return <XraySetupGhost />
}
