import { type SwitchProps as AriaSwitchProps } from 'react-aria-components';
import type { ReactNode } from 'react';
export interface SwitchProps extends Omit<AriaSwitchProps, 'className' | 'children' | 'style'> {
    /** Figma: Size — sm=20px, md=24px track height. @default 'md' */
    size?: 'sm' | 'md';
    /**
     * Figma: Color style. 'default' = primary purple / neutral gray;
     * 'semantic' = green when on, red when off. @default 'default'
     */
    tone?: 'default' | 'semantic';
    /**
     * Figma: Text — shows the "Yes"/"No" caption inside the track.
     * Figma defines it for the 24px (md) size only; hidden at sm. @default false
     */
    showStateText?: boolean;
    /**
     * Optional visible label — the Figma set contains only the track control
     * (code addition). Provide `aria-label` when omitting it.
     */
    children?: ReactNode;
    className?: string;
}
/**
 * On/off toggle. 1:1 with the Figma "Switch States" component set —
 * see figma-export/switch.json for the extracted contract.
 */
export declare function Switch({ size, tone, showStateText, children, className, ...rest }: SwitchProps): import("react").JSX.Element;
