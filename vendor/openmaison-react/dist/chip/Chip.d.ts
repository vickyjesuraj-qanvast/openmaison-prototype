import { type ButtonProps as AriaButtonProps } from 'react-aria-components';
import type { ReactNode } from 'react';
export interface ChipProps extends Omit<AriaButtonProps, 'className' | 'children' | 'style' | 'render' | 'isPending'> {
    /** Figma: component set — Action, Choice, Filter or Input. @default 'action' */
    variant?: 'action' | 'choice' | 'filter' | 'input';
    /** Figma: Selected — `variant="choice"` only (renders a ToggleButton). Controlled. */
    isSelected?: boolean;
    /** Choice only: uncontrolled initial selection. */
    defaultSelected?: boolean;
    /** Choice only: called when selection changes. */
    onChange?: (isSelected: boolean) => void;
    /** Figma: Filter Applied — `variant="filter"` only; leading primary indicator dot. @default false */
    isApplied?: boolean;
    /** Figma: Leading Item=Icon. Decorative — hidden from assistive tech. */
    iconStart?: ReactNode;
    /** Figma: Leading Item=Avatar — 24px slot. Decorative — hidden from assistive tech. */
    avatar?: ReactNode;
    /** Figma: Trailing icon/Trailing Icon. Decorative — hidden from assistive tech. */
    iconEnd?: ReactNode;
    children: ReactNode;
    className?: string;
}
/**
 * Compact element for actions, selections, filters and user input. 1:1 with
 * the four Figma chip component sets — Action, Choice, Filter, Input — which
 * share identical geometry; see figma-export/chip.json for the contract.
 *
 * `variant="choice"` renders a React Aria ToggleButton (exposes aria-pressed
 * and data-selected); the other variants render a plain Button.
 */
export declare function Chip({ variant, isSelected, defaultSelected, onChange, isApplied, iconStart, avatar, iconEnd, children, className, ...rest }: ChipProps): import("react").JSX.Element;
