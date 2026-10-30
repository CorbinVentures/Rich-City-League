/** Read-only competitive record summaries. Receipts are awarded by the server.
 * Display only; this module never allocates REP, rankings, Cup spots or XP. */
export type CompetitiveReceipt={
 id:string;run_id:string;court_slug:string|null;court_name:string|null;
 verified_at:string;game_format:string;won:boolean;xp:number;rep:number;
};
export const competitiveFormats=['1v1','2v2','3v3','4v4','5v5'] as const;
export type FormatSummary={format:string;games:number;wins:number;losses:number};
export function verifiedCompetitionHistory(input:readonly CompetitiveReceipt[]|null|undefined){
 const seen=new Set<string>();
 const verified=(input||[]).filter(r=>{
  if(!r||typeof r.id!=='string'||!r.id||seen.has(r.id)
   ||typeof r.run_id!=='string'||!r.run_id
   ||typeof r.won!=='boolean'||!Number.isFinite(Date.parse(r.verified_at)))return false;
  seen.add(r.id);return true;
 }).sort((a,b)=>Date.parse(b.verified_at)-Date.parse(a.verified_at));
 const formats:FormatSummary[]=competitiveFormats.map(format=>{
  const matches=verified.filter(r=>r.game_format===format);
  return {format,games:matches.length,wins:matches.filter(r=>r.won).length,losses:matches.filter(r=>!r.won).length};
 });
 const other=verified.filter(r=>!competitiveFormats.includes(r.game_format as (typeof competitiveFormats)[number]));
 if(other.length)formats.push({format:'Other',games:other.length,wins:other.filter(r=>r.won).length,losses:other.filter(r=>!r.won).length});
 return {
  receipts:verified,formats:formats.filter(f=>f.games>0),
  games:verified.length,wins:verified.filter(r=>r.won).length,
  courts:new Set(verified.map(r=>r.court_slug).filter(Boolean)).size,
  latest:verified[0]||null
 };
}
