export type TeamTheme = {
  accent: string;
  secondary: string;
  glow: string;
  surface: string;
  motif: string;
  tagline: string;
  atmosphere: string;
};

const themes: Record<string, TeamTheme> = {
  'roc-nation-hoops': {accent:'#c5222a',secondary:'#d4c6ad',glow:'#ff3945',surface:'#0b0a0a',motif:'crown',tagline:'Harder · Higher · Together',atmosphere:'radial-gradient(circle at 50% -10%, rgba(197,34,42,.38), transparent 34%), linear-gradient(135deg,#050505 0%,#17100f 50%,#050505 100%)'},
  'river-city-renegades': {accent:'#148a69',secondary:'#d0b476',glow:'#21d693',surface:'#050b09',motif:'renegade',tagline:'Ride Together · Run The River',atmosphere:'radial-gradient(circle at 80% 15%, rgba(20,138,105,.4), transparent 30%), linear-gradient(135deg,#030706 0%,#10211b 52%,#030706 100%)'},
  'goats': {accent:'#8a69e8',secondary:'#d8d1e8',glow:'#b39aff',surface:'#08070d',motif:'horns',tagline:'Greatness Is The Standard',atmosphere:'radial-gradient(circle at 25% 0%, rgba(138,105,232,.42), transparent 32%), linear-gradient(140deg,#050508,#171124 55%,#050508)'},
  'hoop-dreamz': {accent:'#966be2',secondary:'#f0d589',glow:'#bc91ff',surface:'#080711',motif:'skyline',tagline:'Dream It · Hoop It · Live It',atmosphere:'radial-gradient(circle at 70% 10%, rgba(150,107,226,.4), transparent 34%), linear-gradient(145deg,#05050a,#171026 55%,#05050a)'},
  'full-court-love': {accent:'#d84645',secondary:'#e1c58e',glow:'#ff6154',surface:'#0c0807',motif:'crown',tagline:'Love The Game · Own The Court',atmosphere:'radial-gradient(circle at 78% 8%, rgba(216,70,69,.38), transparent 32%), linear-gradient(140deg,#080504,#24130e 52%,#080504)'},
  'spartans': {accent:'#b33c45',secondary:'#c7a66e',glow:'#ef5964',surface:'#090707',motif:'shield',tagline:'Built For Battle',atmosphere:'radial-gradient(circle at 72% 5%, rgba(179,60,69,.4), transparent 34%), linear-gradient(145deg,#050505,#21100f 52%,#050505)'},
  'team-fast-break-family': {accent:'#2999d0',secondary:'#d6e0e8',glow:'#50c6ff',surface:'#050a0e',motif:'speed',tagline:'Fast · Fearless · Family',atmosphere:'radial-gradient(circle at 80% 5%, rgba(41,153,208,.42), transparent 34%), linear-gradient(145deg,#03070a,#0c2030 52%,#03070a)'},
  'team-never-give-up': {accent:'#d74a50',secondary:'#ddd2b8',glow:'#ff6b70',surface:'#0a0707',motif:'grit',tagline:'Pressure Builds Purpose',atmosphere:'radial-gradient(circle at 80% 8%, rgba(215,74,80,.4), transparent 32%), linear-gradient(145deg,#050505,#21100f 52%,#050505)'},
  'wolves': {accent:'#8d55d6',secondary:'#c1b7d3',glow:'#b07bea',surface:'#07070b',motif:'claw',tagline:'Hunt Together',atmosphere:'radial-gradient(circle at 75% 5%, rgba(141,85,214,.46), transparent 34%), linear-gradient(145deg,#040405,#160c20 52%,#040405)'},
  'charlottesville-summit': {accent:'#4e9bd1',secondary:'#d4c28e',glow:'#79c3fa',surface:'#07111a',motif:'summit',tagline:'Rise Above The Noise',atmosphere:'radial-gradient(circle at 75% 10%, rgba(78,155,209,.42), transparent 34%), linear-gradient(145deg,#050a10,#102237 54%,#05080d)'},
  'norfolk-destroyers': {accent:'#c13f49',secondary:'#d2b46f',glow:'#ff5b64',surface:'#090a10',motif:'anchor',tagline:'Own The Tide',atmosphere:'radial-gradient(circle at 78% 8%, rgba(193,63,73,.42), transparent 34%), linear-gradient(145deg,#05070d,#181b29 56%,#07090f)'},
  'winchester-phantoms': {accent:'#9c76d6',secondary:'#c7d2df',glow:'#c19cff',surface:'#080b13',motif:'phantom',tagline:'Leave No Trace. Leave A Legacy.',atmosphere:'radial-gradient(circle at 72% 5%, rgba(156,118,214,.43), transparent 34%), linear-gradient(145deg,#05070d,#151626 55%,#07090f)'},
};
const FALLBACK:TeamTheme={accent:'#5e9fc7',secondary:'#d7c69b',glow:'#89c9ed',surface:'#07111a',motif:'basketball',tagline:'Virginia Basketball',atmosphere:'radial-gradient(circle at 70% 5%, rgba(94,159,199,.34), transparent 34%), linear-gradient(145deg,#05090d,#102235 55%,#05090d)'};

function canonicalTeamSlug(slug:string){return slug.toLowerCase().replace(/^la-team-\\d+-/,'');}

export function getTeamTheme(slug:string,primary?:string|null,secondary?:string|null):TeamTheme{
 const base=themes[canonicalTeamSlug(slug)]??FALLBACK;
 return {...base,accent:primary??base.accent,secondary:secondary??base.secondary};
}
