import { XrayLockedRecordSkeleton, XrayRecordSkeleton } from '@/components/xray/xray-skeletons'
import { LockAware } from '@/components/credits/pro-locked-ghost'

/** Streams instantly while the comparison loads — the record's own ghost (REG-639): the L2 header over the reading column. */
export default function Loading() {
  return <LockAware feature="quote_xray" locked={<XrayLockedRecordSkeleton />}><XrayRecordSkeleton /></LockAware>   // (pending modules S19)
}
