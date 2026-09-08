import { type ButtonProps as AriaButtonProps } from 'react-aria-components';
import type { ReactNode } from 'react';
export interface ButtonProps extends Omit<AriaButtonProps, 'className' | 'children' | 'style'> {
    /** Figma: Type. @default 'primary' */
    variant?: 'primary' | 'secondary';
    /** Figma: Style. @default 'filled' */
    appearance?: 'filled' | 'outlined' | 'text';
    /** Figma: Height — sm=24, md=36, lg=48. @default 'md' */
    size?: 'sm' | 'md' | 'lg';
    /** Figma: Leading Icon. Decorative — hidden from assistive tech. */
    iconStart?: ReactNode;
    /** Figma: Trailing Icon. Decorative — hidden from assistive tech. */
    iconEnd?: ReactNode;
    children: ReactNode;
    className?: string;
}
/**
 * Call-to-action button. 1:1 with the Figma "Buttons" component set —
 * see figma-export/button.json for the extracted contract.
 */
export declare function Button({ variant, appearance, size, iconStart, iconEnd, children, className, ...rest }: ButtonProps): import("react").JSX.Element;
