import { type TextFieldProps as AriaTextFieldProps } from 'react-aria-components';
import { type ReactNode } from 'react';
export interface TextFieldProps extends Omit<AriaTextFieldProps, 'className' | 'children' | 'style'> {
    /** Figma: Height — sm=24, md=36, lg=48, xl=56. @default 'md' */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /**
     * Figma: Label. Sits at the placeholder position while the field is empty and
     * unfocused, and floats onto the top border (Figma's "Label" boolean chip)
     * once the field is focused or filled.
     */
    label?: ReactNode;
    /** Placeholder ("Field Text" in Figma's Empty state). Hidden while an unfloated label occupies its position. */
    placeholder?: string;
    /** Figma: Helper Text. Hidden while invalid — the error text takes its slot, matching the Figma Error variants. */
    description?: ReactNode;
    /** Figma: State=⛔️ Error. Rendered below the field while it is invalid. */
    errorMessage?: ReactNode;
    /** Figma: Trailing Icon. Decorative — hidden from assistive tech. */
    iconEnd?: ReactNode;
    className?: string;
}
/**
 * Single-line outlined text input. 1:1 with the Figma "Text Field" component
 * set — see figma-export/text-field.json for the extracted contract.
 */
export declare function TextField({ size, label, placeholder, description, errorMessage, iconEnd, className, ...rest }: TextFieldProps): import("react").JSX.Element;
