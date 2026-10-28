import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {summarizeRchSitesOverview,type RchSitesOverviewData} from '../src/lib/rch-sites-overview';

const now=Date.parse('2026-10-28T19:00:00Z');
const empty:RchSitesOverviewData={
  siteStatus:null,inquiries:[],slots:[],services:[],offerings:[],
};
const src=(path:string)=>readFileSync(path,'utf8');

describe('RCH Sites Organization HQ honest activity',()=>{
  it('counts only new inquiries and confirmed future booked slots',()=>{
    const value=summarizeRchSitesOverview({
      siteStatus:'published',
      inquiries:[
        {id:'a',status:'new',purpose:'training',submitted_at:'2026-10-28T15:00:00Z'},
        {id:'b',status:'contacted',purpose:'event',submitted_at:'2026-10-27T15:00:00Z'},
        {id:'c',status:'new',purpose:'program',submitted_at:'2026-10-28T16:00:00Z'},
      ],
      slots:[
        {id:'past',service_id:'one',starts_at:'2026-10-27T19:00:00Z',status:'open',booked:true},
        {id:'invalid',service_id:'one',starts_at:'bad',status:'open',booked:false},
        {id:'reserved',service_id:'one',starts_at:'2026-11-01T19:00:00Z',status:'open',booked:true},
        {id:'available',service_id:'one',starts_at:'2026-11-02T19:00:00Z',status:'open',booked:false},
        {id:'closed',service_id:'one',starts_at:'2026-11-03T19:00:00Z',status:'closed',booked:false},
      ],
      services:[{id:'one',name:'Training',status:'active'},{id:'two',name:'Old',status:'inactive'}],
      offerings:[{id:'link1',active:true},{id:'link2',active:false}],
    },now);
    expect(value).toMatchObject({
      isPublished:true,newInquiries:2,upcomingBooked:1,availableSlots:1,
      activeServices:1,activePayPalLinks:1,
    });
    expect(value.recentInquiries.map(i=>i.id)).toEqual(['c','a']);
    expect(value.nextBooked.map(i=>i.id)).toEqual(['reserved']);
    expect(value.actions.map(a=>a.id)).toEqual(['reply']);
  });
  it('never calls missing API data zero activity and never invents engagement numbers',()=>{
    const value=summarizeRchSitesOverview({
      siteStatus:null,inquiries:null,slots:null,services:null,offerings:null,
    },now);
    expect(value.newInquiries).toBeNull();
    expect(value.upcomingBooked).toBeNull();
    expect(value.availableSlots).toBeNull();
    expect(value.activeServices).toBeNull();
    expect(value.activePayPalLinks).toBeNull();
    expect(value.actions.map(x=>x.id)).toEqual(['publish']);
  });
  it('gives actionable setup priorities without requiring PayPal',()=>{
    const ready=summarizeRchSitesOverview(empty,now);
    expect(ready.actions.map(a=>a.id)).toEqual(['publish','service','paypal']);
    const next=summarizeRchSitesOverview({
      ...empty,siteStatus:'published',services:[{id:'1',name:'Skills',status:'active'}],
    },now);
    expect(next.actions.map(a=>a.id)).toEqual(['availability','paypal']);
    expect(next.actions.every(a=>a.href.startsWith('/network/dashboard/sites'))).toBe(true);
    const noPayPal=summarizeRchSitesOverview({...empty,siteStatus:'published',
      services:[{id:'1',name:'Skills',status:'active'}],
      slots:[{id:'1',service_id:'1',starts_at:'2026-11-02T20:00:00Z',
        booked:false,status:'open'}]},now);
    expect(noPayPal.actions.map(a=>a.id)).toEqual(['paypal']);
  });
  it('keeps newest three inquiries and first three future booked times',()=>{
    const value=summarizeRchSitesOverview({
      ...empty,siteStatus:'published',inquiries:[
        {id:'1',status:'new',purpose:'general',submitted_at:'2026-10-25T12:00:00Z'},
        {id:'2',status:'new',purpose:'general',submitted_at:'2026-10-28T12:00:00Z'},
        {id:'3',status:'new',purpose:'general',submitted_at:'2026-10-27T12:00:00Z'},
        {id:'4',status:'new',purpose:'general',submitted_at:'2026-10-26T12:00:00Z'},
      ],
      slots:Array.from({length:5},(_,index)=>({
        id:String(index),service_id:'x',status:'open',booked:true,
        starts_at:new Date(now+(index+1)*86_400_000).toISOString(),
      })),
    },now);
    expect(value.newInquiries).toBe(4);
    expect(value.recentInquiries.map(i=>i.id)).toEqual(['2','3','4']);
    expect(value.upcomingBooked).toBe(5);
    expect(value.nextBooked.map(i=>i.id)).toEqual(['0','1','2']);
    expect(value.actions[0].id).toBe('reply');
    expect(value.actions.length).toBeLessThanOrEqual(3);
  });
  it('uses existing manager-authorized APIs and never exposes private data before login',()=>{
    const view=src('src/app/network/dashboard/sites/overview/page.tsx');
    const inquiries=src('src/app/api/rch-sites/inquiries/route.ts');
    const appointments=src('src/app/api/rch-sites/appointments/route.ts');
    const paypal=src('src/app/api/rch-sites/paypal/route.ts');
    const partner=src('src/app/network/dashboard/page.tsx');
    const studio=src('src/app/network/dashboard/sites/page.tsx');
    expect(view).toContain("getData<SitesResponse>('/api/rch-sites'");
    expect(view).toContain('/api/rch-sites/inquiries?organizationId=');
    expect(view).toContain('/api/rch-sites/appointments?organizationId=');
    expect(view).toContain('/api/rch-sites/paypal?organizationId=');
    expect(view).toContain('Promise.allSettled(');
    expect(view).toContain('controller.abort()');
    expect(view).toContain("activity?.organizationId===selected");
    expect(view).toContain("['owner','manager'].includes(org.member_role)");
    expect(view).toContain("if(!userId)");
    expect(view).toContain('Website page-view analytics aren');
    expect(view).not.toContain('STRIPE_SECRET_KEY');
    expect(view).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(inquiries).toContain('await orgManager(context,organizationId,admin)');
    expect(appointments).toContain('await managedOrg(context,organizationId,admin)');
    expect(paypal).toContain('await owner(organizationId)');
    expect(studio).toContain('/network/dashboard/sites/overview');
    expect(partner).toContain('/network/dashboard/sites/overview');
  });
});
