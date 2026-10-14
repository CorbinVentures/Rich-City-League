'use client';

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import { FaArrowRight, FaChevronDown, FaXmark } from 'react-icons/fa6';
import { RCHActionGuide } from '@/components/RCHActionGuide';
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
          <h2 id={headingId}>Find your way around RCH</h2>
          <p>Pick what you want to do first. All the features are still here when you need them.</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close navigation"><FaXmark aria-hidden="true"/></button>
      </div>
      <RCHActionGuide variant="drawer" onNavigate={onClose}/>
      <div className="rch-nav-directory" aria-label="All RCH features">
        <div className="rch-nav-directory-head"><b>All features</b><span>More places to explore when you need them</span></div>
        <nav aria-label="All RCH destinations" className="rcl-navigation-groups rch-nav-accordions">
          {groups.map(group=><details key={group.label} className="rcl-navigation-group rch-nav-group">
            <summary className="rch-nav-group-summary">
              <span><b>{group.label}</b><small>{group.description}</small></span>
              <FaChevronDown aria-hidden="true"/>
            </summary>
            <div className="rcl-navigation-group-links rch-nav-group-links">
              {group.items.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={onClose} aria-current={isNavigationActive(pathname,href)?'page':undefined}>
                <Icon aria-hidden="true"/><span>{label}</span><FaArrowRight className="rcl-navigation-arrow" aria-hidden="true"/>
              </Link>)}
            </div>
          </details>)}
        </nav>
      </div>
      <div className="rcl-navigation-utility">
        <Link href="/membership" onClick={onClose}>RCL+ membership</Link>
        <Link href="/shop" onClick={onClose}>Shop RCL</Link>
        <Link href="/settings" onClick={onClose}>Settings</Link>
      </div>
    </div>
  </dialog>;
}
