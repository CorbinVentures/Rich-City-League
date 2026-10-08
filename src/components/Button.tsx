'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const baseStyles = 'min-h-11 min-w-0 max-w-full whitespace-normal text-center leading-snug font-semibold tracking-[.02em] rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed';

const variants = {
  primary: 'bg-rcl-blue text-[#071018] hover:brightness-105 disabled:opacity-50',
  secondary: 'border border-rcl-blue/25 bg-rcl-blue/10 text-rcl-blue hover:bg-rcl-blue/15 disabled:opacity-50',
  outline: 'border border-white/15 bg-white/[.025] text-white hover:border-rcl-blue/35 hover:text-rcl-blue disabled:opacity-50',
  ghost: 'text-rcl-muted hover:bg-white/[.04] hover:text-white disabled:opacity-50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base w-full',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], variant === 'primary' && 'shadow-[0_10px_30px_rgba(145,206,242,.08)]', className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
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
  return (
    <Link
      href={href}
      className={clsx(baseStyles, variants[variant], sizes[size], variant === 'primary' && 'shadow-[0_10px_30px_rgba(145,206,242,.08)]', className)}
    >
      {children}
    </Link>
  );
}
