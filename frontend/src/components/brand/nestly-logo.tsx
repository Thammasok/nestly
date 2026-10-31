import type { ComponentProps } from 'react';

type NestlyLogoProps = ComponentProps<'svg'> & {
  /** Rendered width and height — a number is px, a string is any CSS length (e.g. '2rem'). */
  size?: number | string;
  title?: string;
};

/** Nestly brand mark (light). Source: nestly-logo-light.svg — Figma's no-op full-frame mask dropped. */
export function NestlyLogo({ size = 32, title = 'Nestly', style, ...props }: NestlyLogoProps) {
  return (
    <svg
      viewBox="0 0 168 168"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      {...props}
      // Inline size so parent rules like shadcn's `[&_svg]:size-4` can't shrink the logo.
      style={{ width: size, height: size, flexShrink: 0, ...style }}
    >
      <path
        d="M48.5332 83.9999L83.9999 50.3999L119.467 83.9999"
        stroke="#60d2b8"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M56 93.3333C56 115.733 69.0667 125.067 84 125.067C98.9333 125.067 112 115.733 112 93.3333"
        stroke="#60d2b8"
        strokeWidth={9}
        strokeLinecap="round"
      />
      <path
        d="M84.0003 112.933C89.155 112.933 93.3337 107.501 93.3337 100.8C93.3337 94.0988 89.155 88.6665 84.0003 88.6665C78.8457 88.6665 74.667 94.0988 74.667 100.8C74.667 107.501 78.8457 112.933 84.0003 112.933Z"
        fill="#ffc431"
      />
    </svg>
  );
}
