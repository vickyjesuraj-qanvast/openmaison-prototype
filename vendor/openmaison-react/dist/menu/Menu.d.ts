import { MenuTrigger as AriaMenuTrigger, SubmenuTrigger as AriaSubmenuTrigger, type MenuProps as AriaMenuProps, type MenuItemProps as AriaMenuItemProps, type SeparatorProps as AriaSeparatorProps, type Placement } from 'react-aria-components';
import { type ReactNode } from 'react';
/**
 * Behavioral trigger wrappers, re-exported from react-aria-components —
 * they render no DOM of their own, so there is nothing to style.
 * `MenuTrigger` pairs a pressable element (e.g. our Button) with a Menu;
 * `SubmenuTrigger` nests a Menu under a MenuItem (Figma's Trailing
 * Item=Icon chevron_right is the visual affordance for this).
 */
export { AriaMenuTrigger as MenuTrigger, AriaSubmenuTrigger as SubmenuTrigger };
export type { MenuTriggerProps, SubmenuTriggerProps } from 'react-aria-components';
export interface MenuProps<T extends object = object> extends Omit<AriaMenuProps<T>, 'className' | 'style'> {
    /** Popover placement relative to the trigger. @default 'bottom start' */
    placement?: Placement;
    /** Gap in px between trigger and menu. Not specified in Figma (no anchored example) — matches the container radius. @default 4 */
    offset?: number;
    className?: string;
}
/**
 * Menu overlay: popover container + list of menu items. Items are 1:1 with
 * the Figma "Menu" component set — see figma-export/menu.json for the
 * extracted contract. Figma defines only the item, not the container; the
 * popover surface (surface/default, radius-1, elevation level-2, 8px block
 * padding) is a code addition following the reference spec image on the
 * Figma page. Must be rendered inside a MenuTrigger or SubmenuTrigger.
 */
export declare function Menu<T extends object = object>({ placement, offset, className, selectionMode, ...rest }: MenuProps<T>): import("react").JSX.Element;
export interface MenuItemProps extends Omit<AriaMenuItemProps, 'className' | 'style' | 'children'> {
    /** Figma: Leading Item=Icon — 20px icon. Decorative — hidden from assistive tech. */
    iconStart?: ReactNode;
    /** Figma: Leading Item=Avatar — 24px slot, e.g. an <Avatar>. */
    avatar?: ReactNode;
    /** Figma: Trailing Item=Icon — 20px icon (chevron_right in Figma). Decorative — hidden from assistive tech. */
    iconEnd?: ReactNode;
    /** Figma: Trailing Item=Meta data — right-aligned secondary text (e.g. a keyboard shortcut). */
    meta?: ReactNode;
    children: ReactNode;
    className?: string;
}
/**
 * A single menu item. States map to Figma: Enabled (default), Hover
 * (data-hovered / data-focused), ☑️ Selected (data-selected +
 * primary/variant fill), 🚫 Disabled (50% opacity). The Figma Checkbox=Yes
 * axis renders automatically when the enclosing Menu has
 * selectionMode="multiple". Content order matches Figma:
 * Checkbox → Leading → Label → Trailing.
 */
export declare function MenuItem({ iconStart, avatar, iconEnd, meta, children, className, textValue, ...rest }: MenuItemProps): import("react").JSX.Element;
export interface MenuSeparatorProps extends Omit<AriaSeparatorProps, 'className' | 'style' | 'elementType' | 'orientation'> {
    className?: string;
}
/**
 * Divider between menu item groups. Figma defines no menu-specific divider;
 * this follows the Divider component's subtle horizontal rule (border-1,
 * surface/variant) with 8px block margin per the reference spec image.
 */
export declare function MenuSeparator({ className, ...rest }: MenuSeparatorProps): import("react").JSX.Element;
