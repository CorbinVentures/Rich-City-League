/**
 * Parks & Rec duplicate-candidate groups are QA work items, not merge actions.
 * Multiple named court polygons can be distinct playable courts even when they
 * sit in the same park. Geometry alone never authorizes deleting a court.
 */
export type CandidateVenue={
 slug:string;name:string;locality:string;latitude:number|null;longitude:number|null;
 verification_status:string;source_label?:string|null;source_url?:string|null;
};
export type DuplicateReviewGroup={key:string;name:string;locality:string;
 candidates:CandidateVenue[];officialCount:number;communityCount:number;
 nearestMeters:number|null;reviewHint:string;};
export function normalizedCourtName(name:string){
 return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
export function courtMeters(a:CandidateVenue,b:CandidateVenue):number|null{
 if(a.latitude==null||a.longitude==null||b.latitude==null||b.longitude==null)return null;
 if(![a.latitude,a.longitude,b.latitude,b.longitude].every(Number.isFinite))return null;
 const d=Math.PI/180,lat=(b.latitude-a.latitude)*d,lon=(b.longitude-a.longitude)*d;
 const x=Math.sin(lat/2)**2+Math.cos(a.latitude*d)*Math.cos(b.latitude*d)*Math.sin(lon/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
export function duplicateCourtReviews(rows:readonly CandidateVenue[]):DuplicateReviewGroup[]{
 const grouped=new Map<string,CandidateVenue[]>();
 for(const row of rows){
  const key=normalizedCourtName(row.locality)+'|'+normalizedCourtName(row.name);
  const found=grouped.get(key)||[];
  found.push(row);grouped.set(key,found);
 }
 const reviews:DuplicateReviewGroup[]=[];
 for(const [key,candidates] of grouped){
  if(candidates.length<2)continue;
  const officialCount=candidates.filter(c=>['official','provider'].includes(c.verification_status)).length;
  const communityCount=candidates.length-officialCount;
  let nearest=Infinity;
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
   const meters=courtMeters(candidates[i],candidates[j]);
   if(meters!==null)nearest=Math.min(meters,nearest);
  }
  const nearestMeters=Number.isFinite(nearest)?Math.round(nearest):null;
  const reviewHint=nearestMeters!==null&&nearestMeters<=15
   ?'Nearby points: review GIS surface IDs before considering a merge.'
   :officialCount>0&&communityCount>0
    ?'Official/community name overlap: verify the same physical facility.'
    :'Identically named sites may contain multiple distinct basketball court surfaces.';
  reviews.push({key,name:candidates[0].name,locality:candidates[0].locality,
   candidates:[...candidates].sort((a,b)=>a.slug.localeCompare(b.slug)),officialCount,communityCount,
   nearestMeters,reviewHint});
 }
 return reviews.sort((a,b)=>{
  const ap=(a.officialCount>0&&a.communityCount>0?2:0)+(a.nearestMeters!==null&&a.nearestMeters<=15?1:0);
  const bp=(b.officialCount>0&&b.communityCount>0?2:0)+(b.nearestMeters!==null&&b.nearestMeters<=15?1:0);
  return bp-ap||b.candidates.length-a.candidates.length||a.key.localeCompare(b.key);
 });
}
