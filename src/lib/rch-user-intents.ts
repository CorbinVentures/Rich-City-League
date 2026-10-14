/**
 * RCH user-intent navigation. Actions point only at existing site destinations:
 * a visitor chooses a goal, never a guessed identity or account role.
 */
export type RCHIntentId='play'|'watch'|'connect'|'create'|'grow';
export type RCHAction={id:string;title:string;detail:string;href:string;keywords:string};
export type RCHIntent={id:RCHIntentId;label:string;subtitle:string;actions:readonly RCHAction[]};

export const RCH_INTENTS:readonly RCHIntent[]=[
 {id:'play',label:'Play',subtitle:'Get on the court and build your basketball identity',actions:[
  {id:'find-run',title:'Find a run',detail:'See open runs and courts',href:'/runs',keywords:'pickup basketball run park court open gym join play'},
  {id:'meet-players',title:'Explore players',detail:'Discover athletes in the network',href:'/players',keywords:'player hoopers roster scouting compare'},
  {id:'my-rep',title:'See my REP',detail:'Badges and basketball progress',href:'/badges',keywords:'badge points reward profile rating reputation gamification'},
 ]},
 {id:'watch',label:'Watch',subtitle:'Follow the games, players, and stories',actions:[
  {id:'game-night',title:'Game night',detail:'Matchups, scores and schedules',href:'/games',keywords:'schedule scores tickets teams league games live'},
  {id:'watch-tv',title:'RCH TV',detail:'Games, programs and video',href:'/media',keywords:'live stream podcast the pulse tv watch movies'},
  {id:'watch-clips',title:'Watch highlights',detail:'Short basketball videos',href:'/clips',keywords:'highlights clips video replays dunk'},
 ]},
 {id:'connect',label:'Connect',subtitle:'Find people and belong to the community',actions:[
  {id:'talk-hoops',title:'Join the conversation',detail:'Read posts and speak your mind',href:'/social',keywords:'feed post comment social basketball community'},
  {id:'find-community',title:'Find your community',detail:'Courts, teams and local groups',href:'/communities',keywords:'group court park neighborhood community join'},
  {id:'meet-network',title:'Meet the network',detail:'Players and friends on RCH',href:'/friends',keywords:'friends follow messages people connections'},
 ]},
 {id:'create',label:'Create',subtitle:'Make your game, work and voice visible',actions:[
  {id:'share-clip',title:'Post a clip',detail:'Upload your basketball video',href:'/create/social?mode=clip',keywords:'video highlight film clip create upload basketball'},
  {id:'post-photos',title:'Share photos',detail:'Post a moment from your world',href:'/create/social?mode=moment',keywords:'camera photo images carousel upload social'},
  {id:'creator-program',title:'Create for RCH TV',detail:'Explore the creator program',href:'/media/creators',keywords:'creator filmmaker content tv movies originals opportunity'},
 ]},
 {id:'grow',label:'Build',subtitle:'Coaches, teams, organizations and the wider culture',actions:[
  {id:'my-organization',title:'Grow your organization',detail:'Get your program on the network',href:'/network/partners',keywords:'owner organization promote claim advertise team league'},
  {id:'find-coaches',title:'Discover coaches',detail:'Meet RCH coaches on regular member profiles',href:'/coaches',keywords:'coach scouting recruiting development train'},
  {id:'virginia-network',title:'Explore Virginia basketball',detail:'Find organizations across the state',href:'/network',keywords:'virginia richmond tournaments events league club basketball'},
 ]}
] as const;

export const RCH_INTENT_IDS=RCH_INTENTS.map(intent=>intent.id);
export function isRCHIntent(value:string):value is RCHIntentId{
 return RCH_INTENTS.some(intent=>intent.id===value);
}
export function getRCHIntent(id:RCHIntentId):RCHIntent{
 return RCH_INTENTS.find(intent=>intent.id===id)??RCH_INTENTS[0];
}
export function searchRCHActions(query:string):RCHAction[]{
 const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 const unique=new Map<string,RCHAction>();
 for(const intent of RCH_INTENTS){
  for(const action of intent.actions){
   const haystack=[action.title,action.detail,action.keywords,intent.label,intent.subtitle].join(' ').toLocaleLowerCase();
   if(!terms.length||terms.every(term=>haystack.includes(term)))unique.set(action.id,action);
  }
 }
 return [...unique.values()];
}

export type RCHNextStep={heading:string;detail:string;links:readonly {label:string;href:string}[]};
const steps:{prefix:string;value:RCHNextStep}[]=[
 {prefix:'/runs',value:{heading:'Keep the run going',detail:'Bring the court into your RCH world.',links:[{label:'Share your highlights',href:'/create/social?mode=clip'},{label:'Find your people',href:'/communities'}]}},
 {prefix:'/games',value:{heading:'More than the final score',detail:'Follow the game, then watch the next chapter.',links:[{label:'Watch RCH TV',href:'/media'},{label:'League standings',href:'/standings'}]}},
 {prefix:'/media',value:{heading:'Keep watching',detail:'Explore highlights or see the next matchup.',links:[{label:'Short clips',href:'/clips'},{label:'Game night',href:'/games'}]}},
 {prefix:'/players',value:{heading:'See the players in action',detail:'Basketball gets better when you meet the network.',links:[{label:'Find an open run',href:'/runs'},{label:'Compare players',href:'/players/compare'}]}},
 {prefix:'/teams',value:{heading:'Follow the competition',detail:'See who is playing and where teams stand.',links:[{label:'Upcoming games',href:'/games'},{label:'Standings',href:'/standings'}]}},
 {prefix:'/league',value:{heading:'Be part of the league',detail:'The games are the start of the story.',links:[{label:'Game center',href:'/games'},{label:'RCH TV',href:'/media'}]}},
 {prefix:'/communities',value:{heading:'Take the conversation to the court',detail:'Connect through real games and shared moments.',links:[{label:'Open runs',href:'/runs'},{label:'Community feed',href:'/social'}]}},
 {prefix:'/create',value:{heading:'Your moment is only the start',detail:'Keep building your basketball identity.',links:[{label:'See the feed',href:'/social'},{label:'My profile',href:'/social/profile/me'}]}},
 {prefix:'/organizations',value:{heading:'Grow the network',detail:'Connect teams, events and organizations statewide.',links:[{label:'Partner with RCH',href:'/network/partners'},{label:'Virginia network',href:'/network'}]}},
 {prefix:'/news',value:{heading:'Follow the full story',detail:'Stay connected to the game and the people behind it.',links:[{label:'RCH TV',href:'/media'},{label:'Game center',href:'/games'}]}}
];
export function nextRCHStep(pathname:string):RCHNextStep|null{
 // Respect standalone editing, broadcast and creator workspaces.
 if(pathname.startsWith('/media/creators')||pathname.startsWith('/create/social'))return null;
 const match=steps.find(item=>pathname===item.prefix||pathname.startsWith(item.prefix+'/'));
 return match?.value??null;
}
