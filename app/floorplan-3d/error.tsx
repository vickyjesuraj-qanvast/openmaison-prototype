'use client'

import { RouteError } from '@/components/shell/route-error'

/** (REG-2800) Floorplan to 3D Isometric failed: the shell stays, the notice says so, Try again and the way back (RouteError). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} section="Floorplan to 3D Isometric" back="/floorplan-3d" />
}
