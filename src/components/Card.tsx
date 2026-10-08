'use client';

import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export function Card({ children, hoverable = false, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rcl-panel rounded-2xl border border-white/10 p-6 text-white',
        hoverable && 'cursor-pointer hover:-translate-y-1 hover:border-rcl-blue/40 hover:shadow-[0_18px_50px_rgba(145,206,242,.08)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={clsx('mb-4 border-b border-white/10 pb-4', className)}>{children}</div>;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function CardBody({ children, className }: CardBodyProps) {
  return <div className={clsx('space-y-4', className)}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return <div className={clsx('mt-4 flex min-w-0 flex-wrap gap-2 border-t border-white/10 pt-4 [&>*]:min-w-0 [&>*]:max-w-full', className)}>{children}</div>;
}
