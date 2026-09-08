import { type ToggleButtonProps } from 'react-aria-components';
export interface AvatarProps {
    /** Figma: Logged in=Yes, Photo=Yes. Falls back to initials/placeholder if the image fails to load. */
    src?: string;
    /** Figma: Logged in=Yes, Photo=No. Rendered when there is no (working) image. */
    initials?: string;
    /** Accessible name. Omit ONLY for purely decorative avatars — they are hidden from assistive tech. */
    label?: string;
    className?: string;
}
/**
 * User avatar (static). 1:1 with the Figma "Avatars / Generic" component set —
 * see figma-export/avatar.json for the extracted contract.
 * Content resolves src → initials → placeholder silhouette.
 */
export declare function Avatar({ src, initials, label, className }: AvatarProps): import("react").JSX.Element;
export interface AvatarButtonProps extends Omit<ToggleButtonProps, 'className' | 'children' | 'style'>, AvatarProps {
}
/**
 * Interactive avatar, e.g. a profile-menu trigger. 1:1 with the Figma
 * "Avatars / Profile" component set: hover raises level-1 elevation,
 * Selected adds a primary/variant ring. Selection follows react-aria
 * ToggleButton semantics (isSelected / defaultSelected / onChange).
 */
export declare function AvatarButton({ src, initials, label, className, ...rest }: AvatarButtonProps): import("react").JSX.Element;
