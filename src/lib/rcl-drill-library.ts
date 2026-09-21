export type DrillLibraryEntry = {
  drillId: string;
  slug: string;
  name: string;
  category: string;
  skill: string;
  difficulty: string;
  description: string;
  instructions: string[];
  coachingPoints: string[];
  commonMistakes: string[];
  durationSeconds: number;
  repetitions: number;
  sets: number;
  equipment: string[];
  videoUrl: string;
  videoProvider: 'youtube';
  thumbnailUrl: string;
  tags: string[];
  isActive: boolean;
};

const youtube = (id: string) => `https://www.youtube.com/embed/${id}`;
const thumbnail = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

export const RCL_DRILL_LIBRARY: DrillLibraryEntry[] = [
  {
    drillId: 'rcl-form-shooting',
    slug: 'form-shooting',
    name: 'Form Shooting',
    category: 'Shooting',
    skill: 'Shooting',
    difficulty: 'Beginner',
    description: 'Build a repeatable release from close range before adding distance.',
    instructions: ['Start one arm-length from the rim.', 'Make five clean swishes, then take one step back.', 'Keep the same guide-hand and landing mechanics.'],
    coachingPoints: ['Elbow under the ball', 'Hold the finish', 'Land balanced'],
    commonMistakes: ['Fading away', 'Thumb flicking the ball', 'Chasing makes instead of clean mechanics'],
    durationSeconds: 480,
    repetitions: 25,
    sets: 3,
    equipment: ['Basketball'],
    videoUrl: youtube('JXnq5VQqV8E'),
    videoProvider: 'youtube',
    thumbnailUrl: thumbnail('JXnq5VQqV8E'),
    tags: ['touch', 'mechanics', 'release'],
    isActive: true,
  },
  {
    drillId: 'rcl-stationary-ball-handling',
    slug: 'stationary-ball-handling',
    name: 'Stationary Ball-Handling Series',
    category: 'Ball handling',
    skill: 'Ball handling',
    difficulty: 'Beginner',
    description: 'Own the ball with low, controlled dribbles before moving into space.',
    instructions: ['Stay in an athletic stance.', 'Complete each pattern with both hands.', 'Keep your eyes up and change rhythm on command.'],
    coachingPoints: ['Finger pads, not palm', 'Hip-height stance', 'Eyes scan the floor'],
    commonMistakes: ['Standing upright', 'Watching the ball', 'Using only the dominant hand'],
    durationSeconds: 360,
    repetitions: 30,
    sets: 3,
    equipment: ['Basketball'],
    videoUrl: youtube('CMQp0z8pG7A'),
    videoProvider: 'youtube',
    thumbnailUrl: thumbnail('CMQp0z8pG7A'),
    tags: ['handles', 'control', 'rhythm'],
    isActive: true,
  },
  {
    drillId: 'rcl-mikan',
    slug: 'mikan-drill',
    name: 'Mikan Drill',
    category: 'Finishing',
    skill: 'Finishing',
    difficulty: 'Beginner',
    description: 'Develop touch, footwork, and finishing angles around the rim.',
    instructions: ['Alternate sides without bringing the ball below your shoulders.', 'Use the backboard target.', 'Finish softly and keep the ball protected.'],
    coachingPoints: ['Inside hand protects', 'Quick feet', 'Use the square'],
    commonMistakes: ['Pausing between sides', 'Dropping the ball', 'Jumping off the wrong foot'],
    durationSeconds: 300,
    repetitions: 40,
    sets: 3,
    equipment: ['Basketball'],
    videoUrl: youtube('JkR3s7Jwz3Y'),
    videoProvider: 'youtube',
    thumbnailUrl: thumbnail('JkR3s7Jwz3Y'),
    tags: ['touch', 'footwork', 'rim finishing'],
    isActive: true,
  },
  {
    drillId: 'rcl-cone-change-direction',
    slug: 'cone-change-of-direction',
    name: 'Cone Change of Direction',
    category: 'Playmaking',
    skill: 'Playmaking',
    difficulty: 'Intermediate',
    description: 'Connect a change of direction to a burst that creates an advantage.',
    instructions: ['Set two cones three steps apart.', 'Attack the first cone under control.', 'Sell the change, then burst past the second cone.'],
    coachingPoints: ['Drop the hips', 'Plant outside the frame', 'Burst for two steps'],
    commonMistakes: ['Telegraphing the move', 'Crossing feet', 'Changing speed too early'],
    durationSeconds: 420,
    repetitions: 12,
    sets: 4,
    equipment: ['Basketball', 'Cones'],
    videoUrl: youtube('K9S8r5dM8lQ'),
    videoProvider: 'youtube',
    thumbnailUrl: thumbnail('K9S8r5dM8lQ'),
    tags: ['separation', 'pace', 'decision making'],
    isActive: true,
  },
  {
    drillId: 'rcl-closeout-slides',
    slug: 'closeout-slides',
    name: 'Closeout and Slide',
    category: 'Defense',
    skill: 'Defense',
    difficulty: 'Intermediate',
    description: 'Practice arriving under control and containing the first drive.',
    instructions: ['Start in help position.', 'Sprint halfway, chop the steps, and contest without flying by.', 'Slide for three steps and recover.'],
    coachingPoints: ['Chest square', 'High hands', 'Push from the back foot'],
    commonMistakes: ['Crossing feet', 'Leaning at the attacker', 'Opening the hips too soon'],
    durationSeconds: 360,
    repetitions: 8,
    sets: 4,
    equipment: ['Cones'],
    videoUrl: youtube('8VJc7m7h2H0'),
    videoProvider: 'youtube',
    thumbnailUrl: thumbnail('8VJc7m7h2H0'),
    tags: ['containment', 'closeout', 'lateral movement'],
    isActive: true,
  },
  {
    drillId: 'rcl-lateral-bound',
    slug: 'lateral-bound',
    name: 'Lateral Bound and Stick',
    category: 'Athleticism',
    skill: 'Athleticism',
    difficulty: 'Intermediate',
    description: 'Build lateral force and landing control for basketball movement.',
    instructions: ['Load into one hip.', 'Bound laterally and stick the landing.', 'Reset completely before the next repetition.'],
    coachingPoints: ['Knee tracks over toes', 'Quiet landing', 'Own the position'],
    commonMistakes: ['Collapsing the knee', 'Rushing reps', 'Landing stiff-legged'],
    durationSeconds: 300,
    repetitions: 8,
    sets: 3,
    equipment: ['None'],
    videoUrl: youtube('7F1Qjv9s4Vw'),
    videoProvider: 'youtube',
    thumbnailUrl: thumbnail('7F1Qjv9s4Vw'),
    tags: ['power', 'landing', 'mobility'],
    isActive: true,
  },
  {
    drillId:'rcl-catch-shoot',slug:'catch-and-shoot',name:'Catch & Shoot Footwork',category:'Shooting',skill:'Shooting',difficulty:'Intermediate',description:'Groove game-speed footwork into a balanced catch-and-shoot release.',instructions:['Start behind the line.','Step into the catch on balance.','Hold the finish.'],coachingPoints:['Hands ready','Feet arrive before the ball','Land where you jumped'],commonMistakes:['Drifting sideways','Late hands','Rushing the dip'],durationSeconds:420,repetitions:20,sets:4,equipment:['Basketball'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['footwork','shot prep','balance'],isActive:true,
  },
  {
    drillId:'rcl-pullup',slug:'one-dribble-pullup',name:'One-Dribble Pull-Up',category:'Shooting',skill:'Shooting',difficulty:'Advanced',description:'Create a controlled pull-up after one hard attacking dribble.',instructions:['Attack off the catch.','Plant into a compact stop.','Rise straight up.'],coachingPoints:['Win the first step','Stop under control','Vertical lift'],commonMistakes:['Floating forward','Loose pickup','Wide base'],durationSeconds:420,repetitions:16,sets:4,equipment:['Basketball'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['pull-up','balance','game speed'],isActive:true,
  },
  {
    drillId:'rcl-cross-pound',slug:'cross-pound-series',name:'Cross & Pound Series',category:'Ball handling',skill:'Ball handling',difficulty:'Intermediate',description:'Train violent direction changes while keeping the ball protected.',instructions:['Pound outside the frame.','Cross below the knees.','Explode for two dribbles.'],coachingPoints:['Low hips','Shoulder sells move','Change pace'],commonMistakes:['High crossover','Same-speed dribble','Narrow stance'],durationSeconds:360,repetitions:24,sets:3,equipment:['Basketball'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['crossover','pace','control'],isActive:true,
  },
  {
    drillId:'rcl-retreat-attack',slug:'retreat-re-attack',name:'Retreat & Re-Attack',category:'Ball handling',skill:'Ball handling',difficulty:'Advanced',description:'Create space with a retreat dribble and immediately attack the defender again.',instructions:['Attack the cone.','Retreat two hard dribbles.','Change rhythm and re-attack.'],coachingPoints:['Protect the retreat','Eyes up','Explode forward'],commonMistakes:['Standing up','Retreating too far','No speed change'],durationSeconds:420,repetitions:12,sets:4,equipment:['Basketball','Cones'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['separation','rhythm','re-attack'],isActive:true,
  },
  {
    drillId:'rcl-reverse-finish',slug:'reverse-finishing',name:'Reverse Finishing Series',category:'Finishing',skill:'Finishing',difficulty:'Intermediate',description:'Use the rim as protection while finishing from both sides.',instructions:['Attack outside the lane.','Extend under the rim.','Finish high off glass.'],coachingPoints:['Use rim protection','Long last step','Eyes find square'],commonMistakes:['Leaving ball exposed','Jumping too early','Flat finish'],durationSeconds:360,repetitions:16,sets:3,equipment:['Basketball'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['reverse','touch','angles'],isActive:true,
  },
  {
    drillId:'rcl-floater',slug:'floater-lane',name:'Floater Lane',category:'Finishing',skill:'Finishing',difficulty:'Advanced',description:'Develop soft touch over help defenders from the middle of the paint.',instructions:['Attack downhill.','Gather off one or two feet.','Release before reaching the rim protector.'],coachingPoints:['Soft hand','High release','Control speed'],commonMistakes:['Throwing the ball','Driving too deep','Low release'],durationSeconds:360,repetitions:15,sets:4,equipment:['Basketball'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['floater','touch','paint'],isActive:true,
  },
  {
    drillId:'rcl-pnr-read',slug:'pick-roll-read',name:'Pick & Roll Read Series',category:'Playmaking',skill:'Playmaking',difficulty:'Advanced',description:'Rehearse pocket pass, reject, and pull-up reads from ball-screen action.',instructions:['Set up a cone as screener.','Read the imaginary coverage.','Execute the called option.'],coachingPoints:['Manipulate defender','Keep dribble alive','See weak-side help'],commonMistakes:['Predetermining read','Picking up dribble','Ignoring help'],durationSeconds:480,repetitions:12,sets:4,equipment:['Basketball','Cones'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['reads','passing','pick and roll'],isActive:true,
  },
  {
    drillId:'rcl-drive-kick',slug:'drive-kick-read',name:'Drive & Kick Read',category:'Playmaking',skill:'Playmaking',difficulty:'Intermediate',description:'Train paint touches and on-time kick-out decisions.',instructions:['Attack a gap.','Force the help read.','Deliver pass to target.'],coachingPoints:['Eyes up early','Two-foot balance','Pass on time'],commonMistakes:['Jump passing','Late read','Overdribbling'],durationSeconds:420,repetitions:15,sets:3,equipment:['Basketball','Cones'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['passing','decision making','paint touch'],isActive:true,
  },
  {
    drillId:'rcl-mirror-slides',slug:'mirror-slides',name:'Mirror Slide Reaction',category:'Defense',skill:'Defense',difficulty:'Beginner',description:'Build reactive lateral footwork without crossing the feet.',instructions:['Start low and square.','React to direction cue.','Recover to center.'],coachingPoints:['Active feet','Chest square','Hands visible'],commonMistakes:['Clicking heels','Standing tall','Reaching'],durationSeconds:300,repetitions:10,sets:4,equipment:['Cones'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['reaction','slides','stance'],isActive:true,
  },
  {
    drillId:'rcl-shell-recovery',slug:'shell-recovery',name:'Help & Recover Footwork',category:'Defense',skill:'Defense',difficulty:'Advanced',description:'Train help positioning, stunt timing, and controlled recovery.',instructions:['Start in help.','Stunt toward the lane.','Sprint and chop into recovery.'],coachingPoints:['See ball and man','Early help','High-hand recovery'],commonMistakes:['Overhelping','Turning back','Flying by'],durationSeconds:420,repetitions:10,sets:4,equipment:['Cones'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['help defense','recovery','positioning'],isActive:true,
  },
  {
    drillId:'rcl-decel',slug:'deceleration-stick',name:'Sprint, Decelerate & Stick',category:'Athleticism',skill:'Athleticism',difficulty:'Intermediate',description:'Build braking strength and body control for game-speed stops.',instructions:['Sprint ten yards.','Decelerate in three steps.','Stick athletic stance.'],coachingPoints:['Sink hips','Short braking steps','Knees track cleanly'],commonMistakes:['Stiff legs','Leaning back','Too many steps'],durationSeconds:300,repetitions:8,sets:4,equipment:['Cones'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['deceleration','control','speed'],isActive:true,
  },
  {
    drillId:'rcl-first-step',slug:'first-step-burst',name:'First-Step Burst',category:'Athleticism',skill:'Athleticism',difficulty:'Advanced',description:'Train explosive first-step mechanics over short basketball distances.',instructions:['Load athletic stance.','Drive hard through first three steps.','Walk back fully.'],coachingPoints:['Positive shin angle','Violent arm drive','Push the floor'],commonMistakes:['Popping upright','Overstriding','Rushing recovery'],durationSeconds:300,repetitions:6,sets:5,equipment:['Cones'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['acceleration','first step','power'],isActive:true,
  },
  {
    drillId:'rcl-hit-find',slug:'hit-find-pursue',name:'Hit, Find & Pursue',category:'Rebounding',skill:'Rebounding',difficulty:'Intermediate',description:'Build the habit of making contact, locating the ball, and pursuing with two hands.',instructions:['Hit the imaginary body.','Find the flight.','Pursue outside your frame.'],coachingPoints:['Contact first','Chin the ball','Two hands'],commonMistakes:['Watching shot','No contact','Bringing ball low'],durationSeconds:360,repetitions:12,sets:4,equipment:['Basketball'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['box out','pursuit','contact'],isActive:true,
  },
  {
    drillId:'rcl-outlet',slug:'rebound-outlet',name:'Rebound to Outlet',category:'Rebounding',skill:'Rebounding',difficulty:'Advanced',description:'Turn a secured rebound into an immediate transition outlet.',instructions:['Pursue rebound.','Land strong and pivot outside.','Deliver outlet to target.'],coachingPoints:['Strong chin','Outside pivot','Pass ahead'],commonMistakes:['Dribbling into traffic','Slow pivot','One-hand rebound'],durationSeconds:420,repetitions:10,sets:4,equipment:['Basketball','Cones'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['outlet','transition','rebounding'],isActive:true,
  },
  {
    drillId:'rcl-advantage-read',slug:'advantage-read',name:'Advantage Read: 2-on-1',category:'Mental / IQ',skill:'Mental / IQ',difficulty:'Intermediate',description:'Train rapid decisions when the offense has a numbers advantage.',instructions:['Visualize the low defender.','Call score or pass before second dribble.','Explain the read after each rep.'],coachingPoints:['Read defender hips','Decide early','Keep both options alive'],commonMistakes:['Predetermining','Overdribbling','Ignoring spacing'],durationSeconds:360,repetitions:12,sets:3,equipment:['Basketball','Cones'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['decision making','spacing','reads'],isActive:true,
  },
  {
    drillId:'rcl-clock-score',slug:'clock-score-situations',name:'Clock & Score Situations',category:'Mental / IQ',skill:'Mental / IQ',difficulty:'Advanced',description:'Practice possession decisions based on time, score, foul situation, and spacing.',instructions:['Read the scenario.','State best action.','Execute the matching skill rep.'],coachingPoints:['Know time and score','Value possession','Recognize best matchup'],commonMistakes:['Rushing','Ignoring clock','Forcing hero shots'],durationSeconds:420,repetitions:10,sets:3,equipment:['Basketball'],videoUrl:youtube('rcl-motion'),videoProvider:'youtube',thumbnailUrl:thumbnail('rcl-motion'),tags:['situations','clock','strategy'],isActive:true,
  },

];

export function getDrillsForSkill(skill: string) {
  const exact = RCL_DRILL_LIBRARY.filter((drill) => drill.skill.toLowerCase() === skill.toLowerCase() && drill.isActive);
  return exact.length ? exact : RCL_DRILL_LIBRARY.filter((drill) => drill.isActive);
}

export function getDrillBySlug(slug: string) {
  return RCL_DRILL_LIBRARY.find((drill) => drill.slug === slug && drill.isActive);
}
