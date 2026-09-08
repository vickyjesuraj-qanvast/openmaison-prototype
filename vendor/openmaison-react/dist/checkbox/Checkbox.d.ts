import { type CheckboxProps as AriaCheckboxProps } from 'react-aria-components';
import type { ReactNode } from 'react';
export interface CheckboxProps extends Omit<AriaCheckboxProps, 'className' | 'children' | 'style'> {
    /**
     * Optional visible label — the Figma set contains only the 24px control
     * (code addition). Provide `aria-label` when omitting it.
     */
    children?: ReactNode;
    className?: string;
}
/**
 * Selection control for zero-or-more choices. 1:1 with the Figma "Checkbox"
 * component set — see figma-export/checkbox.json for the extracted contract.
 */
export declare function Checkbox({ children, className, ...rest }: CheckboxProps): import("react").JSX.Element;
