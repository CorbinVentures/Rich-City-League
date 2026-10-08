'use client';

import React from 'react';
import clsx from 'clsx';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}

export function Badge({ variant = 'primary', children, className, ...props }: BadgeProps) {
  const variants = {
    primary: 'bg-rcl-red text-white',
    secondary: 'bg-rcl-gold text-rcl-black',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    danger: 'bg-red-600 text-white',
    info: 'bg-rcl-blue text-white',
  };

  return (
    <span className={clsx('inline-block px-3 py-1 rounded-full text-sm font-semibold', variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
