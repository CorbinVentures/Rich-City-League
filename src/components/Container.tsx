'use client';

import React from 'react';
import clsx from 'clsx';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function Container({ children, maxWidth = 'lg', className, ...props }: ContainerProps) {
  const maxWidthMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-screen-2xl',
    full: 'w-full',
  };

  return (
    <div className={clsx('mx-auto px-4 w-full', maxWidthMap[maxWidth], className)} {...props}>
      {children}
    </div>
  );
}
