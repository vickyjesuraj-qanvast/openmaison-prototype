import { type RadioProps as AriaRadioProps, type RadioGroupProps as AriaRadioGroupProps } from 'react-aria-components';
import type { ReactNode } from 'react';
export interface RadioGroupProps extends Omit<AriaRadioGroupProps, 'className' | 'children' | 'style'> {
    children?: ReactNode;
    className?: string;
}
/**
 * Groups Radio buttons into a single form control. Layout (column, 8px gap)
 * is a code addition — the Figma set defines only the 24px control.
 * Provide `aria-label` or `aria-labelledby` for the group name.
 */
export declare function RadioGroup({ children, className, ...rest }: RadioGroupProps): import("react").JSX.Element;
export interface RadioProps extends Omit<AriaRadioProps, 'className' | 'children' | 'style'> {
    /**
     * Optional visible label — the Figma set contains only the 24px control
     * (code addition). Provide `aria-label` when omitting it.
     */
    children?: ReactNode;
    className?: string;
}
/**
 * Selection control for exactly-one-of choices. 1:1 with the Figma
 * "Radio Button" component set — see figma-export/radio.json for the
 * extracted contract. Must be used inside a RadioGroup.
 */
export declare function Radio({ children, className, ...rest }: RadioProps): import("react").JSX.Element;
