import { type ToggleButtonGroupProps as AriaToggleButtonGroupProps, type ToggleButtonProps as AriaToggleButtonProps } from 'react-aria-components';
import type { ReactNode } from 'react';
export interface SegmentedButtonProps extends Omit<AriaToggleButtonGroupProps, 'className' | 'children' | 'style' | 'orientation' | 'selectionMode'> {
    /** Figma: Height (text set) / Size (icon set) — md=36, lg=48. @default 'md' */
    size?: 'md' | 'lg';
    /**
     * Code addition (pending design sign-off): defaults to true because every
     * Figma master shows exactly one selected segment.
     */
    disallowEmptySelection?: boolean;
    children: ReactNode;
    className?: string;
}
/**
 * Single-select segmented control. 1:1 with the Figma "Segmented Button"
 * (3642:2837) and "Segmented Icon Button" (3645:2821) component sets — see
 * figma-export/segmented-button.json for the extracted contract.
 *
 * Selection mode is hardcoded to single: Figma masters always show exactly
 * one selected segment and define no multi-select affordance (code decision,
 * flagged in the contract). React Aria exposes single-select groups as
 * radiogroup/radio. Figma supports 2–5 segments; code accepts any number of
 * SegmentedButtonItem children ≥ 2.
 */
export declare function SegmentedButton({ size, disallowEmptySelection, children, className, ...rest }: SegmentedButtonProps): import("react").JSX.Element;
export interface SegmentedButtonItemProps extends Omit<AriaToggleButtonProps, 'className' | 'children' | 'style'> {
    /** Figma: Leading Icon. Decorative — hidden from assistive tech. */
    iconStart?: ReactNode;
    /**
     * Omit children for an icon-only segment (the Figma "Segmented Icon Button"
     * set — square segments). Icon-only segments MUST carry an aria-label.
     */
    children?: ReactNode;
    className?: string;
}
/**
 * One segment. States map to the Figma building blocks: Enabled (default),
 * Hover (data-hovered / data-pressed — one shared treatment), Disabled
 * (data-disabled, whole-node opacity 0.5), Selected (data-selected).
 */
export declare function SegmentedButtonItem({ iconStart, children, className, ...rest }: SegmentedButtonItemProps): import("react").JSX.Element;
