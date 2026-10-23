'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import header from '@/components/quotes/editor/editor-header.module.css'

/**
 * (REG-587) What the Send button does at this status: `approval` = plain Send (for approval) · `client` = Send ▾ with
 * "Send for confirmation" and "Send for signature" · `confirmed` = "Send for signature" (the contract with the T&Cs) ·
 * `done` = inert with `sendHint`.
 */
export type SendKind = 'approval' | 'client' | 'confirmed' | 'done'
/** (UX audit Q2) `other` = "Sent it another way": the client has it by other means — the quote is marked Sent to Client, nothing goes out. */
export type SendMode = 'next' | 'confirmation' | 'signature' | 'other'

/**
 * The quote's Send — one button for the editor's header and Preview's bar (UX audit Q2: Preview's main button was "Mark as sent", which
 * sent nothing; it is this Send ▾ now, the same menu and the same dialogs). On a Draft or an Approved quote the menu ends with "Sent it
 * another way" — the old Mark as sent, named for what it does. The chevron's classes are the editor header's own (REG-732).
 * (quotes on the move 2026-10-22, K1's ask) `side` and `align`: a Send ▾ mounted in a screen's foot opens its menu upward and to the
 * right, through the Dropdown's own props — no override from the host.
 */
export function SendButton({ kind, canSend, hint, status, onSend, variation = false, side = 'down', align = 'left' }: {
  kind: SendKind; canSend: boolean; hint: string; status: string; onSend: (mode: SendMode) => void
  /** (Projects round 5, F-07) a variation order: the client approves it on its link — no agreement to sign */
  variation?: boolean
  /** Where the menu opens from the button: below (the header's) or above (a foot's). */
  side?: 'down' | 'up'
  /** Which edge of the button the menu lines up with. */
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const pick = (mode: SendMode) => () => { setOpen(false); onSend(mode) }
  const markable = status === 'Draft' || status === 'Approved'
  if (canSend && kind === 'client') {
    return (
      <>
        {/* (REG-587) Send ▾: the client can confirm on a link first (Mavid's flow), or get the agreement for signature straight away. */}
        <Button variant="primary" iconEnd={<span className={`${header.chev} ${header.onFill}`} data-open={open || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
                aria-haspopup="menu" aria-expanded={open} onPress={() => setOpen((o) => !o)} data-testid="quote-send">Send</Button>
        {/* (REG-728) Rows with a description: the 320 width, the description as the house row's second line. */}
        <Dropdown open={open} onClose={() => setOpen(false)} align={align} side={side} width={MENU_WIDTH.detail} sheetTitle="Send">
          {variation
            ? <DropdownItem onSelect={pick('confirmation')} help="The client approves the change on a link — the contract value moves once they do">Send for confirmation</DropdownItem>
            : <DropdownItem onSelect={pick('confirmation')} help="The client confirms the quote on a link — no signature yet">Send for confirmation</DropdownItem>}
          {variation ? null : <DropdownItem onSelect={pick('signature')} help="Add the T&Cs and raise the agreement to sign">Send for signature</DropdownItem>}
          {markable ? (
            <>
              <DropdownDivider />
              <DropdownItem onSelect={pick('other')} help="The client has it already — marks it Sent to Client, sends nothing">Sent it another way</DropdownItem>
            </>
          ) : null}
        </Dropdown>
      </>
    )
  }
  if (canSend && kind === 'confirmed') {
    return (
      <Tooltip label="Add the T&Cs and send the agreement for signature">
        <span><Button variant="primary" onPress={() => onSend('signature')} data-testid="quote-send">Send for signature</Button></span>
      </Tooltip>
    )
  }
  if (canSend) return <Button variant="primary" onPress={() => onSend('next')} data-testid="quote-send">Send</Button>
  return (
    <Tooltip label={hint}>
      <span><Button variant="primary" isDisabled data-testid="quote-send">Send</Button></span>
    </Tooltip>
  )
}
