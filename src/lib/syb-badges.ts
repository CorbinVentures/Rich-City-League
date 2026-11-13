export const SYB_CIRCUIT_BADGES = [
  {
    code:'syb_circuit_debut',
    name:'Circuit Debut',
    category:'ARRIVAL',
    requirement:'Complete your first independently verified 1v1 at an official SYB event.',
    story:'The first time your name hits the board.',
    mark:'01',
    tier:'DEBUT',
    icon:'basketball',
    awardable:true,
  },
  {
    code:'syb_first_w',
    name:'First W on Tape',
    category:'VICTORY',
    requirement:'Earn your first independently verified win in the SYB circuit.',
    story:'The record starts somewhere. Make it count.',
    mark:'W',
    tier:'VICTORY',
    icon:'trophy',
    awardable:true,
  },
  {
    code:'syb_run_it_back',
    name:'Run It Back',
    category:'RIVALRY',
    requirement:'Defeat an opponent who beat you in an earlier verified SYB matchup.',
    story:'Same matchup. Different ending.',
    mark:'R',
    tier:'RIVALRY',
    icon:'repeat',
    awardable:true,
  },
  {
    code:'syb_two_deep',
    name:'Two Deep',
    category:'EVENT RUN',
    requirement:'Earn two verified 1v1 wins during one official SYB event.',
    story:'One win gets attention. Two make a statement.',
    mark:'02',
    tier:'EVENT',
    icon:'bolt',
    awardable:true,
  },
  {
    code:'syb_road_tested',
    name:'Road Tested',
    category:'VIRGINIA CIRCUIT',
    requirement:'Earn verified SYB wins at three distinct event courts.',
    story:'Your game travels. Your record follows.',
    mark:'VA',
    tier:'ROAD',
    icon:'location',
    awardable:true,
  },
  {
    code:'syb_crown_keeper',
    name:'The Crown Stays',
    category:'CHAMPIONSHIP',
    requirement:'Defend an official SYB circuit title in a verified title match.',
    story:'A crown only means something if you can keep it.',
    mark:'C',
    tier:'CHAMPION',
    icon:'crown',
    awardable:false,
  },
] as const;

export type SybBadgeConcept=(typeof SYB_CIRCUIT_BADGES)[number];
export type SybBadgeCode=(typeof SYB_CIRCUIT_BADGES)[number]['code'];
export const SYB_AWARDABLE_BADGE_CODES=SYB_CIRCUIT_BADGES.filter(badge=>badge.awardable).map(badge=>badge.code);
export function getSybBadgeConcept(code:string){
 return SYB_CIRCUIT_BADGES.find(badge=>badge.code===code);
}
