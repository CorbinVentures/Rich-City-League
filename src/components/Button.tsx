'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2';

  const variants = {
    primary: 'bg-rcl-red text-white hover:bg-rcl-navy disabled:bg-gray-400',
    secondary: 'bg-rcl-gold text-rcl-black hover:bg-yellow-500 disabled:bg-gray-400',
    outline: 'border-2 border-rcl-black text-rcl-black hover:bg-rcl-black hover:text-rcl-white disabled:border-gray-400',
    ghost: 'text-rcl-black hover:bg-gray-100 disabled:text-gray-400',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg w-full',
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="animate-spin">⏳</span>}
      {children}
    </button>
  );
}

interface LinkButtonProps {
  href: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export function LinkButton({ href, variant = 'primary', size = 'md', children, className }: LinkButtonProps) {
  const baseStyles = 'font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 no-underline';

  const variants = {
    primary: 'bg-rcl-red text-white hover:bg-rcl-navy',
    secondary: 'bg-rcl-gold text-rcl-black hover:bg-yellow-500',
    outline: 'border-2 border-rcl-black text-rcl-black hover:bg-rcl-black hover:text-rcl-white',
    ghost: 'text-rcl-black hover:bg-gray-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg w-full',
  };

  return (
    <Link href={href} className={clsx(baseStyles, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
