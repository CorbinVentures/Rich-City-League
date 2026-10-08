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
  'roc-nation-hoops': {
    accent:'#c5222a', secondary:'#b7b0a3', glow:'#ff3945', surface:'#0b0a0a',
    motif:'crown', tagline:'Harder · Higher · Together',
    atmosphere:'radial-gradient(circle at 50% -10%, rgba(197,34,42,.38), transparent 34%), linear-gradient(135deg,#050505 0%,#17100f 50%,#050505 100%)',
  },
  'river-city-renegades': {
    accent:'#0f8a62', secondary:'#c7c4ba', glow:'#21d693', surface:'#050b09',
    motif:'renegade', tagline:'Ride Together · Run The River',
    atmosphere:'radial-gradient(circle at 80% 15%, rgba(15,138,98,.38), transparent 30%), linear-gradient(135deg,#030706 0%,#10211b 52%,#030706 100%)',
  },
  'goats': {
    accent:'#7c3aed', secondary:'#c7c7cb', glow:'#a855f7', surface:'#08070d',
    motif:'horns', tagline:'Greatness Is The Standard',
    atmosphere:'radial-gradient(circle at 25% 0%, rgba(124,58,237,.42), transparent 32%), linear-gradient(140deg,#050508,#161124 55%,#050508)',
  },
  'hoop-dreamz': {
    accent:'#8b5cf6', secondary:'#d7d3df', glow:'#b26cff', surface:'#080711',
    motif:'skyline', tagline:'Dream It · Hoop It · Live It',
    atmosphere:'radial-gradient(circle at 70% 10%, rgba(139,92,246,.40), transparent 34%), linear-gradient(145deg,#05050a,#171026 55%,#05050a)',
  },
  'full-court-love': {
    accent:'#d62929', secondary:'#d5ad63', glow:'#ff4b3e', surface:'#0c0807',
    motif:'crown', tagline:'Love The Game · Own The Court',
    atmosphere:'radial-gradient(circle at 78% 8%, rgba(214,41,41,.38), transparent 32%), linear-gradient(140deg,#080504,#24130e 52%,#080504)',
  },
  'spartans': {
    accent:'#9f1d24', secondary:'#b68a55', glow:'#ef3340', surface:'#090707',
    motif:'shield', tagline:'Built For Battle',
    atmosphere:'radial-gradient(circle at 72% 5%, rgba(159,29,36,.42), transparent 34%), linear-gradient(145deg,#050505,#21100f 52%,#050505)',
  },
  'team-fast-break-family': {
    accent:'#1689d8', secondary:'#aeb9c4', glow:'#32b9ff', surface:'#050a0e',
    motif:'speed', tagline:'Fast · Fearless · Family',
    atmosphere:'radial-gradient(circle at 80% 5%, rgba(22,137,216,.44), transparent 34%), linear-gradient(145deg,#03070a,#0c2030 52%,#03070a)',
  },
  'team-never-give-up': {
    accent:'#d3232a', secondary:'#dedbd3', glow:'#ff3b42', surface:'#0a0707',
    motif:'grit', tagline:'Pressure Builds Purpose',
    atmosphere:'radial-gradient(circle at 80% 8%, rgba(211,35,42,.42), transparent 32%), linear-gradient(145deg,#050505,#21100f 52%,#050505)',
  },
  'wolves': {
    accent:'#7e22ce', secondary:'#9ca3af', glow:'#a855f7', surface:'#07070b',
    motif:'claw', tagline:'Hunt Together',
    atmosphere:'radial-gradient(circle at 75% 5%, rgba(126,34,206,.48), transparent 34%), linear-gradient(145deg,#040405,#160c20 52%,#040405)',
  },
  'street-legends': {
    accent:'#1686b8', secondary:'#c69a42', glow:'#29b6f6', surface:'#060a0d',
    motif:'street', tagline:'Built On The Blacktop',
    atmosphere:'radial-gradient(circle at 78% 6%, rgba(22,134,184,.40), transparent 34%), linear-gradient(145deg,#040709,#10212b 52%,#040709)',
  },
};

export function getTeamTheme(slug:string, primary?:string|null, secondary?:string|null):TeamTheme {
  const base=themes[slug]??{
    accent:primary??'#ff6b1a', secondary:secondary??'#94a3b8', glow:primary??'#ff6b1a', surface:'#05090d',
    motif:'basketball', tagline:'Richmond Basketball', atmosphere:'linear-gradient(135deg,#05090d,#102235 55%,#05090d)',
  };
  return {...base, accent:primary??base.accent, secondary:secondary??base.secondary};
}
