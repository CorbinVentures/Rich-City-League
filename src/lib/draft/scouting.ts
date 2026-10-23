/**
 * RCH official playable-season draft scouting.
 * Advisory only: never used to control draft picks or classify athlete psychology.
 * Court/skill components are PUBLIC basketball metrics; popularity, exposure,
 * age and medical data are deliberately excluded.
 */
export type DraftScout = {
  id: string;
  name: string;
  position: string | null;
  court: number | null;
  skill: number | null;
  games: number;
  tryoutAverage?: number | null;
  tryoutEvaluations?: number;
};
export type ScoutedProspect = DraftScout & {
  grade: number | null;
  sample: 'established' | 'limited' | 'unrated';
  source: 'official tryouts' | 'verified games' | 'unrated';
  replacementEdge: number | null;
  availableAtPosition: number;
  positionalNeed: number;
  fitGrade: number | null;
};
const positions = ['PG','SG','SF','PF','C'] as const;
const round = (v:number) => Math.round(v*10)/10;
const median = (values:number[]) => {
  const s=[...values].sort((a,b)=>a-b);
  if (!s.length) return null;
  const mid=Math.floor(s.length/2);
  return s.length%2?s[mid]:(s[mid-1]+s[mid])/2;
};
export function scoreDraftProspects(prospects:DraftScout[], rosterPositions:(string|null)[]):ScoutedProspect[] {
  const counts=new Map<string,number>();
  for(const position of rosterPositions) {
    const p=(position??'').toUpperCase();
    if(positions.some(v=>v===p)) counts.set(p,(counts.get(p)??0)+1);
  }
  const base=prospects.map(item=>{
    const valid=Number.isFinite(item.court) && Number.isFinite(item.skill)
      && item.court !== null && item.skill !== null
      && item.court >= 0 && item.court <= 100 && item.skill>=0 && item.skill<=100
      && item.games>=3;
    const tryoutValid=(item.tryoutEvaluations??0)>=2 && item.tryoutAverage!==null
      && item.tryoutAverage!==undefined && Number.isFinite(item.tryoutAverage)
      && item.tryoutAverage>=0 && item.tryoutAverage<=100;
    const grade=tryoutValid?round(item.tryoutAverage!):valid?round(item.court!*0.6+item.skill!*0.4):null;
    const source=tryoutValid?'official tryouts' as const:valid?'verified games' as const:'unrated' as const;
    const sample=grade===null?'unrated' as const:tryoutValid
      ?(item.tryoutEvaluations??0)>=4?'established' as const:'limited' as const
      :item.games>=8?'established' as const:'limited' as const;
    return {...item, grade, source, sample};
  });
  const byPosition=new Map<string,number[]>();
  for(const item of base) {
    const p=item.position?.toUpperCase();
    if(p && item.grade!==null) byPosition.set(p,[...(byPosition.get(p)??[]),item.grade]);
  }
  return base.map(item=>{
    const p=item.position?.toUpperCase()??'';
    const positionPool=prospects.filter(v=>v.position?.toUpperCase()===p).length;
    const replacement=median(byPosition.get(p)??[]);
    const positionalNeed=Math.max(0,2-(counts.get(p)??0));
    // Need bonus is intentionally small so it doesn't override a large talent gap.
    return {...item, position:item.position,
      sample:item.grade===null?'unrated' as const:item.sample,
      availableAtPosition:positionPool,
      positionalNeed,
      replacementEdge:item.grade===null||replacement===null?null:round(item.grade-replacement),
      fitGrade:item.grade===null?null:round(item.grade+Math.min(8,4*positionalNeed))};
  });
}
export function bestAvailable(assessed:ScoutedProspect[]) {
  return assessed.filter(p=>p.grade!==null).sort((a,b)=>(b.grade??0)-(a.grade??0))[0]??null;
}
export function bestFit(assessed:ScoutedProspect[]) {
  return assessed.filter(p=>p.fitGrade!==null).sort((a,b)=>(b.fitGrade??0)-(a.fitGrade??0))[0]??null;
}
