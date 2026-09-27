export const LAB_MOTIONS = [
  {id:'defensive-slide',label:'Defensive Slide V1',category:'Defense',clip:'RCL_Defensive_Slide_v1',file:'/lab3d/RCL_Defensive_Slide_v1.glb',ball:false},
  {id:'closeout',label:'Closeout V1',category:'Defense',clip:'RCL_Closeout_v1',file:'/lab3d/RCL_Closeout_v1.glb',ball:false},
  {id:'triple-threat-jab',label:'Triple-Threat / Jab V1',category:'Footwork',clip:'RCL_Triple_Threat_Jab_v1',file:'/lab3d/RCL_Triple_Threat_Jab_v1.glb',ball:false},
  {id:'dribble-stance',label:'Dribble Stance V1',category:'Ball Handling',clip:'RCL_Dribble_Stance_v1',file:'/lab3d/RCL_Dribble_Stance_v1.glb',ball:true},
  {id:'chest-pass',label:'Chest Pass V1',category:'Passing',clip:'RCL_Chest_Pass_v1',file:'/lab3d/RCL_Chest_Pass_v1.glb',ball:true},
  {id:'set-shot',label:'Set Shot V1',category:'Shooting',clip:'RCL_Set_Shot_v1',file:'/lab3d/RCL_Set_Shot_v1.glb',ball:true},
] as const;

export type LabMotionId=(typeof LAB_MOTIONS)[number]['id'];

export function getLabMotion(id:LabMotionId){
  const motion=LAB_MOTIONS.find(m=>m.id===id);
  if(!motion)throw new Error('Unknown Lab motion: '+id);
  return motion;
}
