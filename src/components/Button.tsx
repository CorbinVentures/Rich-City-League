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

const baseStyles = 'font-black uppercase tracking-[.12em] rounded-lg transition-all duration-200 flex items-center justify-center gap-2';

const variants = {
  primary: 'bg-rcl-orange text-rcl-black hover:bg-rcl-orange/90 disabled:opacity-50',
  secondary: 'bg-rcl-blue text-white hover:bg-rcl-blue/90 disabled:opacity-50',
  outline: 'border border-white/15 bg-white/[.025] text-white hover:border-rcl-orange hover:text-rcl-orange disabled:opacity-50',
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
      className={clsx(baseStyles, variants[variant], sizes[size], variant === 'primary' && 'shadow-[0_12px_35px_rgba(255,79,22,.18)]', className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="animate-spin" aria-hidden="true">⏳</span>}
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
      className={clsx(baseStyles, variants[variant], sizes[size], variant === 'primary' && 'shadow-[0_12px_35px_rgba(255,79,22,.18)]', className)}
    >
      {children}
    </Link>
  );
}
