import { type ListBoxProps as AriaListBoxProps, type ListBoxItemProps as AriaListBoxItemProps } from 'react-aria-components';
import type { ReactNode } from 'react';
export interface ListProps<T extends object = object> extends Omit<AriaListBoxProps<T>, 'className' | 'style' | 'orientation' | 'layout'> {
    className?: string;
}
/**
 * List container. Figma defines no list container component (only the
 * "One Line" / "Two Line" / "Multi Line" item sets), so this is a plain
 * vertical stack — a code addition. Selection, keyboard navigation and
 * typeahead come from react-aria ListBox; leave `selectionMode` unset
 * for a non-selectable display list.
 */
export declare function List<T extends object = object>({ className, ...rest }: ListProps<T>): import("react").JSX.Element;
export interface ListItemProps extends Omit<AriaListBoxItemProps, 'className' | 'style' | 'children'> {
    /** Figma: Leading Item=Icon — 20px decorative icon, hidden from assistive tech. */
    icon?: ReactNode;
    /**
     * Figma: Leading Item=Avatar/Image — 40×40 leading media slot (Avatar,
     * <img>, thumbnail…). Takes precedence over `icon` when both are given,
     * mirroring Figma's single Leading Item variant axis.
     */
    avatar?: ReactNode;
    /**
     * Secondary text. Absent → Figma "One Line" set; present → "Two Line"
     * (single line, truncated) unless `multiline` is set.
     */
    description?: ReactNode;
    /** Figma: "Multi Line" set — the description wraps instead of truncating. */
    multiline?: boolean;
    /** Figma: Trailing Item=Meta data — small trailing text (timestamps, counts…). */
    meta?: ReactNode;
    /** Figma: Trailing Item=Icon. Decorative — hidden from assistive tech. */
    trailingIcon?: ReactNode;
    /** Primary text. */
    children: ReactNode;
    className?: string;
}
/**
 * A single list row. 1:1 with the Figma "One Line" / "Two Line" /
 * "Multi Line" component sets — see figma-export/list.json for the
 * extracted contract. States map to Figma: Hover=Yes (data-hovered),
 * Selected=Yes (data-selected).
 */
export declare function ListItem({ icon, avatar, description, multiline, meta, trailingIcon, children, className, textValue, ...rest }: ListItemProps): import("react").JSX.Element;
