import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  VisualArea, VisualDonut, VisualHeatmap, VisualRails,
  VisualComparison, type ChartRow,
} from '../src/components/command/CommandVisuals';

const read=(path:string)=>readFileSync(path,'utf8');
const rows:ChartRow[] = [
  {day:'2026-10-13',members:1,visits:4,sessions:2,posts:0,content_views:1},
  {day:'2026-10-14',members:3,visits:7,sessions:3,posts:2,content_views:6},
  {day:'2026-10-15',members:0,visits:0,sessions:0,posts:1,content_views:8},
];

describe('RCH Command visual intelligence',()=>{
  const site=read('src/components/command/CommandSiteAnalytics.tsx');
  const live=read('src/components/command/CommandLiveAnalytics.tsx');
  const styles=read('src/app/command/command-analytics-viz.css');
  const layout=read('src/app/command/layout.tsx');

  it('transforms every historical executive report into meaningful visual analytics',()=>{
    for (const component of ['VisualArea','VisualDonut','VisualRails','VisualHeatmap','VisualComparison'])
      expect(site).toContain('<'+component+' ');
    for (const report of ["section==='overview'","section==='audience'","section==='social'","section==='basketball'","section==='business'"])
      expect(site).toContain(report);
    expect(site).toContain('Virginia basketball activity scoreboard');
    expect(site).toContain('city rankings require verified location aggregates');
    expect(site).toContain('Commerce activity scoreboard');
    expect(site).toContain('get_rch_executive_analytics');
    expect(site).toContain('Export CSV');
  });

  it('adds graphic comparisons to near-real-time analytics without changing RPC',()=>{
    expect(live).toContain('Audience presence split');
    expect(live).toContain('Live activity comparison');
    expect(live).toContain('report.active_sessions-report.guest_sessions');
    expect(live).toContain('Prior 15m');
    expect(live).toContain("db.rpc('get_rch_live_analytics')");
  });

  it('keeps all graphic styling isolated inside the Command Center',()=>{
    expect(layout).toContain("import './command-analytics-viz.css';");
    expect(styles).toContain('.command-app .rch-viz-panel');
    expect(styles).toContain('@media(max-width:650px)');
    expect(styles).toContain('@media(prefers-reduced-motion:reduce)');
    expect(styles).not.toContain('.rcl-pwa');
  });

  it('renders a data-driven trend without invented numbers',()=>{
    const html=renderToStaticMarkup(createElement(VisualArea,{
      rows,title:'Audience movement',initialMetric:'members',
      series:[{key:'members',label:'New members',color:'#68caff'}],
    }));
    expect(html).toContain('Audience movement');
    expect(html).toContain('4</strong>');
    expect(html).toContain('Oct 14');
    expect(html).not.toContain('No recorded activity');
    expect(html).not.toContain('NaN');
  });

  it('handles zero and empty data responsibly',()=>{
    const ring=renderToStaticMarkup(createElement(VisualDonut,{
      title:'Role mix',detail:'Test',centerLabel:'members',items:[
        {label:'Fans',value:0,color:'#85cfff'},
        {label:'Players',value:0,color:'#bbaaff'},
      ],
    }));
    expect(ring).toContain('No recorded data');
    expect(ring).not.toContain('NaN');
    const heat=renderToStaticMarkup(createElement(VisualHeatmap,{
      rows:rows.slice(0,1).map(r=>({...r,visits:0})),metric:'visits',
    }));
    expect(heat).toContain('No records in this period');
    const rails=renderToStaticMarkup(createElement(VisualRails,{
      title:'Top sections',detail:'Tracked pages',items:[],
    }));
    expect(rails).toContain('does not yet have qualifying observations');
    const bars=renderToStaticMarkup(createElement(VisualComparison,{
      title:'Activity',detail:'Counts',items:[
        {label:'Runs',value:2,color:'#7ccaff'},
        {label:'Check-ins',value:0,color:'#8aabfc'},
      ],
    }));
    expect(bars).toContain('different recorded event type');
  });
});
