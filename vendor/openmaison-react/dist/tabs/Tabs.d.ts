import { type TabsProps as AriaTabsProps, type TabListProps as AriaTabListProps, type TabProps as AriaTabProps, type TabPanelProps as AriaTabPanelProps } from 'react-aria-components';
import type { ReactNode } from 'react';
export interface TabsProps extends Omit<AriaTabsProps, 'className' | 'style' | 'orientation'> {
    className?: string;
}
/**
 * Tabs root. 1:1 with the Figma "Tab Item" component set — see
 * figma-export/tab.json for the extracted contract. Horizontal only:
 * Figma defines no vertical orientation.
 */
export declare function Tabs({ className, ...rest }: TabsProps): import("react").JSX.Element;
export interface TabListProps<T extends object = object> extends Omit<AriaTabListProps<T>, 'className' | 'style'> {
    className?: string;
}
/**
 * Container for Tab items. Figma has no TabList component or usage frame,
 * so the 24px gap between items is a code addition pending design sign-off.
 */
export declare function TabList<T extends object = object>({ className, ...rest }: TabListProps<T>): import("react").JSX.Element;
export interface TabProps extends Omit<AriaTabProps, 'className' | 'style' | 'children'> {
    /** Figma: Leading Icon. Decorative — hidden from assistive tech. */
    iconStart?: ReactNode;
    /** Figma: Trailing Icon. Decorative — hidden from assistive tech. */
    iconEnd?: ReactNode;
    /**
     * Figma: Badge — 6px notification dot. Purely visual; when it conveys
     * information, also expose it in the tab's accessible label.
     */
    badge?: boolean;
    children: ReactNode;
    className?: string;
}
/**
 * A single tab. States map to Figma: Enabled (default), Hover
 * (data-hovered), Selected (data-selected + 4px bottom indicator).
 */
export declare function Tab({ iconStart, iconEnd, badge, children, className, ...rest }: TabProps): import("react").JSX.Element;
export interface TabPanelProps extends Omit<AriaTabPanelProps, 'className' | 'style'> {
    className?: string;
}
/**
 * Content panel for a tab. Figma defines no panel styling — intentionally
 * unstyled apart from the keyboard focus ring.
 */
export declare function TabPanel({ className, ...rest }: TabPanelProps): import("react").JSX.Element;
