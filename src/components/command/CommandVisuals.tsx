'use client';

import React, { useId, useState, type ReactNode } from 'react';
import {
  FaArrowTrendUp, FaChartColumn, FaChartLine, FaCircleInfo,
  FaFire, FaLayerGroup,
} from 'react-icons/fa6';

export type ChartRow = {
  day: string;
  members: number;
  visits: number;
  sessions: number;
  posts: number;
  content_views: number;
};
type ChartMetric = Exclude<keyof ChartRow, 'day'>;
type Series = { key: ChartMetric; label: string; color: string };
type Part = { label: string; value: number; color: string; detail?: string };
type RailItem = { label: string; value: number; detail?: string; color?: string };

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const standard = new Intl.NumberFormat('en-US');
const numeric = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
const dateLabel = (value: string) => {
  const parsed = new Date(value + 'T12:00:00Z');
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-US', {month:'short', day:'numeric',timeZone:'UTC'});
};

function VizTitle({eyebrow, title, detail, icon}: {eyebrow:string;title:string;detail:string;icon?:ReactNode}) {
  return <header className="rch-viz-heading">
    <div className="rch-viz-eyebrow">{icon??<FaChartLine aria-hidden="true"/>}{eyebrow}</div>
    <h3>{title}</h3><p>{detail}</p>
  </header>;
}

export function VisualArea({
  rows, title='Growth velocity', detail='Daily activity recorded on Rich City Hoops',
  series, initialMetric,
}: {
  rows:ChartRow[]; title?:string;detail?:string; series:Series[];initialMetric:ChartMetric;
}) {
  const [selected,setSelected]=useState<ChartMetric>(initialMetric);
  const [hover,setHover]=useState<number|null>(null);
  const gradientId=useId().replace(/:/g,'');
  const active=series.find(item=>item.key===selected)??series[0];
  const values=rows.map(row=>numeric(Number(row[active.key])));
  const maxValue=Math.max(1,...values);
  const plot={left:52,right:730,top:23,bottom:209};
  const y=(value:number)=>plot.bottom-value/maxValue*(plot.bottom-plot.top);
  const x=(index:number)=>plot.left+index/Math.max(1,rows.length-1)*(plot.right-plot.left);
  const line=values.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const fill=values.length?`${line} L${x(values.length-1)} ${plot.bottom} L${plot.left} ${plot.bottom} Z`:'';
  const latest=values.at(-1)??0;
  const total=values.reduce((sum,v)=>sum+v,0);
  const focused=hover===null?null:rows[hover];

  return <section className="rch-viz-panel rch-viz-area" aria-label={title}>
    <div className="rch-viz-chart-top"><VizTitle eyebrow="Momentum monitor" title={title} detail={detail} icon={<FaArrowTrendUp aria-hidden="true"/>}/>
      <div className="rch-viz-highlight"><span>Period total</span><strong>{standard.format(total)}</strong><small>Latest day: {standard.format(latest)}</small></div>
    </div>
    <div className="rch-viz-switch" role="group" aria-label={`${title} metric`}>
      {series.map(item=><button type="button" key={item.key} className={selected===item.key?'active':''} aria-pressed={selected===item.key} onClick={()=>{setSelected(item.key);setHover(null)}}>
        <span className="rch-viz-key-dot" style={{background:item.color}}/>{item.label}</button>)}
    </div>
    <div className="rch-viz-chart-canvas">
      <svg role="img" aria-label={`${active.label} daily trend for ${rows.length} days. Period total ${total}.`} viewBox="0 0 780 240" preserveAspectRatio="none">
        <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={active.color} stopOpacity=".42"/><stop offset="100%" stopColor={active.color} stopOpacity=".005"/></linearGradient></defs>
        {[0, .25,.5,.75,1].map((tick,i)=>{
          const yy=y(maxValue*tick);
          return <g key={i}><line x1={plot.left} x2={plot.right} y1={yy} y2={yy} className="rch-viz-gridline"/><text x={plot.left-10} y={yy+4} textAnchor="end" className="rch-viz-axis">{compact.format(maxValue*tick)}</text></g>;
        })}
        {values.length>0&&<><path d={fill} fill={`url(#${gradientId})`}/><path d={line} fill="none" stroke={active.color} strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/></>}
        {focused&&<><line x1={x(hover!)} x2={x(hover!)} y1={plot.top} y2={plot.bottom} stroke="#d6eaff" strokeDasharray="4 5" opacity=".7"/>
          <circle cx={x(hover!)} cy={y(values[hover!]??0)} r="6" fill="#091b2e" stroke={active.color} strokeWidth="3" vectorEffect="non-scaling-stroke"/></>}
        {rows.map((row,i)=><rect key={row.day} x={x(i)-(rows.length>1?(plot.right-plot.left)/(rows.length-1)/2:14)} y={plot.top} width={rows.length>1?(plot.right-plot.left)/(rows.length-1):28} height={plot.bottom-plot.top} fill="transparent"
          onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(i)} onBlur={()=>setHover(null)} tabIndex={0} aria-label={`${dateLabel(row.day)}: ${standard.format(values[i])} ${active.label}`} />)}
      </svg>
      {focused&&<div className="rch-viz-hover-card" role="status"><span>{dateLabel(focused.day)}</span><strong>{standard.format(values[hover!]??0)}</strong><small>{active.label}</small></div>}
    </div>
    <div className="rch-viz-axis-dates"><span>{rows[0]?dateLabel(rows[0].day):'Start'}</span><span>DAILY · UTC</span><span>{rows.length?dateLabel(rows[rows.length-1].day):'Today'}</span></div>
    {!total&&<p className="rch-viz-empty">No recorded activity during this window; the chart remains at zero.</p>}
  </section>;
}

export function VisualDonut({title,detail,items,centerLabel='Total',format='number'}: {
  title:string;detail:string;items:Part[];centerLabel?:string;format?:'number'|'currency';
}) {
  const valid=items.map(item=>({...item,value:numeric(Number(item.value))}));
  const total=valid.reduce((sum,item)=>sum+item.value,0);
  let offset=0;
  const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  return <section className="rch-viz-panel rch-viz-donut" aria-label={title}>
    <VizTitle eyebrow="Composition analysis" title={title} detail={detail} icon={<FaLayerGroup aria-hidden="true"/>}/>
    <div className="rch-viz-donut-content">
      <div className="rch-viz-ring">
        <svg viewBox="0 0 220 220" role="img" aria-label={`${title}: ${valid.map(p=>`${p.label} ${standard.format(p.value)}`).join(', ')||'no data'}`}>
          <circle cx="110" cy="110" r="79" fill="none" stroke="#213c55" strokeWidth="23"/>
          {total>0&&valid.filter(item=>item.value>0).map(item=>{
            const segment=item.value/total*100;
            const start=offset;offset+=segment;
            return <circle key={item.label} cx="110" cy="110" r="79" pathLength={100} fill="none" stroke={item.color} strokeWidth="23" strokeDasharray={`${segment} ${100-segment}`} strokeDashoffset={-start} transform="rotate(-90 110 110)"><title>{item.label}: {standard.format(item.value)} ({(segment).toFixed(1)}%)</title></circle>;
          })}
          <text x="110" y="104" textAnchor="middle" className="rch-viz-donut-number">{format==='currency'?money(total):compact.format(total)}</text>
          <text x="110" y="126" textAnchor="middle" className="rch-viz-donut-label">{centerLabel}</text>
        </svg>
      </div>
      <div className="rch-viz-legend">
        {valid.map(item=><div className="rch-viz-legend-row" key={item.label}>
          <span className="rch-viz-legend-name"><i style={{background:item.color}}/>{item.label}</span>
          <strong>{format==='currency'?money(item.value):standard.format(item.value)}</strong><small>{total>0?`${Math.round(item.value/total*100)}% of displayed total`:'No recorded data'}</small>
        </div>)}
        {!valid.length&&<p className="rch-viz-empty">No qualifying records yet.</p>}
      </div>
    </div>
  </section>;
}

export function VisualRails({title,detail,items,maxItems=9}:{
  title:string;detail:string;items:RailItem[];maxItems?:number;
}) {
  const rows=items.slice(0,maxItems).map(item=>({...item,value:numeric(Number(item.value))}));
  const max=Math.max(1,...rows.map(item=>item.value));
  return <section className="rch-viz-panel rch-viz-rails">
    <VizTitle eyebrow="Ranked intelligence" title={title} detail={detail} icon={<FaChartColumn aria-hidden="true"/>}/>
    <div className="rch-viz-rail-list">
      {rows.map((item,i)=><div key={item.label} className="rch-viz-rail">
        <div className="rch-viz-rail-top"><span className="rch-viz-rail-label"><small>{String(i+1).padStart(2,'0')}</small>{item.label}</span><strong>{standard.format(item.value)}</strong></div>
        <div className="rch-viz-rail-track"><div className="rch-viz-rail-fill" style={{width:`${item.value/max*100}%`,background:item.color??'linear-gradient(90deg,#247fc5,#68daff)'}}/></div>
        {item.detail&&<p>{item.detail}</p>}
      </div>)}
      {!rows.length&&<p className="rch-viz-empty">This report does not yet have qualifying observations.</p>}
    </div>
  </section>;
}

export function VisualHeatmap({rows,metric,title='Activity cadence',detail='Daily recorded events; darker cells indicate more observed activity.'}:{
  rows:ChartRow[];metric:ChartMetric;title?:string;detail?:string;
}) {
  const recent=rows.slice(-56);
  const peak=Math.max(1,...recent.map(row=>numeric(Number(row[metric]))));
  const isEmpty=recent.every(row=>numeric(Number(row[metric]))===0);
  return <section className="rch-viz-panel rch-viz-heatmap">
    <VizTitle eyebrow="Calendar intelligence" title={title} detail={detail} icon={<FaFire aria-hidden="true"/>}/>
    <div className="rch-viz-heatmap-list" role="img" aria-label={`${title}: ${recent.map(r=>`${dateLabel(r.day)} ${r[metric]}`).join('; ')}`}>
      {recent.map(row=>{
        const value=numeric(Number(row[metric]));
        const alpha=value===0?.10:.2+.8*(value/peak);
        return <div key={row.day} className="rch-viz-heatmap-cell" style={{background:`rgba(55,189,255,${alpha})`,boxShadow:value>0?`inset 0 0 0 1px rgba(144,225,255,${Math.min(.7,alpha)})`:undefined}} title={`${dateLabel(row.day)} · ${standard.format(value)}`}/>;
      })}
      {!recent.length&&<span>No daily history available</span>}
    </div>
    <div className="rch-viz-heatmap-footer"><span>{recent.length?dateLabel(recent[0].day):'—'}</span>
      <span className="rch-viz-heatmap-scale">Less {Array.from({length:5},(_,i)=><i key={i} style={{background:`rgba(55,189,255,${.1+i*.22})`}}/>)} More</span>
      <span>{recent.length?dateLabel(recent[recent.length-1].day):'—'}</span></div>
    {isEmpty&&<p className="rch-viz-empty">No records in this period. No activity is inferred.</p>}
  </section>;
}

export function VisualComparison({title,detail,items,unit='events'}:{
  title:string;detail:string;items:Part[];unit?:string;
}) {
  const rows=items.map(item=>({...item,value:numeric(Number(item.value))}));
  const max=Math.max(1,...rows.map(item=>item.value));
  return <section className="rch-viz-panel rch-viz-comparison">
    <VizTitle eyebrow="Performance scoreboard" title={title} detail={detail} icon={<FaChartColumn aria-hidden="true"/>}/>
    <div className="rch-viz-comparison-grid">
      {rows.map((item,i)=><article key={item.label} className="rch-viz-comparison-item">
        <span className="rch-viz-comparison-index">METRIC {String(i+1).padStart(2,'0')}</span>
        <div className="rch-viz-comparison-chart"><div style={{height:`${item.value?Math.max(3,item.value/max*100):1}%`,background:`linear-gradient(180deg,${item.color},${item.color}55)`}}/></div>
        <strong>{compact.format(item.value)}</strong><span className="rch-viz-comparison-label">{item.label}</span>
      </article>)}
    </div>
    <p className="rch-viz-chart-note"><FaCircleInfo aria-hidden="true"/> Each bar represents a different recorded event type ({unit}); totals may not describe the same participants.</p>
  </section>;
}
