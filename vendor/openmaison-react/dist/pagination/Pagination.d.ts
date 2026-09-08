import { type ButtonProps as AriaButtonProps } from 'react-aria-components';
import type { HTMLAttributes, ReactNode } from 'react';
export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
    children: ReactNode;
    className?: string;
}
/**
 * Pagination root — a `nav` landmark laying out its items in a 4px-gap row.
 * 1:1 with the Figma "Pagination" page ("Basic" / "More pages" patterns) —
 * see figma-export/pagination.json for the extracted contract. Figma defines
 * no semantics; the default aria-label "Pagination" is a code addition.
 */
export declare function Pagination({ children, className, 'aria-label': ariaLabel, ...rest }: PaginationProps): import("react").JSX.Element;
export interface PaginationItemProps extends Omit<AriaButtonProps, 'className' | 'children' | 'style'> {
    /** Figma: State=Selected. Sets aria-current="page". @default false */
    isCurrent?: boolean;
    /** The page number label. */
    children: ReactNode;
    className?: string;
}
/**
 * A page-number button. States map to Figma "Elements/Page Number":
 * Enabled (default), Hover (data-hovered), Selected (isCurrent →
 * data-current + aria-current="page"). Figma's Digit=1-2/2+ axis only
 * changes the label; code lets wide numbers grow past the 36px min-width.
 */
export declare function PaginationItem({ isCurrent, children, className, ...rest }: PaginationItemProps): import("react").JSX.Element;
export interface PaginationPreviousProps extends Omit<AriaButtonProps, 'className' | 'children' | 'style'> {
    className?: string;
}
/**
 * Previous-page control. States map to Figma "Elements/Previous":
 * Enabled, Hover (data-hovered), Disabled (isDisabled → data-disabled).
 * Icon-only; the default aria-label "Previous page" is a code addition.
 */
export declare function PaginationPrevious({ className, 'aria-label': ariaLabel, ...rest }: PaginationPreviousProps): import("react").JSX.Element;
export interface PaginationNextProps extends Omit<AriaButtonProps, 'className' | 'children' | 'style'> {
    className?: string;
}
/**
 * Next-page control. States map to Figma "Elements/Next":
 * Enabled, Hover (data-hovered), Disabled (isDisabled → data-disabled).
 * Icon-only; the default aria-label "Next page" is a code addition.
 */
export declare function PaginationNext({ className, 'aria-label': ariaLabel, ...rest }: PaginationNextProps): import("react").JSX.Element;
export interface PaginationEllipsisProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'style' | 'children'> {
    className?: string;
}
/**
 * Truncation indicator ("More Indicator" frame in Figma's "More pages"
 * composition). Non-interactive and borderless in Figma; hidden from
 * assistive tech — the gap in page numbers already conveys the truncation.
 */
export declare function PaginationEllipsis({ className, ...rest }: PaginationEllipsisProps): import("react").JSX.Element;
