/**
 * RCH circuit dates are interpreted in the Commonwealth's Eastern time zone.
 * Cycle 2026: Nov 1–Dec 20, 2026 qualifiers; Cup on Jan 1, 2027.
 */
export type CircuitPhase='open'|'qualifying'|'review'|'cup';
export function getCircuitClock(now:Date=new Date()):{cycle:number;cupYear:number;phase:CircuitPhase}{
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone:'America/New_York',year:'numeric',month:'numeric',day:'numeric'
  }).formatToParts(now);
  const value=(key:'year'|'month'|'day')=>Number(parts.find(item=>item.type===key)?.value||0);
  const year=value('year'),month=value('month'),day=value('day');
  const cycle=Math.max(2026,month===1&&day===1?year-1:year);
  const phase:CircuitPhase=month===1&&day===1?'cup':
    month===11||(month===12&&day<=20)?'qualifying':
    month===12&&day>=21?'review':'open';
  return {cycle,cupYear:cycle+1,phase};
}
