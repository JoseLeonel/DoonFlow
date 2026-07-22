import * as React from "react";

interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

export default function Link({ href, children, className, ...rest }: LinkProps) {
  return (
    <a href={String(href)} className={className} {...rest}>
      {children}
    </a>
  );
}
