/** Worlds XP is displayed from real verified matches and cannot be spent.
 * No client calculation here awards basketball REP, wins or skill rating. */
export type WorldStamp={court_slug:string;name:string;city:string;scouted_at:string};
export type WorldHistory={court_slug:string|null;verified_at:string;game_format:string;won:boolean};
export type WorldMilestones={
 first_battle:boolean;first_win:boolean;five_verified_games:boolean;
 three_arenas:boolean;ten_verified_wins:boolean;crown_defender:boolean;
};
export type WorldJourney={
 signed_in:boolean;world_xp:number;world_level:number;
 verified_games:number;verified_wins:number;verified_courts:number;
 scouted_courts:number;week_start:string;weekly_verified_games:number;
 weekly_verified_wins:number;joined_upcoming_runs:number;scouted_today:number;
 master_title_defenses:number;stamps:WorldStamp[];recent_verified:WorldHistory[];
 milestones:WorldMilestones;
};
export const worldMilestoneCatalog=[
 {key:'first_battle',icon:'🥊',name:'First Battle',description:'First independently verified competitive game'},
 {key:'first_win',icon:'🏅',name:'Breakthrough',description:'First confirmed win'},
 {key:'five_verified_games',icon:'🛡️',name:'Park Veteran',description:'Five verified games'},
 {key:'three_arenas',icon:'🗺️',name:'Court Explorer',description:'Verified games at three different courts'},
 {key:'ten_verified_wins',icon:'🏆',name:'Victory Collector',description:'Ten verified wins'},
 {key:'crown_defender',icon:'👑',name:'Crown Defender',description:'A confirmed Court Master title defense'}
] as const;
export const weeklyQuestCatalog=[
 {key:'scout',icon:'🧭',title:'Scout a new Arena',detail:'Save one verified public court to your personal map journal.',href:'/runs/world',target:1},
 {key:'join',icon:'🏀',title:'Get in the Game',detail:'Hold an upcoming Runs registration in the next seven days.',href:'/runs?view=list#rch-upcoming-runs',target:1},
 {key:'compete',icon:'⚔️',title:'Real Competition',detail:'Complete one independently verified game this week.',href:'/runs?view=list#rch-competition',target:1},
 {key:'win',icon:'🏆',title:'Finish Strong',detail:'Win one independently verified game this week.',href:'/runs?view=list#rch-competition',target:1}
] as const;
export function worldQuestProgress(journey:WorldJourney,key:string):number{
 switch(key){
  case 'scout':return Number(journey.scouted_today>0);
  case 'join':return Number(journey.joined_upcoming_runs>0);
  case 'compete':return Number(journey.weekly_verified_games>0);
  case 'win':return Number(journey.weekly_verified_wins>0);
  default:return 0;
 }
}
export function worldLevelThreshold(level:number){
 return Math.max(0,(Math.max(1,Math.trunc(level))-1)**2*180);
}
export function worldXpProgress(xp:number){
 const safeXp=Math.max(0,Math.floor(Number.isFinite(xp)?xp:0));
 const level=1+Math.floor(Math.sqrt(safeXp/180));
 const lower=worldLevelThreshold(level),higher=worldLevelThreshold(level+1);
 return {xp:safeXp,level,within:safeXp-lower,toNext:higher-lower,
   percent:Math.max(0,Math.min(100,((safeXp-lower)/(higher-lower))*100))};
}
