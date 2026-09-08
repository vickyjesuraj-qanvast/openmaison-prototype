import { type TextFieldProps as AriaTextFieldProps } from 'react-aria-components';
import { type ReactNode } from 'react';
export interface TextAreaProps extends Omit<AriaTextFieldProps, 'className' | 'children' | 'style' | 'type'> {
    /** Figma: Text size — md=14px, lg=16px. @default 'md' */
    size?: 'md' | 'lg';
    /**
     * Figma: Label. Sits at the placeholder position while the field is empty and
     * unfocused, and floats onto the top border once the field is focused or filled.
     */
    label?: ReactNode;
    /** Placeholder ("Area Text" in Figma's Empty state). Hidden while an unfloated label occupies its position. */
    placeholder?: string;
    /** Figma: Helper Text. Hidden while invalid — the error text takes its slot, matching the Figma Error variants. */
    description?: ReactNode;
    /** Figma: State=⛔️ Error. Rendered below the field while it is invalid. */
    errorMessage?: ReactNode;
    /** Figma: CC. Shows "count/maxLength" (Figma "0/x") right-aligned under the field. */
    showCharacterCount?: boolean;
    /** Figma: Trailing Icon. Decorative — hidden from assistive tech. */
    iconEnd?: ReactNode;
    className?: string;
}
/**
 * Multi-line outlined text input, vertically resizable. 1:1 with the Figma
 * "Text Area" component set — see figma-export/text-area.json for the
 * extracted contract.
 */
export declare function TextArea({ size, label, placeholder, description, errorMessage, showCharacterCount, iconEnd, className, ...rest }: TextAreaProps): import("react").JSX.Element;
