import type { HTMLAttributes, ReactNode } from 'react';
export interface SnackbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children' | 'style'> {
    /** Figma: "Snackbar label" text. */
    children: ReactNode;
    /** Figma: Action=True — renders the trailing text action button. */
    actionLabel?: string;
    /** Called when the action button is pressed. */
    onAction?: () => void;
    /**
     * Figma: Close affordance=True — the close icon button renders when this
     * is provided. Figma notes: without any action the snackbar should
     * auto-dismiss (min 4s, max 10s); timing is the consumer's responsibility.
     */
    onClose?: () => void;
    /** Accessible name for the close button (not in Figma). @default 'Dismiss' */
    closeLabel?: string;
    /**
     * Figma set: 'inline' = "Snackbar/Default" (single row),
     * 'stacked' = "Snackbar/Longer Action" (actions on a second row).
     * @default 'inline'
     */
    layout?: 'inline' | 'stacked';
    className?: string;
}
/**
 * Inverse-surface message bar shown temporarily towards the bottom of the
 * screen. 1:1 with the Figma "Snackbar/Default" and "Snackbar/Longer Action"
 * component sets — see figma-export/snackbar.json for the extracted contract.
 * Placement (fixed positioning) and auto-dismiss timing are left to the app.
 */
export declare function Snackbar({ children, actionLabel, onAction, onClose, closeLabel, layout, className, ...rest }: SnackbarProps): import("react").JSX.Element;
