// Task-first routing for the authenticated RCL Command Center.
// Every shortcut maps to an existing module or to its validated record form.
export type CommandArea =
 'overview'|'analytics'|'revenue'|'finance'|'venues'|'concessions'|'trades'|
 'stories'|'entertainment'|'operations'|'franchises'|'audit';
export type CommandCaptureKind =
 'budgets'|'ledger'|'venues'|'bookings'|'inventory'|'concession_sales'|'trades'|'tasks';
export type CommandAction = {
 id:string;
 title:string;
 description:string;
 area:CommandArea;
 keywords:string;
 kind?:CommandCaptureKind;
 defaults?:Record<string,string>;
};
export const commandActions:CommandAction[]=[
 {id:'site-analytics',title:'Analyze the RCH platform',description:'Explore executive sitewide audience, social, basketball and revenue intelligence',area:'analytics',keywords:'metrics data audience visitors analytics engagement conversions growth runs users traffic chart sitewide'},
 {id:'game-plan',title:'Prepare game day',description:'Open the automatic game readiness desk',area:'operations',keywords:'game schedule checklist readiness scorebook referee staff production run of show'},
 {id:'storyboard',title:'Make a trailer or player feature',description:'Go to Storyline Studio and its visual storyboard',area:'stories',keywords:'storyline story board camera video clip promo rivalry player feature film make trailer creative'},
 {id:'show',title:'Plan halftime entertainment',description:'Manage performances, timeouts and show cues',area:'entertainment',keywords:'cheerleader dance timeout halftime podcast concert singer performer entertainment show'},
 {id:'gym-search',title:'Find an affordable gym',description:'Search Virginia venues and rental evidence',area:'venues',keywords:'venue basketball court gym rental cost price availability directory search cheap'},
 {id:'book-gym',title:'Record a gym booking',description:'Capture a tentative or confirmed reservation',area:'venues',kind:'bookings',keywords:'book reserve contract court rental gym booking venue'},
 {id:'new-gym',title:'Add a gym lead',description:'Save a facility and its research details',area:'venues',kind:'venues',keywords:'gym directory venue address lead phone rental add'},
 {id:'budget',title:'Create a season budget',description:'Capture jerseys, facilities or other planned costs',area:'finance',kind:'budgets',keywords:'jersey uniforms payroll budget season expenses plan costs'},
 {id:'expense',title:'Record an expense',description:'Enter a categorized payment or projection',area:'finance',kind:'ledger',defaults:{direction:'expense'},keywords:'expense payment invoice receipt spend finance costs bill cash out'},
 {id:'income',title:'Record income',description:'Enter categorized income and verification evidence',area:'finance',kind:'ledger',defaults:{direction:'income'},keywords:'income deposit sponsor registration receipt payment money cash in finance'},
 {id:'game-revenue',title:'Review game revenue',description:'Open tickets, gate figures and settlement reports',area:'revenue',keywords:'tickets admissions revenue sponsorship gate attendance profit game financial settlement'},
 {id:'sale',title:'Sell a concession item',description:'Record a sale and reduce inventory atomically',area:'concessions',kind:'concession_sales',keywords:'sell snack snacks beverage soda water popcorn hotdog concessions pos transaction'},
 {id:'restock',title:'Check concession stock',description:'Review margins and low-stock inventory',area:'concessions',keywords:'buy wholesale stock snack water beverage reorder catalog concession pricing'},
 {id:'new-item',title:'Add a concession item',description:'Set stock, cost, sale price and reorder threshold',area:'concessions',kind:'inventory',keywords:'add product inventory snack concession menu price'},
 {id:'franchise',title:'Check franchise value',description:'Inspect attendance, revenue and team valuation',area:'franchises',keywords:'franchise team worth valuation value sponsorship attendance ranking'},
 {id:'trade',title:'Propose a player trade',description:'Open the league front-office proposal form',area:'trades',kind:'trades',keywords:'roster player movement transfer trade proposal'},
 {id:'new-task',title:'Assign an operations task',description:'Capture a categorized staff assignment',area:'operations',kind:'tasks',keywords:'add task to do deadline due work staff assignment urgent'},
 {id:'audit',title:'Review activity history',description:'Inspect the read-only operational audit trail',area:'audit',keywords:'audit activity changed security history log'}
];
export const areaSuggestions:Record<CommandArea,string[]>={
 overview:['site-analytics','game-plan','expense','storyboard','sale'],
 analytics:['site-analytics','game-plan'],
 finance:['expense','income','budget'],
 revenue:['game-revenue','income'],
 venues:['gym-search','book-gym','new-gym'],
 concessions:['sale','restock','new-item'],
 franchises:['franchise','trade'],
 trades:['trade','franchise'],
 stories:['storyboard','show'],
 entertainment:['show','storyboard'],
 operations:['game-plan','new-task','book-gym'],
 audit:['audit','game-plan']
};
export function findCommandActions(query:string):CommandAction[]{
 const search=query.trim().toLocaleLowerCase();
 if(!search)return commandActions;
 const terms=search.split(/\s+/).filter(Boolean);
 return commandActions.map((action,index)=>{
  const title=action.title.toLocaleLowerCase();
  const haystack=(title+' '+action.description+' '+action.keywords+' '+action.area).toLocaleLowerCase();
  const matches=terms.every(term=>haystack.includes(term));
  const score=title===search?0:title.startsWith(search)?1:title.includes(search)?2:3;
  return {action,index,matches,score};
 }).filter(x=>x.matches).sort((a,b)=>a.score-b.score||a.index-b.index).map(x=>x.action);
}
export function actionById(id:string){return commandActions.find(a=>a.id===id);}
