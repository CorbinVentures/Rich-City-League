import { atlasXY } from './virginia-atlas-camera';

export const COMMONWEALTH_SEASON_SLUG='richmond-founding-2026';
export const COMMONWEALTH_PILOT_COURTS=['pine-camp','battery-park','chimborazo','broad-rock-sports','randolph'] as const;
export type CommonwealthFormat='3v3'|'5v5';
export type CommonwealthChallengeStatus='proposed'|'accepted'|'declined'|'cancelled'|'review'|'verified'|'rejected';

export type CommonwealthStanding = {
  id:string; season_id:string; name:string; city:string; home_court_slug:string; created_at:string;
  games:number;wins:number;losses:number;points:number;points_for:number;points_against:number
};
export type CommonwealthSite={slug:string;name:string;locality:string;latitude:number;longitude:number;address:string;access_type:string};

export function pilotRadarXY(site:Pick<CommonwealthSite,'latitude'|'longitude'>) {
  // Honest geographic positions inside the Richmond pilot extent, not a venue access map.
  const x=Math.min(92,Math.max(8,8+((site.longitude+77.52)/0.16)*84));
  const y=Math.min(88,Math.max(12,12+((37.62-site.latitude)/0.17)*76));
  return {x,y};
}
export function stateRadarXY(site:Pick<CommonwealthSite,'latitude'|'longitude'>) {
  const {x,y}=atlasXY({lat:site.latitude,lon:site.longitude});
  return {x:x*100,y:y*100};
}
export function competitionRecord(crew:CommonwealthStanding) {
  return crew.wins+'-'+crew.losses;
}
export function challengeIsActionable(status:CommonwealthChallengeStatus) {
  return status==='proposed'||status==='accepted'||status==='review';
}
export function formatCompetitionDate(value:string){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'Time TBD':date.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}
