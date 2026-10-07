'use client';

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import { FaArrowRight, FaXmark } from 'react-icons/fa6';
import { isNavigationActive, type RCLNavGroup } from '@/lib/rcl-navigation';

export function NavigationDrawer({open,onClose,groups,pathname}:{open:boolean;onClose:()=>void;groups:RCLNavGroup[];pathname:string}) {
  const dialogRef=useRef<HTMLDialogElement>(null);
  const closeRef=useRef<HTMLButtonElement>(null);
  const headingId=useId();

  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!open||!dialog)return;
    const previousFocus=document.activeElement;
    const previousOverflow=document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow='hidden';
    closeRef.current?.focus();
    return()=>{
      dialog.close();
      document.body.style.overflow=previousOverflow;
      if(previousFocus instanceof HTMLElement&&previousFocus.isConnected)previousFocus.focus();
    };
  },[open]);

  return <dialog ref={dialogRef} className="rcl-navigation-dialog" aria-labelledby={headingId}
    onCancel={onClose} onClose={onClose}
    onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="rcl-navigation-panel">
      <div className="rcl-navigation-heading">
        <div>
          <p className="rcl-nav-eyebrow">RCH · Basketball Social</p>
          <h2 id={headingId}>Your basketball world</h2>
          <p>Home stays social. Discover helps you find basketball. Rich City League remains the flagship competition.</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close navigation"><FaXmark aria-hidden="true"/></button>
      </div>
      <nav aria-label="All RCL destinations" className="rcl-navigation-groups">
        {groups.map(group=><section key={group.label} className="rcl-navigation-group" aria-label={group.label}>
          <div className="rcl-navigation-group-heading"><div><b>{group.label}</b><small>{group.description}</small></div></div>
          <div className="rcl-navigation-group-links">
            {group.items.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={onClose} aria-current={isNavigationActive(pathname,href)?'page':undefined}>
              <Icon aria-hidden="true"/><span>{label}</span><FaArrowRight className="rcl-navigation-arrow" aria-hidden="true"/>
            </Link>)}
          </div>
        </section>)}
      </nav>
      <div className="rcl-navigation-utility">
        <Link href="/membership" onClick={onClose}>RCL+ membership</Link>
        <Link href="/shop" onClick={onClose}>Shop RCL</Link>
        <Link href="/settings" onClick={onClose}>Settings</Link>
      </div>
    </div>
  </dialog>;
}
