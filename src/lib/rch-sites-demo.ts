/**
 * Fictional, ephemeral training fixture for the public RCH Sites product tour.
 * Never link these identifiers to live organization, profile or billing records.
 */
export type DemoProgramKind='training'|'team'|'tryout'|'camp';
export type DemoProgram={
  id:string;name:string;kind:DemoProgramKind;capacity:number;
  participants:string[];
};
export type DemoSession={id:string;programId:string;coach:string;day:string;time:string;court:string};
export const RCH_DEMO_ORGANIZATION={
  name:'Demo Basketball Academy',
  initials:'DBA',
  description:'A fictional adult basketball development program used to preview RCH Sites.',
  location:'Example City, Virginia',
  siteType:'aau',
  subscription:'Amateur',
  status:'Demo only — no real registration or payments',
} as const;
export const RCH_DEMO_COACHES=['Coach Jordan','Coach Taylor'] as const;
export const RCH_DEMO_PROGRAMS:DemoProgram[]=[
  {id:'skills',name:'Adult Skills Lab',kind:'training',capacity:12,participants:[
    'Alex Carter','Sam Rivera','Morgan Lee','Jamie Brooks','Jordan Ellis','Taylor Reed','Casey Walker',
  ]},
  {id:'team',name:'City Development Squad',kind:'team',capacity:15,participants:[
    'Avery Quinn','Blake Adams','Devin Harper','Frankie Cole','Quinn Miles','Parker Hayes','Drew Logan',
    'Riley Lane','Emery King','Kendall Blake','Rowan Ellis',
  ]},
  {id:'tryout',name:'Fall Open Tryout',kind:'tryout',capacity:24,participants:[
    'Jordan Smith','Skyler Woods','Cameron Green','Hayden Brooks','Payton Ford',
  ]},
];
export const RCH_DEMO_SESSIONS:DemoSession[]=[
  {id:'session-a',programId:'skills',coach:'Coach Jordan',day:'Tuesday',time:'6:00 PM – 7:00 PM',court:'Training Court'},
  {id:'session-b',programId:'team',coach:'Coach Taylor',day:'Thursday',time:'7:00 PM – 8:30 PM',court:'Main Court'},
  {id:'session-c',programId:'tryout',coach:'Coach Jordan',day:'Saturday',time:'10:00 AM – 12:00 PM',court:'Main Court'},
];
export function demoProgramLabel(kind:DemoProgramKind):string{
  return {training:'Training',team:'Team',tryout:'Tryout',camp:'Camp'}[kind];
}
