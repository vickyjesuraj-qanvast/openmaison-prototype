import type { HTMLAttributes, ReactNode } from 'react';
/**
 * Figma "State" variant property → code variant.
 * Error → 'error', Success → 'success', Notification → 'notification',
 * Dark Notification → 'dark-notification'.
 */
export type ToastVariant = 'error' | 'success' | 'notification' | 'dark-notification';
export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children' | 'style' | 'title'> {
    /** Figma: "Toast Title" text (heading/h4). */
    title: ReactNode;
    /** Figma: "Toast message" text (body/m). */
    children: ReactNode;
    /**
     * Figma: State. @default 'error' — mirrors the Figma default variant.
     */
    variant?: ToastVariant;
    /**
     * Figma: Leading Icon=On — renders when provided. Figma bakes the
     * placeholder glyph "add" into every Leading Icon=On variant (the page is
     * WIP); real per-state glyphs are an open design decision, so the icon is
     * consumer-provided (e.g. `<IconAdd />` from `@openmaison/icons`).
     * Note: Figma has NO Notification + Leading Icon=On variant (matrix hole).
     */
    iconStart?: ReactNode;
    /**
     * Figma bakes a Button (Primary/Filled/36) instance into every variant with
     * no Action=Off option; code renders the action button only when
     * actionLabel is provided. Colors follow the per-State Figma overrides.
     */
    actionLabel?: string;
    /** Called when the action button is pressed. */
    onAction?: () => void;
    /** Figma: Close Icon=On — the close icon button renders when provided. */
    onClose?: () => void;
    /** Accessible name for the close button (not in Figma). @default 'Dismiss' */
    closeLabel?: string;
    className?: string;
}
/**
 * ⚠️ WIP — the source Figma page is still labeled "🔸 Toast (WIP)"; this
 * component ships flagged as such pending design green-light. See
 * figma-export/toast.json for the extracted contract and the open findings
 * (deprecated shadow style, Notification icon matrix hole, placeholder glyph).
 *
 * Elevated message card with a title, message, optional leading icon, optional
 * action button, and optional close button, in four color states. 1:1 with the
 * Figma "Toast" component set (node 2631:3688, 14 variants). Placement and
 * auto-dismiss timing are left to the app.
 */
export declare function Toast({ title, children, variant, iconStart, actionLabel, onAction, onClose, closeLabel, className, ...rest }: ToastProps): import("react").JSX.Element;
