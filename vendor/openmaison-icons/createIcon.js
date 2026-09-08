import { createElement, forwardRef } from 'react';

/**
 * Icon factory for the generated Material Symbols components.
 * - Sized via font-size (width/height 1em) — drops straight into the
 *   component library's `.icon` slots, which set font-size from tokens.
 * - fill: currentColor — icons always follow the text color, matching Figma.
 * - Decorative by default (aria-hidden); pass aria-label to make it meaningful.
 */
export function createIcon(viewBox, d, displayName) {
  const Icon = forwardRef(function OMIconImpl(props, ref) {
    const { 'aria-label': ariaLabel, ...rest } = props;
    return createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox,
        width: '1em',
        height: '1em',
        fill: 'currentColor',
        'aria-hidden': ariaLabel ? undefined : true,
        role: ariaLabel ? 'img' : undefined,
        'aria-label': ariaLabel,
        ref,
        ...rest,
      },
      createElement('path', { d }),
    );
  });
  Icon.displayName = displayName;
  return Icon;
}
