import { TooltipTrigger, type TooltipProps as AriaTooltipProps } from 'react-aria-components';
import type { ReactNode } from 'react';
/**
 * Tooltip position relative to the trigger (React Aria convention).
 * Figma's "Position" axis names the edge the TIP sits on instead, so each
 * Figma option maps to the opposite side — e.g. Figma "Top Centre" (tip on
 * top) is `placement="bottom"` here. Full mapping:
 * figma-export/tooltip.json → placementMap.
 */
export type TooltipPlacement = 'top' | 'top left' | 'top right' | 'bottom' | 'bottom left' | 'bottom right' | 'left' | 'right';
export interface TooltipProps extends Omit<AriaTooltipProps, 'className' | 'children' | 'style' | 'placement'> {
    /**
     * Figma: Position. Figma's default variant "Top Centre" (tip on the top
     * edge) renders below the trigger. @default 'bottom'
     */
    placement?: TooltipPlacement;
    /** Figma: Tip — the 8×4 arrow pointing at the trigger. @default true */
    showTip?: boolean;
    /**
     * Gap between trigger and tooltip. Figma does not specify one; defaults to
     * the tip height so the tip clears the trigger. @default 4
     */
    offset?: number;
    children: ReactNode;
    className?: string;
}
/**
 * Contextual label shown on hover / keyboard focus. 1:1 with the Figma
 * "Tooltip" component set — see figma-export/tooltip.json for the extracted
 * contract. Must be wrapped in a `TooltipTrigger` together with a focusable
 * trigger element (re-exported below).
 */
export declare function Tooltip({ placement, showTip, offset, children, className, ...rest }: TooltipProps): import("react").JSX.Element;
export { TooltipTrigger };
export type { TooltipTriggerComponentProps as TooltipTriggerProps } from 'react-aria-components';
