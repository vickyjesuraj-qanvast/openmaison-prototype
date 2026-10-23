'use client'

import type { ReactNode, RefObject } from 'react'
import { useMediaQuery } from '@/lib/breakpoint'
import { PortalMenu } from '@/components/om/portal-menu'
import { Sheet, sheetMenuBody } from '@/components/om/sheet'
import { PHONE_MODEL } from './model'

/**
 * (contracts on the move, Q-01) A menu that is a bottom sheet on a phone AND on a tablet held upright, and the house anchored PortalMenu on a
 * tablet held sideways (which still becomes a sheet on a phone held sideways — the PortalMenu's own rule). The rows are DropdownItems either
 * way; `footer` is the sheet's pinned row (the tablet's menu has none — its host draws that control in the row).
 */
export function MenuOrSheet({ open, onClose, anchor, title, width, align = 'left', children, footer }: {
  open: boolean; onClose: () => void; anchor: RefObject<HTMLElement | null>; title: string; width: number; align?: 'left' | 'right'
  children: ReactNode; footer?: ReactNode
}) {
  const sheet = useMediaQuery(PHONE_MODEL)
  if (sheet) {
    return <Sheet open={open} onClose={onClose} title={title} label={title} role="menu" bodyClassName={sheetMenuBody} footer={footer}>{children}</Sheet>
  }
  return <PortalMenu open={open} anchor={anchor} onClose={onClose} align={align} width={width} role="menu" sheetTitle={title}>{children}</PortalMenu>
}
