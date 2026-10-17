import Link from 'next/link';
import type {ReactNode} from 'react';
import {FaArrowRight,FaBasketball,FaCalendarDays,FaCircleCheck,FaLocationDot,FaUsers} from 'react-icons/fa6';

type Status='open'|'full'|'cancelled'|'completed'|'verified'|'unclaimed'|'pending';
const statusText:Record<Status,string>={
 open:'Registration open',full:'Full',cancelled:'Cancelled',completed:'Completed',
 verified:'Verified',unclaimed:'Unclaimed',pending:'Pending review'
};
export function RCHStatusChip({status,children}:{status:Status;children?:ReactNode}){
 return <span className={'rch-ux-status rch-ux-status--'+status} aria-label={statusText[status]}>
 {status==='verified'&&<FaCircleCheck aria-hidden="true"/>}{children||statusText[status]}</span>;
}
export function RCHSectionHeader({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:{href:string;label:string}}){
 return <div className="rch-ux-section-header">
  <div className="min-w-0">{eyebrow&&<p className="rch-ux-eyebrow">{eyebrow}</p>}<h2 className="rch-ux-heading">{title}</h2>
  {description&&<p className="rch-ux-description">{description}</p>}</div>
  {action&&<Link className="rch-ux-header-action" href={action.href}>{action.label}<FaArrowRight aria-hidden="true"/></Link>}
 </div>;
}
export function RCHEmptyState({title,description,actions}:{title:string;description:string;actions?:Array<{href:string;label:string;primary?:boolean}>}){
 return <div className="rch-ux-empty" role="status">
  <div className="rch-ux-empty-mark" aria-hidden="true"><FaBasketball/></div>
  <h3>{title}</h3><p>{description}</p>
  {actions&&<div className="rch-ux-empty-actions">{actions.map(a=><Link key={a.href+a.label} href={a.href} className={a.primary?'rch-ux-btn-primary':'rch-ux-btn-secondary'}>{a.label}<FaArrowRight aria-hidden="true"/></Link>)}</div>}
 </div>;
}
export function RCHRunDetails({date,location,occupancy,format}:{date:string;location:string;occupancy:string;format:string}){
 return <div className="rch-ux-run-details">
  <span><FaCalendarDays aria-hidden="true"/>{date}</span>
  <span><FaLocationDot aria-hidden="true"/>{location}</span>
  <span><FaUsers aria-hidden="true"/>{occupancy}</span>
  <span className="rch-ux-run-format">{format}</span>
 </div>;
}
