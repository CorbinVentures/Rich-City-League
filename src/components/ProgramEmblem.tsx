import Image from 'next/image';

export type ProgramEmblemId = 'runs'|'draft-night'|'fantasy-league'|'rich-city-league';

const PROGRAM_EMBLEMS: Record<ProgramEmblemId,{src:string;name:string}> = {
  runs:{src:'/brand/programs/runs.avif',name:'Runs'},
  'draft-night':{src:'/brand/programs/draft-night.avif',name:'Draft Night'},
  'fantasy-league':{src:'/brand/programs/fantasy-league.avif',name:'Fantasy League'},
  'rich-city-league':{src:'/brand/programs/rich-city-league.avif',name:'Rich City League'},
};

/**
 * The full typographic heading stays visible for clarity and accessibility.
 * Emblems are decorative siblings of that heading, never navigation replacements.
 * All four files are optimized 3D renders stored in /public, not remote hotlinks.
 */
export function ProgramEmblem({program,className='',label=false,priority=false}:{
  program:ProgramEmblemId;
  className?:string;
  label?:boolean;
  priority?:boolean;
}){
 const data=PROGRAM_EMBLEMS[program];
 return <span className={`rch-program-emblem ${className}`} role={label?'img':undefined} aria-label={label?data.name+' emblem':undefined}>
   <Image src={data.src} alt="" width={192} height={192} unoptimized
     priority={priority} draggable={false} className="rch-program-emblem-image"/>
 </span>;
}
