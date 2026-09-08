import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
export interface BottomNavProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
    /** BottomNavItem elements. Pass aria-label when the page has more than one <nav>. */
    children: ReactNode;
    className?: string;
}
/**
 * Mobile bottom navigation bar. 1:1 with the Figma "Bottom Nav" page
 * (tab set "Bottom Nav/.Tab", bar usage "Qanvast") — see
 * figma-export/bottom-nav.json for the extracted contract.
 *
 * Semantic <nav>: items are links (or buttons) with aria-current="page"
 * marking the active destination. The bar is fluid-width (Figma's 360px
 * demo frame is a fixed mobile width); it does not position itself —
 * dock it with position: fixed / sticky at the app level.
 */
export declare function BottomNav({ children, className, ...rest }: BottomNavProps): import("react").JSX.Element;
interface BottomNavItemBaseProps {
    /** Figma: Tab Icon — 24px. Decorative, hidden from assistive tech. */
    icon: ReactNode;
    /**
     * Figma: Badge — 6px notification dot on the icon's top-right corner
     * (composes the shipped Badge dot with the tab's white ring override).
     * Purely visual; when it conveys information, also expose it in the
     * item's accessible label. @default false
     */
    badge?: boolean;
    /** Figma: Active. Marks the current destination (aria-current="page"). @default false */
    isActive?: boolean;
    /** Renders an <a> when set; a <button> otherwise. */
    href?: string;
    /** Figma: Tab Name — the label under the icon. */
    children: ReactNode;
    className?: string;
}
export type BottomNavItemProps = BottomNavItemBaseProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement> & ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'href' | 'type'>;
/**
 * One destination in the bottom bar: icon over an uppercase label.
 * Maps Figma's Active=True/False to aria-current + data-active. Renders
 * an <a> when `href` is given, otherwise a <button> (e.g. router
 * navigation via onClick).
 */
export declare function BottomNavItem({ icon, badge, isActive, href, children, className, ...rest }: BottomNavItemProps): import("react").JSX.Element;
export {};
