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
        hoverable && 'hover:-translate-y-1 hover:border-rcl-orange/50 hover:shadow-[0_18px_50px_rgba(255,79,22,.12)] cursor-pointer',
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
  return <div className={clsx('mb-4 pb-4 border-b border-white/10', className)}>{children}</div>;
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
  return <div className={clsx('mt-4 pt-4 border-t border-white/10 flex gap-2', className)}>{children}</div>;
}
