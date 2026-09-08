import type { HTMLAttributes, ReactNode } from 'react';
export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'children' | 'style' | 'color'> {
    /** Figma: Style. @default 'filled' */
    appearance?: 'filled' | 'outlined';
    /** Figma: Color. @default 'default' */
    color?: 'default' | 'red' | 'green' | 'blue' | 'yellow';
    /** Figma: Leading Icon. Decorative — hidden from assistive tech. */
    iconStart?: ReactNode;
    /** Figma: Trailing Icon. Decorative — hidden from assistive tech. */
    iconEnd?: ReactNode;
    children: ReactNode;
    className?: string;
}
/**
 * Static, non-interactive label. 1:1 with the Figma "Tag" component set —
 * see figma-export/tag.json for the extracted contract.
 */
export declare function Tag({ appearance, color, iconStart, iconEnd, children, className, ...rest }: TagProps): import("react").JSX.Element;
