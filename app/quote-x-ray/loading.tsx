import { XraySetupSkeleton } from '@/components/xray/xray-skeletons'

/** Streams instantly while the leads and quotes load; PageReveal takes over the same skeleton (REG-639: X-Ray's own ghost). */
export default function Loading() {
  return <XraySetupSkeleton />
}
