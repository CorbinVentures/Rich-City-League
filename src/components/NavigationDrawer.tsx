'use client';

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import { FaArrowRight, FaChevronDown, FaXmark } from 'react-icons/fa6';
import { RCHActionGuide } from '@/components/RCHActionGuide';
import { RoyalteeStaffShortcut } from '@/components/RoyalteeStaffShortcut';
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
          <h2 id={headingId}>Menu</h2>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close navigation"><FaXmark aria-hidden="true"/></button>
      </div>
      <RoyalteeStaffShortcut variant="drawer" onNavigate={onClose} />
      <nav className="grid grid-cols-2 gap-2 p-4" aria-label="Quick destinations">
        {[
          {href:'/social',label:'Home'}, {href:'/discover',label:'Discover'},
          {href:'/runs',label:'Runs'}, {href:'/create',label:'Create'},
          {href:'/messages',label:'Messages'}, {href:'/media',label:'RCH TV'},
        ].map(item=><Link key={item.href} href={item.href} onClick={onClose}
          className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-white/15 px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          {item.label}<FaArrowRight aria-hidden="true"/>
        </Link>)}
      </nav>
      <details className="mx-4 mb-3 rounded-xl border border-white/10 p-3">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">Help me choose</summary>
        <RCHActionGuide variant="drawer" onNavigate={onClose}/>
      </details>
      <details className="rch-nav-directory mx-4 rounded-xl border border-white/10 p-3" aria-label="All RCH features">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">All features</summary>
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
      </details>
      <div className="rcl-navigation-utility">
        <Link href="/membership" onClick={onClose}>RCL+ membership</Link>
        <Link href="/shop" onClick={onClose}>Shop RCL</Link>
        <Link href="/settings" onClick={onClose}>Settings</Link>
      </div>
    </div>
  </dialog>;
}
