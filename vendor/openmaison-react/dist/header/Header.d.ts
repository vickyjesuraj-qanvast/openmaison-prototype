import type { ComponentPropsWithoutRef, ReactNode } from 'react';
export interface HeaderProps extends ComponentPropsWithoutRef<'header'> {
    /**
     * Which Figma header this bar reproduces:
     * - `global` — "Global Header/Prata" set: 60px, bottom border, 6/24 gutters.
     * - `page` — "Qanvast - Project": 60px, back button + breadcrumb title, 8/24 gutters.
     * - `workspace` — "Qanvast - Workspace": 64px, title + search, 24px gutters.
     * - `section` — "Section header": 56px, heading/h3 title, 24px gutters.
     * - `mobile` — "Mobile/Generic": 56px, 16px gutters.
     * @default 'global'
     */
    variant?: 'global' | 'page' | 'workspace' | 'section' | 'mobile';
    /**
     * Raises the bar on level-1 elevation (e.g. once content scrolls beneath).
     * CODE ADDITION — Figma defines no scroll/elevation state on any header
     * master (verified: zero effect styles). Pending design sign-off.
     */
    elevated?: boolean;
    children: ReactNode;
    className?: string;
}
/**
 * App/page header bar (`<header>` landmark; implicit `banner` role when
 * top-level). Fluid width — stretches to its container. Compose with
 * HeaderSection / HeaderLogo / HeaderNav / HeaderTitle plus shipped siblings
 * (Button, SearchBar, Avatar, Tag) for the slot content.
 */
export declare function Header({ variant, elevated, children, className, ...rest }: HeaderProps): import("react").JSX.Element;
export interface HeaderSectionProps extends ComponentPropsWithoutRef<'div'> {
    /**
     * Spacing between items — the gaps observed across the Figma masters:
     * xs=4 (breadcrumb cluster), sm=8 (global left set / utility cluster),
     * md=12 (page actions), lg=16 (mobile row / profile cluster),
     * xl=24 (workspace clusters). @default 'sm'
     */
    gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    children: ReactNode;
    className?: string;
}
/**
 * A cluster of header content (Figma "Left Set" / "Right Set" /
 * "Global Utilities" frames). The Header root lays sections out with
 * space-between; sections align their own children on a token gap scale.
 */
export declare function HeaderSection({ gap, children, className, ...rest }: HeaderSectionProps): import("react").JSX.Element;
export interface HeaderLogoProps extends ComponentPropsWithoutRef<'div'> {
    /**
     * Figma: "Subset" product label ("OMS"/"VMS"/…), rendered after a 1×20
     * hairline separator. The Figma Platform variant axis only swaps this
     * artwork — code exposes it as a free slot instead of an enum.
     */
    product?: ReactNode;
    /** Brand logo artwork (Figma "Logo" instance slot, 20px tall in the master). */
    children: ReactNode;
    className?: string;
}
/**
 * Logo slot of the global header (Figma "Logo Slot": brand logo, hairline
 * separator, product label). Decorative separator is hidden from assistive
 * tech; give linked logos their own accessible name.
 */
export declare function HeaderLogo({ product, children, className, ...rest }: HeaderLogoProps): import("react").JSX.Element;
export interface HeaderNavProps extends ComponentPropsWithoutRef<'nav'> {
    children: ReactNode;
    className?: string;
}
/**
 * Primary navigation slot. CODE ADDITION — no Figma header master contains
 * nav links (they appear only in flattened product screenshots on the page),
 * so structure and the 24px link gap are pending design sign-off. Defaults
 * its accessible name to "Primary"; override via aria-label.
 */
export declare function HeaderNav({ children, className, 'aria-label': ariaLabel, ...rest }: HeaderNavProps): import("react").JSX.Element;
export interface HeaderTitleProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
    /**
     * Heading element. Defaults to h1 (one page header per page); pick the
     * level that fits the document outline — Figma encodes no semantics.
     * @default 'h1'
     */
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div';
    /** Figma: breadcrumb line above the title ("Projects/"), body/s secondary. */
    eyebrow?: ReactNode;
    /** Figma (Mobile/Generic): "Secondary text" below the title, body/s secondary. */
    subtitle?: ReactNode;
    /**
     * Content beside the title (Figma: Tag chip, inline edit Icon Button) —
     * kept OUTSIDE the heading element so it never pollutes the accessible
     * heading text.
     */
    accessory?: ReactNode;
    children: ReactNode;
    className?: string;
}
/**
 * Header title block (Figma "Page details" / "Title and secondary text"):
 * optional eyebrow above, heading + accessory row, optional subtitle below.
 * Typography adapts to the Header variant (subheading/xl; section →
 * heading/h3; mobile → heading/h4).
 */
export declare function HeaderTitle({ as: Heading, eyebrow, subtitle, accessory, children, className, ...rest }: HeaderTitleProps): import("react").JSX.Element;
