/**
 * RCH Sites operator overview: pure presentation math over existing,
 * manager-authorized endpoints. No queries, mutations, or fabricated traffic.
 *
 * Source limits: the inbox returns the most recent 100 inquiries, and the
 * calendar returns the next 200 slots. UI must label those limits.
 */
export type RchSitesOverviewInquiry={
  id:string;
  status:string;
  purpose:string;
  submitted_at:string;
};
export type RchSitesOverviewSlot={
  id:string;
  service_id:string;
  starts_at:string;
  status:string;
  booked:boolean;
};
export type RchSitesOverviewService={id:string;name:string;status:string};
export type RchSitesOverviewOffering={id:string;active:boolean};
export type RchSitesOverviewAction={
  id:'reply'|'publish'|'service'|'availability'|'paypal';
  title:string;
  description:string;
  href:string;
};
export type RchSitesOverviewData={
  siteStatus:string|null;
  inquiries:readonly RchSitesOverviewInquiry[]|null;
  slots:readonly RchSitesOverviewSlot[]|null;
  services:readonly RchSitesOverviewService[]|null;
  offerings:readonly RchSitesOverviewOffering[]|null;
};
export type RchSitesOverviewSummary={
  isPublished:boolean;
  newInquiries:number|null;
  upcomingBooked:number|null;
  availableSlots:number|null;
  activeServices:number|null;
  activePayPalLinks:number|null;
  recentInquiries:RchSitesOverviewInquiry[];
  nextBooked:RchSitesOverviewSlot[];
  actions:RchSitesOverviewAction[];
};
export function summarizeRchSitesOverview(
  data:RchSitesOverviewData,nowMs=Date.now(),
):RchSitesOverviewSummary{
  const upcoming=data.slots?.filter(s=>
    Number.isFinite(Date.parse(s.starts_at)) && Date.parse(s.starts_at)>nowMs)??null;
  const newInquiries=data.inquiries?.filter(i=>i.status==='new')??null;
  const available=upcoming?.filter(s=>s.status==='open'&&!s.booked)??null;
  const booked=upcoming?.filter(s=>s.booked===true)??null;
  const services=data.services?.filter(s=>s.status==='active')??null;
  const paypal=data.offerings?.filter(x=>x.active===true)??null;
  const actions:RchSitesOverviewAction[]=[];
  if(newInquiries?.length){
    actions.push({id:'reply',title:'Reply to new inquiries',
      description:newInquiries.length+' waiting for follow-up',
      href:'/network/dashboard/sites/people'});
  }
  if(data.siteStatus!=='published'){
    actions.push({id:'publish',title:'Finish & publish your website',
      description:'Your website is not publicly visible',
      href:'/network/dashboard/sites'});
  }
  if(services?.length===0){
    actions.push({id:'service',title:'Add your first service',
      description:'Make your training or program easy to book',
      href:'/network/dashboard/sites/appointments'});
  } else if(services && available?.length===0){
    actions.push({id:'availability',title:'Add available times',
      description:'There are no open upcoming times in your calendar',
      href:'/network/dashboard/sites/appointments'});
  }
  if(paypal?.length===0){
    actions.push({id:'paypal',title:'Optional: add a PayPal link',
      description:'Customers pay your own PayPal Business account',
      href:'/network/dashboard/sites/payments'});
  }
  return {
    isPublished:data.siteStatus==='published',
    newInquiries:newInquiries?.length??null,
    upcomingBooked:booked?.length??null,
    availableSlots:available?.length??null,
    activeServices:services?.length??null,
    activePayPalLinks:paypal?.length??null,
    recentInquiries:[...(newInquiries??[])].sort((a,b)=>
      Date.parse(b.submitted_at)-Date.parse(a.submitted_at)).slice(0,3),
    nextBooked:(booked??[]).slice(0,3),
    actions:actions.slice(0,3),
  };
}
