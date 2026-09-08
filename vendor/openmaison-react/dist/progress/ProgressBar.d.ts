import { type ProgressBarProps as AriaProgressBarProps } from 'react-aria-components';
export interface ProgressBarProps extends Omit<AriaProgressBarProps, 'className' | 'children' | 'style'> {
    className?: string;
}
/**
 * Linear determinate progress indicator. 1:1 with the Figma "Linear" set on
 * the "Progress Indicators" page — see figma-export/progress.json for the
 * extracted contract. Figma's Progress variants (25/50/75/100/Custom) map to
 * the `value` prop (0–100 by default, adjustable via minValue/maxValue).
 *
 * `isIndeterminate` (looping sweep animation) is a code addition — Figma
 * defines only determinate variants.
 *
 * Not a visible-label component in Figma: pass `aria-label` (or
 * `aria-labelledby`) so the progressbar has an accessible name.
 */
export declare function ProgressBar({ className, ...rest }: ProgressBarProps): import("react").JSX.Element;
