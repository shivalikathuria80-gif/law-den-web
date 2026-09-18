'use client';

import NextLink from 'next/link';
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from 'react';

import { PREVIEW_MODE } from '../lib/preview';

export { PREVIEW_MODE };

type Props = Omit<ComponentProps<typeof NextLink>, 'href'> & { href: string; children?: ReactNode };

export const AppLink = ({ href, children, prefetch, replace, scroll, ...rest }: Props) => {
  if (PREVIEW_MODE) {
    return (
      <a href={`#${href}`} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }
  return (
    <NextLink href={href} prefetch={prefetch} replace={replace} scroll={scroll} {...rest}>
      {children}
    </NextLink>
  );
};
