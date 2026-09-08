import { type SeparatorProps as AriaSeparatorProps } from 'react-aria-components';
export interface DividerProps extends Omit<AriaSeparatorProps, 'className' | 'style' | 'elementType'> {
    /** Figma: the two sibling sets "Horizontal" / "Vertical". @default 'horizontal' */
    orientation?: 'horizontal' | 'vertical';
    /** Figma: Type. @default 'solid' */
    variant?: 'solid' | 'dashed';
    /** Figma: States — "10%" (surface/variant) = subtle, "20%" (on-surface/border) = strong. @default 'subtle' */
    emphasis?: 'subtle' | 'strong';
    className?: string;
}
/**
 * Thin rule separating groups of content. 1:1 with the Figma "Horizontal" and
 * "Vertical" divider component sets — see figma-export/divider.json for the
 * extracted contract.
 *
 * Renders an <hr> (horizontal) or a <div role="separator"> (vertical) via
 * react-aria-components' Separator.
 */
export declare function Divider({ orientation, variant, emphasis, className, ...rest }: DividerProps): import("react").JSX.Element;
