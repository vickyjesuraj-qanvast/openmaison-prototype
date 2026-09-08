import { type ProgressBarProps as AriaProgressBarProps } from 'react-aria-components';
export interface ProgressCircleProps extends Omit<AriaProgressBarProps, 'className' | 'children' | 'style'> {
    className?: string;
}
/**
 * Circular determinate progress indicator. 1:1 with the Figma "Circular" set
 * on the "Progress Indicators" page — see figma-export/progress.json for the
 * extracted contract. The arc starts at 12 o'clock and sweeps clockwise with
 * flat ends, exactly as the Figma arc does; Figma draws no background track
 * ring, so neither does code.
 *
 * `isIndeterminate` (spinning 25% arc) is a code addition — Figma defines
 * only determinate variants.
 *
 * Not a visible-label component in Figma: pass `aria-label` (or
 * `aria-labelledby`) so the progressbar has an accessible name.
 */
export declare function ProgressCircle({ className, ...rest }: ProgressCircleProps): import("react").JSX.Element;
