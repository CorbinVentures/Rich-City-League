export const LAB_MOTIONS = [
  {id:'defensive-slide',label:'Defensive Slide V1',category:'Defense',clip:'RCL_Defensive_Slide_v1',file:'/lab3d/RCL_Defensive_Slide_v1.glb',duration:1.6,fps:30,ball:false},
  {id:'closeout',label:'Closeout V1',category:'Defense',clip:'RCL_Closeout_v1',file:'/lab3d/RCL_Closeout_v1.glb',duration:1.8,fps:30,ball:false},
  {id:'triple-threat-jab',label:'Triple-Threat / Jab V1',category:'Footwork',clip:'RCL_Triple_Threat_Jab_v1',file:'/lab3d/RCL_Triple_Threat_Jab_v1.glb',duration:1.3,fps:30,ball:false},
  {id:'dribble-stance',label:'Dribble Stance V1',category:'Ball Handling',clip:'RCL_Dribble_Stance_v1',file:'/lab3d/RCL_Dribble_Stance_v1.glb',duration:1.0,fps:30,ball:true},
  {id:'chest-pass',label:'Chest Pass V1',category:'Passing',clip:'RCL_Chest_Pass_v1',file:'/lab3d/RCL_Chest_Pass_v1.glb',duration:1.25,fps:30,ball:true},
  {id:'set-shot',label:'Set Shot V1',category:'Shooting',clip:'RCL_Set_Shot_v1',file:'/lab3d/RCL_Set_Shot_v1.glb',duration:1.45,fps:30,ball:true},
] as const;

export type LabMotionId=(typeof LAB_MOTIONS)[number]['id'];
export type LabMotion=(typeof LAB_MOTIONS)[number];
export type LabMotionMatch={motion:LabMotion|null;exact:boolean;note:string};

export function getLabMotion(id:LabMotionId){
  const motion=LAB_MOTIONS.find(m=>m.id===id);
  if(!motion)throw new Error('Unknown Lab motion: '+id);
  return motion;
}

const has=(value:string,...terms:string[])=>terms.some(term=>value.includes(term));

export function matchLabMotionForDrill({title,skill}:{title:string;skill:string}):LabMotionMatch{
  const name=title.toLowerCase();
  const category=skill.toLowerCase();
  const pick=(id:LabMotionId,exact:boolean,note:string):LabMotionMatch=>({motion:getLabMotion(id),exact,note});

  if(has(name,'closeout','close out'))return pick('closeout',true,'Matched to the closeout mechanics used in this drill.');
  if(has(name,'mirror slide','defensive slide','slide reaction'))return pick('defensive-slide',true,'Matched to the lateral defensive footwork used in this drill.');
  if(has(name,'triple threat','triple-threat','jab'))return pick('triple-threat-jab',true,'Matched to the jab and triple-threat footwork used in this drill.');
  if(has(name,'stationary ball','stationary dribble','dribble stance'))return pick('dribble-stance',true,'Matched to the stationary dribble stance used in this drill.');
  if(has(name,'chest pass'))return pick('chest-pass',true,'Matched to the passing mechanics used in this drill.');
  if(has(name,'set shot','form shooting'))return pick('set-shot',true,'Matched to the compact shooting mechanics used in this drill.');

  if(category==='shooting')return pick('set-shot',false,'Technique reference: use this to study base, load, release and balance. The full drill may add footwork or movement.');
  if(category==='ball handling')return pick('dribble-stance',false,'Technique reference: use this to study stance, hand position and ball control. The full drill may add direction and pace changes.');
  if(category==='defense')return has(name,'recover','help')
    ?pick('closeout',false,'Technique reference: use this to study controlled recovery and high-hand arrival before adding the full help-and-recover pattern.')
    :pick('defensive-slide',false,'Technique reference: use this to study stance and lateral push mechanics before adding the full drill pattern.');
  if(category==='playmaking')return has(name,'change of direction','change direction')
    ?pick('triple-threat-jab',false,'Technique reference: use this to study the sell, plant and first-step mechanics before adding the live read.')
    :pick('chest-pass',false,'Technique reference: use this to study passing mechanics. The full drill still requires the read, timing and decision shown in the coaching steps.');

  return {motion:null,exact:false,note:'This drill is taught with a skill-specific coaching board because the current 3D library does not yet contain an exact movement match.'};
}
