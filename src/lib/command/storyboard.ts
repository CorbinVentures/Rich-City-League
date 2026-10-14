import type {StudioDocument} from './studio';

export const shotTypes=['Wide','Medium','Close-up','Detail','Tracking','Interview','Graphic'] as const;
export const frameStatuses=['planned','ready','captured'] as const;
export const frameBranches=['always','home_win','away_win','standout','postponed','sensitive'] as const;
export type StoryFrame={id:string;title:string;story_id:string;task_id:string;branch:typeof frameBranches[number];shot:typeof shotTypes[number];seconds:number;visual:string;audio:string;overlay:string;location:string;owner:string;image_url:string;asset_url:string;notes:string;status:typeof frameStatuses[number]};
export function newFrame():StoryFrame{return {id:crypto.randomUUID(),title:'New scene',story_id:'',task_id:'preview',branch:'always',shot:'Wide',seconds:5,visual:'',audio:'',overlay:'',location:'',owner:'',image_url:'',asset_url:'',notes:'',status:'planned'}}
export function safeFrameUrl(url:string){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password}catch{return false}}
export function frameReadiness(f:StoryFrame){return [!f.visual.trim()&&'Describe the visual',!f.audio.trim()&&'Add audio direction (or specify silence)',!f.owner.trim()&&'Assign a crew owner'].filter(Boolean) as string[]}
export function validateStoryboard(frames:StoryFrame[],doc:Pick<StudioDocument,'stories'|'tasks'>){
 if(!Array.isArray(frames)||frames.length>60)return 'Keep the storyboard to 60 scenes per game.';
 if(new Set(frames.map(f=>f.id)).size!==frames.length)return 'Storyboard scene IDs must be unique.';
 for(const f of frames){
  if(!f.id||!f.title.trim())return 'Every scene needs a title.';
  if(!Number.isInteger(f.seconds)||f.seconds<1||f.seconds>3600)return 'Scene duration must be 1–3600 whole seconds.';
  if(!shotTypes.includes(f.shot)||!frameStatuses.includes(f.status)||!frameBranches.includes(f.branch))return 'Choose a valid shot, status and outcome branch.';
  if(f.story_id&&!doc.stories.some(s=>s.id===f.story_id))return 'A scene links to a removed story. Choose another story angle.';
  if(!doc.tasks.some(t=>t.id===f.task_id))return 'Every scene must link to a production assignment.';
  if([f.image_url,f.asset_url].some(u=>u&&!safeFrameUrl(u)))return 'Scene links must be HTTP or HTTPS URLs without embedded credentials.';
  if(f.status!=='planned'&&frameReadiness(f).length)return `${f.title}: ${frameReadiness(f).join('. ')}.`;
  if(f.status==='captured'&&!safeFrameUrl(f.asset_url))return 'Captured scenes need a footage or final asset URL.';
 }
 return '';
}
export function frameTimeline(frames:StoryFrame[]){let elapsed=0;return frames.map(f=>{const start=elapsed;elapsed+=f.seconds;return {id:f.id,start,end:elapsed}})}
export function timecode(seconds:number){return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`}
export function storyboardTemplate(kind:'trailer'|'profile'|'recap',story_id=''):StoryFrame[]{
 const rows:Record<typeof kind,Array<[string,StoryFrame['shot'],number,string,string,string]>>={
 trailer:[['Opening hook','Detail',3,'Jersey, sneakers or ball detail. Establish the question fans will follow.','Approved music cue; natural court sound.',''],['The people','Close-up',5,'Portraits of the actual featured players.','Use a verified interview excerpt; do not invent dialogue.',''],['The stakes','Graphic',5,'Show the verified matchup and what is at stake.','Producer-approved narration.','Verified matchup and stakes'],['The work','Tracking',7,'Practice or warmup coverage with permission.','Natural sound under the approved track.',''],['The invitation','Interview',5,'Player invites fans to the upcoming game.','Record the player’s own invitation.',''],['Event card','Graphic',5,'Readable date, venue and ticket call to action.','Music resolves; leave time to read.','Confirm event details and ticket URL']],
 profile:[['Meet the person','Medium',5,'Player portrait in an agreed location.','Introduce the player using verified details.','Player name / team'],['Their motivation','Interview',15,'Ask what this game means to them.','Use the player’s actual response.','Caption the interview'],['Their work','Tracking',10,'Capture the skill or preparation they describe.','Natural sound; approved interview continues.',''],['Follow the journey','Graphic',5,'End with the next confirmed appearance.','Invite fans to follow their story.','Next event / follow call to action']],
 recap:[['The result','Graphic',4,'Confirm the official final score before filling this card.','Read the verified result.','Official result'],['Turning point','Wide',8,'Choose the actual turning-point footage after the game.','Game sound or verified commentary.',''],['Real reaction','Interview',12,'Interview the actual standout, regardless of the planned feature.','Ask what changed the game; use the real answer.','Captions / player name'],['Next chapter','Graphic',6,'Explain the result’s verified consequence and next fixture.','Approved closing narration.','Next confirmed game']]
 };
 return rows[kind].map(([title,shot,seconds,visual,audio,overlay])=>({...newFrame(),title,shot,seconds,visual,audio,overlay,story_id,task_id:kind==='profile'?'introduce':kind==='recap'?'reaction':'preview'}));
}
export function storyboardPacket(title:string,doc:StudioDocument){const frames=doc.storyboard||[];return [`RCH STORYBOARD — ${title}`,'Draft production plan. Verify facts, permissions and actual outcomes before release.','Conditional scenes are alternatives; listed durations are not a final edit runtime.','',...frames.flatMap((f,i)=>[`${String(i+1).padStart(2,'0')} · ${f.title} · ${f.seconds}s · ${f.shot} · ${f.status}`,`Story: ${doc.stories.find(s=>s.id===f.story_id)?.title||'Episode-wide'} | Beat: ${doc.tasks.find(t=>t.id===f.task_id)?.title||f.task_id} | Branch: ${f.branch}`,`Owner: ${f.owner||'Unassigned'} | Location: ${f.location||'TBC'}`,`VISUAL: ${f.visual}`,`AUDIO / DIALOGUE: ${f.audio}`,`ON SCREEN: ${f.overlay}`,`REFERENCE: ${f.image_url}`,`FOOTAGE: ${f.asset_url}`,`NOTES / FALLBACK: ${f.notes}`,''])].join('\n')}
