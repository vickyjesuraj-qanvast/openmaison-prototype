import { DialogTrigger, type HeadingProps as AriaHeadingProps, type PopoverProps as AriaPopoverProps } from 'react-aria-components';
import type { HTMLAttributes, ReactNode } from 'react';
/**
 * Popover position relative to the trigger (React Aria convention).
 * Figma's "Marker Position" axis names the popover edge the MARKER sits on
 * instead, so each Figma option maps to the opposite side — e.g. the Figma
 * default "Top Left" (marker on the top edge, left corner) is
 * `placement="bottom left"` here. Full mapping:
 * figma-export/popover.json → placementMap.
 */
export type PopoverPlacement = 'top' | 'top left' | 'top right' | 'bottom' | 'bottom left' | 'bottom right' | 'left' | 'left top' | 'left bottom' | 'right' | 'right top' | 'right bottom';
export interface PopoverProps extends Omit<AriaPopoverProps, 'className' | 'children' | 'style' | 'placement'> {
    /**
     * Figma: Marker Position (opposite side — see PopoverPlacement). Figma's
     * default variant "Top Left" renders below the trigger, start-aligned.
     * @default 'bottom left'
     */
    placement?: PopoverPlacement;
    /** Figma: Marker — the 20×12 arrow pointing at the trigger. @default true */
    showMarker?: boolean;
    /**
     * Gap between trigger and popover. Figma does not specify one; defaults to
     * the marker height so the marker clears the trigger. @default 12
     */
    offset?: number;
    children: ReactNode;
    className?: string;
    /**
     * Accessible name for the popover dialog. Not needed when a PopoverHeader
     * is present (it labels the dialog automatically via slot="title").
     */
    'aria-label'?: string;
    'aria-labelledby'?: string;
}
/**
 * Floating card anchored to a trigger. 1:1 with the Figma "Popover"
 * component set — see figma-export/popover.json for the extracted contract.
 * Must be wrapped in a `PopoverTrigger` together with a pressable trigger
 * element (re-exported below). Compose content from `PopoverHeader`,
 * `PopoverBody` and `PopoverActions`.
 */
export declare function Popover({ placement, showMarker, offset, children, className, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, ...rest }: PopoverProps): import("react").JSX.Element;
export interface PopoverHeaderProps extends Omit<AriaHeadingProps, 'className' | 'style' | 'slot'> {
    className?: string;
}
/**
 * Figma layer "Header Title" (optional). Renders a heading with
 * slot="title", which also becomes the dialog's accessible name.
 */
export declare function PopoverHeader({ className, ...rest }: PopoverHeaderProps): import("react").JSX.Element;
export type PopoverBodyProps = HTMLAttributes<HTMLDivElement>;
/** Figma layer "Body" — the popover's supporting content. */
export declare function PopoverBody({ className, ...rest }: PopoverBodyProps): import("react").JSX.Element;
export type PopoverActionsProps = HTMLAttributes<HTMLDivElement>;
/**
 * Figma layer "Actions" — a row of Buttons. Nested primary Buttons are
 * recolored for the inverse surface exactly as the Figma instances override
 * them (filled → on-inverse-surface/primary bg, text → on-inverse-surface/
 * primary label).
 */
export declare function PopoverActions({ className, ...rest }: PopoverActionsProps): import("react").JSX.Element;
export { DialogTrigger as PopoverTrigger };
export type { DialogTriggerProps as PopoverTriggerProps } from 'react-aria-components';
