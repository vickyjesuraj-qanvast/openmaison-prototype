import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { type IconLinkProps, type LinkProps } from '../link/Link';
export interface FooterProps extends ComponentPropsWithoutRef<'footer'> {
    children: ReactNode;
    className?: string;
}
/**
 * Page footer landmark (`<footer>`, implicit `contentinfo` role). Fluid
 * width — stretches to its container; consumers control page gutters.
 * Compose with FooterNav / FooterColumn / FooterLink for link columns and
 * FooterBottom / FooterSocial for the legal bar and social icons.
 */
export declare function Footer({ children, className, ...rest }: FooterProps): import("react").JSX.Element;
export interface FooterNavProps extends ComponentPropsWithoutRef<'nav'> {
    className?: string;
}
/**
 * Navigation landmark wrapping the link columns. Responsive grid: columns
 * wrap automatically on narrow viewports (no Figma breakpoints exist).
 * Defaults its accessible name to "Footer" so the landmark is distinguishable
 * from a page's main nav; override via aria-label.
 */
export declare function FooterNav({ className, 'aria-label': ariaLabel, ...rest }: FooterNavProps): import("react").JSX.Element;
export interface FooterColumnProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
    /** Column heading, rendered as an <h3> and linked to the list via aria-labelledby. */
    title: ReactNode;
    /** FooterLink items (each renders its own <li>). */
    children: ReactNode;
    className?: string;
}
/**
 * One column of footer links: a heading plus a labelled list.
 */
export declare function FooterColumn({ title, children, className, ...rest }: FooterColumnProps): import("react").JSX.Element;
export interface FooterLinkProps extends LinkProps {
}
/**
 * A footer navigation link: an <li> wrapping the shipped Link component.
 * Defaults to variant="secondary" (on-surface, underlined) — the neutral
 * Link type — rather than Link's own primary default.
 */
export declare function FooterLink({ variant, ...rest }: FooterLinkProps): import("react").JSX.Element;
export interface FooterSocialProps extends ComponentPropsWithoutRef<'ul'> {
    className?: string;
}
/**
 * Horizontal list of social-media icon links. Defaults its accessible name
 * to "Social media"; override via aria-label.
 */
export declare function FooterSocial({ className, 'aria-label': ariaLabel, ...rest }: FooterSocialProps): import("react").JSX.Element;
export interface FooterSocialLinkProps extends IconLinkProps {
}
/**
 * A social icon link: an <li> wrapping the shipped IconLink component
 * (aria-label required — the only content is a decorative icon). Defaults to
 * variant="secondary" (on-surface) rather than IconLink's primary default.
 */
export declare function FooterSocialLink({ variant, ...rest }: FooterSocialLinkProps): import("react").JSX.Element;
export interface FooterBottomProps extends ComponentPropsWithoutRef<'div'> {
    className?: string;
}
/**
 * Bottom bar (copyright / legal links / social icons). Separated from the
 * content above by a subtle top rule (Divider "subtle" color) and wraps on
 * narrow viewports.
 */
export declare function FooterBottom({ className, ...rest }: FooterBottomProps): import("react").JSX.Element;
