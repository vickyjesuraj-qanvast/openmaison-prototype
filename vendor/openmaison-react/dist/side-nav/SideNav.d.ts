import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
export interface SideNavProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
    /**
     * Figma: Expanded — false is the 48px icon rail, true the 200px full nav.
     * @default false (Figma's default variant is the collapsed rail)
     */
    isExpanded?: boolean;
    /** Accessible name for the navigation landmark (required — pages often have several navs). */
    'aria-label': string;
    children: ReactNode;
    className?: string;
}
/**
 * Vertical app-shell navigation. 1:1 with the Figma "Side Nav / Item"
 * component set and the "Qanaid" shell set — see figma-export/side-nav.json
 * for the extracted contract. Semantic HTML (nav > ul > li), no RAC.
 *
 * Figma's fixed 740px demo height becomes fluid (100% of the parent), and
 * the 200px expanded width is a default that can be overridden via className.
 */
export declare function SideNav({ isExpanded, className, children, ...rest }: SideNavProps): import("react").JSX.Element;
export interface SideNavSectionProps extends Omit<HTMLAttributes<HTMLUListElement>, 'className' | 'style'> {
    /** Accessible name for this group of items. */
    'aria-label'?: string;
    children: ReactNode;
    className?: string;
}
/**
 * Structural grouping of items (a nested list). Figma defines no section
 * styling — this is a purely semantic code addition; see side-nav.json.
 */
export declare function SideNavSection({ className, children, ...rest }: SideNavSectionProps): import("react").JSX.Element;
export interface SideNavItemProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'style' | 'children'> {
    /** Figma: the 20px leading icon. Decorative — hidden from assistive tech. */
    icon?: ReactNode;
    /**
     * Figma: Badge — 6px notification dot (Badge sibling component). Purely
     * visual; when it conveys information, also expose it in the item's label.
     */
    badge?: boolean;
    /** Figma: State=Selected. Renders aria-current="page". */
    isSelected?: boolean;
    children: ReactNode;
    className?: string;
}
/**
 * A single navigation item. Renders an anchor when `href` is given, a
 * button otherwise. States map to Figma: Enabled (default), Hover (:hover),
 * Selected (data-selected + aria-current="page").
 */
export declare function SideNavItem({ icon, badge, isSelected, href, children, className, ...rest }: SideNavItemProps): import("react").JSX.Element;
export interface SideNavGroupProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style' | 'children'> {
    /** Figma: the 20px leading icon. Decorative — hidden from assistive tech. */
    icon?: ReactNode;
    /** Figma: Badge — 6px notification dot. */
    badge?: boolean;
    /** Label of the disclosure toggle. */
    label: ReactNode;
    /** Controlled open state of the sub-item list. */
    isOpen?: boolean;
    /** Uncontrolled initial open state. @default false */
    defaultOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    /** Sub-items (SideNavItem). Indented per Figma's preserved icon slot. */
    children: ReactNode;
    className?: string;
}
/**
 * Disclosure group: an item with a child-item list (Figma: "Child indicator"
 * boolean + the Qanaid "Catalog Submenu" variant). Expanded nav shows a
 * chevron (down closed / up open, per Figma's expand_more / expand_less);
 * the collapsed rail shows Figma's 12px more_vert kebab at the item's edge
 * and hides the sub-list (Figma defines no collapsed submenu).
 */
export declare function SideNavGroup({ icon, badge, label, isOpen, defaultOpen, onOpenChange, onClick, children, className, ...rest }: SideNavGroupProps): import("react").JSX.Element;
