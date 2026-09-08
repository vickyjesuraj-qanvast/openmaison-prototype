import { type SearchFieldProps as AriaSearchFieldProps } from 'react-aria-components';
import type { ReactNode } from 'react';
export interface SearchBarProps extends Omit<AriaSearchFieldProps, 'className' | 'children' | 'style'> {
    /** Figma: Size — md=36, lg=48. @default 'md' */
    size?: 'md' | 'lg';
    /** Figma: Style. @default 'filled' */
    appearance?: 'filled' | 'outlined';
    /** Placeholder shown while empty (Figma 👀 Empty state). */
    placeholder?: string;
    /**
     * Figma: Trailing icon — persistent action slot rendered after the clear
     * affordance. Decorative — hidden from assistive tech; expose interactive
     * trailing actions outside the search bar instead.
     */
    iconEnd?: ReactNode;
    /** Accessible name for the built-in clear button. @default 'Clear search' */
    clearButtonLabel?: string;
    className?: string;
}
/**
 * Search input with a leading search icon and a clear affordance. 1:1 with
 * the Figma "Search Bar" component set — see figma-export/search-bar.json
 * for the extracted contract.
 *
 * Figma's State axis maps to: Empty/Filled = RAC [data-empty], Active =
 * :focus-within. The clear button (Figma's Clear Icon, shown in the Filled
 * and Active states) is hidden via CSS while the field is empty; pressing
 * it clears the value, and Escape does the same (RAC SearchField built-in).
 *
 * Provide an accessible name via `aria-label` (the design has no visible
 * label).
 */
export declare function SearchBar({ size, appearance, placeholder, iconEnd, clearButtonLabel, className, ...rest }: SearchBarProps): import("react").JSX.Element;
