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
];

export function getDrillsForSkill(skill: string) {
  const exact = RCL_DRILL_LIBRARY.filter((drill) => drill.skill.toLowerCase() === skill.toLowerCase() && drill.isActive);
  return exact.length ? exact : RCL_DRILL_LIBRARY.filter((drill) => drill.isActive);
}

export function getDrillBySlug(slug: string) {
  return RCL_DRILL_LIBRARY.find((drill) => drill.slug === slug && drill.isActive);
}
