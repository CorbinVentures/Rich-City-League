/** Distinguish paid-ad impression delivery from views of an organization,
 * event, or media page. "Reach" (unique people) is not available from these rows.
 * Click-through rate must never use mixed view types as denominator.
 */
export type SponsorDeliveryRow = {
 impressions:number|null;organization_views:number|null;event_views:number|null;
 media_views:number|null;outbound_clicks:number|null;shares:number|null;saves:number|null;
};
export type SponsorDeliveryReport={
 adImpressions:number;destinationViews:number;clicks:number;engagements:number;
 ctrPercent:number|null;
};
const count=(n:number|null|undefined)=>Number.isFinite(n)&&Number(n)>0?Math.floor(Number(n)):0;
export function summarizeSponsorDelivery(rows:readonly SponsorDeliveryRow[]):SponsorDeliveryReport{
 const totals=rows.reduce((s,r)=>({
  adImpressions:s.adImpressions+count(r.impressions),
  destinationViews:s.destinationViews+count(r.organization_views)+count(r.event_views)+count(r.media_views),
  clicks:s.clicks+count(r.outbound_clicks),
  engagements:s.engagements+count(r.outbound_clicks)+count(r.shares)+count(r.saves),
 }),{adImpressions:0,destinationViews:0,clicks:0,engagements:0});
 return {...totals,ctrPercent:totals.adImpressions>0
  ? Math.round(totals.clicks/totals.adImpressions*10000)/100
  : null};
}
