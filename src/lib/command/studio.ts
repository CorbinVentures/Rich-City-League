import {validateStoryboard,type StoryFrame} from './storyboard';
/** Deterministic production templates: suggestions, never invented reporting. */
export type StudioGame = {id:string; home_team_id:string; away_team_id:string; scheduled_at:string; status:string; home_score:number|null; away_score:number|null; season_id?:string|null; venue_id?:string|null};
export type TaskStatus = 'planned'|'in_progress'|'review'|'approved'|'released'|'blocked'|'skipped';
export type StudioTask = {id:string; title:string; hours:number; objective:string; instructions:string; owner:string; status:TaskStatus; asset:string; blocker:string; checks:{facts:boolean; permissions:boolean; captions:boolean; links:boolean}; approved_by:string; approved_at:string; released_at:string};
export type Story = {id:string; title:string; premise:string; evidence:string; role:'main'|'supporting'; scores:number[]};
export type Talent = {id:string; name:string; kind:'player'|'team'; hook:string; background:string; signature:string; boundaries:string; permission:string; next_step:string};
export type Cue = {id:string; label:string; timing:string; owner:string; asset:string; backup:string; ready:boolean};
export type StudioDocument = {version:1; storyboard?:StoryFrame[]; brief:{producer:string; objective:string; target:string; ticket_url:string; notes:string}; stories:Story[]; tasks:StudioTask[]; rundown:Cue[]; talent:Talent[]; branches:Record<'home_win'|'away_win'|'standout'|'postponed'|'sensitive',string>; impact:{tickets:string; follows:string; views:string; completed_views:string; merchandise:string; evidence:string; worked:string; improve:string; experiment:string}};
export type Episode = {id:string;game_id:string;revision:number;document:StudioDocument;updated_at:string};
export const scoreLabels=['Stakes','Fan connection','Evidence','Production access','Payoff'];
export const taskStatuses:TaskStatus[]=['planned','in_progress','review','approved','released','blocked','skipped'];
const beats = [
 ['announce','Matchup & stakes',-168,'View the event','Create a matchup graphic. Confirm teams, venue and tip-off. Explain what is at stake using verified records.'],
 ['introduce','Meet the person',-120,'Follow the player or team','Capture a 30-second interview: What does this game mean to you? What have you worked on? Film practice, portrait and court B-roll.'],
 ['challenge','Matchup conversation',-72,'Make a prediction','Compare verified strengths. Ask: What must your team do well? Invite a fan prediction without fabricating quotes or conflict.'],
 ['preview','Final game preview',-24,'Get tickets','Build a 15–30 second trailer: opening hook, verified matchup, player reaction, date/venue, ticket call to action. Include captions.'],
 ['show','Game-night coverage',-2,'Attend and participate','Confirm introduction graphics, announcer notes and halftime fan segment. Capture warmups, atmosphere and key plays. Keep live basketball uninterrupted.'],
 ['reaction','Result & reaction',24,'Watch and discuss','Verify the final score. Interview the actual standout: What changed the game? Capture a turning-point clip and the consequences.'],
 ['next','The next chapter',48,'Follow the next event','Explain what the result changes. Select the appropriate outcome branch, confirm the next fixture, and review campaign performance.'],
] as const;
export function createStudioDocument():StudioDocument {
 return {version:1,storyboard:[],brief:{producer:'',objective:'Build attendance and returning fans',target:'',ticket_url:'',notes:''},stories:[],talent:[],
 tasks:beats.map(([id,title,hours,objective,instructions])=>({id,title,hours,objective,instructions,owner:'',status:'planned',asset:'',blocker:'',checks:{facts:false,permissions:false,captions:false,links:false},approved_by:'',approved_at:'',released_at:''})),
 rundown:[['recap','Previously in Rich City','Before warmups'],['intro','Team & player introductions','Before tip-off'],['half','Fan predictions & halftime feature','Halftime'],['reaction','Postgame interview & next event','After final buzzer']].map(([id,label,timing])=>({id,label,timing,owner:'',asset:'',backup:'Announcer reads the approved brief; omit unavailable media.',ready:false})),
 branches:{home_win:'Confirm the home result. Capture the turning point, winner reaction and next challenge.',away_win:'Confirm the away result. Capture the breakthrough, home response and next challenge.',standout:'Follow the actual standout, even if they were not the planned featured player.',postponed:'Pause game promotions. Confirm the new date and ticket guidance before updating fans.',sensitive:'Pause promotional framing. Verify facts and permissions with league leadership before coverage.'},
 impact:{tickets:'',follows:'',views:'',completed_views:'',merchandise:'',evidence:'',worked:'',improve:'',experiment:''}};
}
export function dueAt(game:StudioGame, task:StudioTask){return new Date(new Date(game.scheduled_at).getTime()+task.hours*3600000)}
export function isFinal(game:StudioGame){return ['final','completed','finished'].includes(game.status)&&game.home_score!==null&&game.away_score!==null}
export function resultBranch(game:StudioGame):'home_win'|'away_win'|'postponed'|null {
 if(['postponed','cancelled','canceled'].includes(game.status))return 'postponed';
 if(!isFinal(game)||game.home_score===game.away_score)return null;
 return game.home_score!>game.away_score!?'home_win':'away_win';
}
export function isHttpUrl(value:string){try{return ['https:','http:'].includes(new URL(value).protocol)}catch{return false}}
export function approvalProblems(task:StudioTask, doc:StudioDocument){
 const issues:string[]=[];
 if(!doc.brief.producer.trim())issues.push('Assign a producer');
 if(!doc.stories.some(s=>s.role==='main'&&s.premise.trim()&&s.evidence.trim()))issues.push('Add an evidenced main story');
 if(!task.owner.trim())issues.push('Assign an owner');
 if(!isHttpUrl(task.asset))issues.push('Add an asset URL');
 if(!isHttpUrl(doc.brief.ticket_url))issues.push('Add the event or ticket URL');
 if(!Object.values(task.checks).every(Boolean))issues.push('Complete all four release checks');
 return issues;
}
export function campaignUrl(url:string,gameId:string){if(!isHttpUrl(url))return '';const u=new URL(url);u.searchParams.set('utm_source','rch');u.searchParams.set('utm_medium','storyline');u.searchParams.set('utm_campaign','game_'+gameId);return u.toString()}
export function storySuggestions(game:StudioGame,history:StudioGame[],names:Record<string,string>){
 const home=names[game.home_team_id]||'Home team',away=names[game.away_team_id]||'Away team';
 const meetings=history.filter(g=>g.id!==game.id&&isFinal(g)&&new Date(g.scheduled_at)<new Date(game.scheduled_at)&&((g.home_team_id===game.home_team_id&&g.away_team_id===game.away_team_id)||(g.home_team_id===game.away_team_id&&g.away_team_id===game.home_team_id))).sort((a,b)=>Date.parse(b.scheduled_at)-Date.parse(a.scheduled_at));
 const prior=meetings[0];
 return [{title:'The matchup',premise:`What will decide ${home} vs ${away}?`,evidence:`Official fixture: ${game.id}. Add verified basketball context before approval.`},
 ...(prior?[{title:'The next meeting',premise:`What changes when ${home} and ${away} meet again?`,evidence:`Recorded prior meeting: ${names[prior.home_team_id]||'Home'} ${prior.home_score}–${prior.away_score} ${names[prior.away_team_id]||'Away'} (${prior.scheduled_at}); game ${prior.id}.`}]:[]),
 {title:'Meet the people behind the jersey',premise:'Introduce an available player and the goal they are working toward.',evidence:''}];
}
export function validateStudio(doc:StudioDocument){
 const boardProblem=validateStoryboard(doc.storyboard||[],doc);if(boardProblem)return boardProblem;
 if(doc.stories.filter(s=>s.role==='main').length>1||doc.stories.filter(s=>s.role==='supporting').length>2)return 'Choose one main story and at most two supporting stories.';
 for(const s of doc.stories)if(!s.title.trim()||!s.premise.trim())return 'Every story needs a title and premise.';
 for(const t of doc.tasks){if(t.status==='blocked'&&!t.blocker.trim())return 'Explain blocked assignments.';if(t.status==='skipped'&&!t.blocker.trim())return 'Explain why an assignment was skipped.';if(['approved','released'].includes(t.status)&&approvalProblems(t,doc).length)return `${t.title}: ${approvalProblems(t,doc).join('. ')}.`;}
 for(const key of ['tickets','follows','views','completed_views','merchandise'] as const){const v=doc.impact[key];if(v!==''&&(!Number.isFinite(Number(v))||Number(v)<0||(key!=='merchandise'&&!Number.isSafeInteger(Number(v)))))return 'Metrics must be nonnegative numbers (counts must be whole numbers).';}
 if(doc.impact.completed_views!==''&&doc.impact.views!==''&&Number(doc.impact.completed_views)>Number(doc.impact.views))return 'Completed views cannot exceed total views.';
 if(['tickets','follows','views','completed_views','merchandise'].some(k=>doc.impact[k as keyof typeof doc.impact]!=='')&&!doc.impact.evidence.trim())return 'Add the metric source and reporting period.';
 return '';
}
