import { type LinkProps as AriaLinkProps } from 'react-aria-components';
import type { ReactNode } from 'react';
export interface LinkProps extends Omit<AriaLinkProps, 'className' | 'children' | 'style'> {
    /**
     * Figma: Type. Primary = brand color, no underline (standalone links);
     * Secondary = on-surface color, underlined (suited to inline use).
     * @default 'primary'
     */
    variant?: 'primary' | 'secondary';
    /** Figma: Leading Icon. Decorative — hidden from assistive tech. */
    iconStart?: ReactNode;
    /** Figma: Trailing Icon. Decorative — hidden from assistive tech. */
    iconEnd?: ReactNode;
    children: ReactNode;
    className?: string;
}
/**
 * Text hyperlink. 1:1 with the Figma "Link text" component set —
 * see figma-export/link.json for the extracted contract.
 *
 * Figma note: "Text style can be over-ridden depending on the placement and
 * usage of the link" — pass a className overriding `font` to match
 * surrounding copy when used inline.
 */
export declare function Link({ variant, iconStart, iconEnd, children, className, ...rest }: LinkProps): import("react").JSX.Element;
export interface IconLinkProps extends Omit<AriaLinkProps, 'className' | 'children' | 'style' | 'aria-label'> {
    /** Figma: Type. @default 'primary' */
    variant?: 'primary' | 'secondary';
    /**
     * Accessible name — required because the only content is a decorative icon
     * (code addition; the Figma component carries no label).
     */
    'aria-label': string;
    /** The icon. Decorative — hidden from assistive tech; aria-label names the link. */
    children: ReactNode;
    className?: string;
}
/**
 * Icon-only hyperlink. 1:1 with the Figma "Link Icon" component set —
 * see figma-export/link.json for the extracted contract.
 */
export declare function IconLink({ variant, children, className, ...rest }: IconLinkProps): import("react").JSX.Element;
