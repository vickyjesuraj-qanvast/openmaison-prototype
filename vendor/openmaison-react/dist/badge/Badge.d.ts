import type { HTMLAttributes } from 'react';
export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
    /**
     * Figma: Type — 'dot' is a 6px status dot, 'count' shows a number.
     * Figma's "Single digit" / "Multiple digits" variants are both 'count';
     * the geometry difference is derived from the rendered width.
     * @default 'dot'
     */
    variant?: 'dot' | 'count';
    /** Number shown when variant="count". Values above `max` render as "{max}+". */
    count?: number;
    /** Overflow cap for `count`, per Figma's "99+" sample. @default 99 */
    max?: number;
    className?: string;
}
/**
 * Status / count badge. 1:1 with the Figma "Badge" component set —
 * see figma-export/badge.json for the extracted contract.
 *
 * Non-interactive. The dot variant carries no text: pass `aria-label`
 * (and a `role` such as "status" when it updates live) if the badge's
 * meaning must reach assistive tech.
 */
export declare function Badge({ variant, count, max, className, ...rest }: BadgeProps): import("react").JSX.Element;
