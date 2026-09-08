import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react';

export type OMIcon = ForwardRefExoticComponent<
  Omit<SVGProps<SVGSVGElement>, 'ref'> & { 'aria-label'?: string } & RefAttributes<SVGSVGElement>
>;

export declare function createIcon(viewBox: string, d: string, displayName: string): OMIcon;
