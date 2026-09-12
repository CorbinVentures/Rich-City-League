import { NextResponse } from 'next/server';

const levels = ['Beginner', 'Intermediate', 'Advanced', 'Elite'] as const;
const lengths = [15, 30, 45, 60, 90] as const;

type WorkoutRequest = { skill: string; level: string; length: number; environment: string; equipment: string[]; goal: string };
type Drill = { title: string; prescription: string; focus: string[] };
type Workout = { title: string; skill: string; minutes: number; difficulty: string; goal: string; warmup: string[]; drills: Drill[]; finisher: string; coachingNotes: string[] };

function validInput(input: unknown): input is WorkoutRequest {
  if (!input || typeof input !== 'object') return false;
  const value = input as Partial<WorkoutRequest>;
  return typeof value.skill === 'string' && value.skill.length >= 2 && value.skill.length <= 80
    && typeof value.level === 'string' && levels.includes(value.level as typeof levels[number])
    && typeof value.length === 'number' && lengths.includes(value.length as typeof lengths[number])
    && typeof value.environment === 'string' && value.environment.length <= 60
    && Array.isArray(value.equipment) && value.equipment.every((item) => typeof item === 'string' && item.length <= 40)
    && typeof value.goal === 'string' && value.goal.length <= 500;
}

function fallbackWorkout(input: WorkoutRequest): Workout {
  const skill = input.skill.trim();
  const goal = input.goal.trim() || `Build reliable ${skill.toLowerCase()} habits`;
  return {
    title: `${skill} consistency program`,
    skill,
    minutes: input.length,
    difficulty: input.level,
    goal,
    warmup: ['Dynamic movement and mobility', 'Ball touches and rhythm work', 'Low-intensity form repetitions'],
    drills: [
      { title: `${skill} fundamentals`, prescription: `3 sets × 8 quality repetitions`, focus: ['Balance', 'Technique', 'Controlled tempo'] },
      { title: 'Pressure progression', prescription: `${Math.max(2, Math.round(input.length / 15))} rounds at game speed`, focus: ['Decision making', 'Footwork', 'Consistency'] },
      { title: 'Game-situation circuit', prescription: '5 locations · 3 rounds · reset with purpose', focus: ['Read the floor', 'Compete', 'Finish strong'] },
    ],
    finisher: 'Make 10 quality reps before you leave.',
    coachingNotes: ['Track misses without judgment.', 'Reset your feet and breathing between reps.', `Use your ${input.environment.toLowerCase()} to rehearse game-speed intent.`],
  };
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    if (!validInput(input)) return NextResponse.json({ error: 'Choose a skill, valid level, workout length, environment, equipment, and goal.' }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ workout: fallbackWorkout(input), generatedBy: 'RCL training engine' });

    const response = await fetch(process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `****** 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: 'You are an expert basketball development coach. Return only valid JSON with title, skill, minutes, difficulty, goal, warmup (string[]), drills (objects with title, prescription, focus string[]), finisher, and coachingNotes string[]. Never invent player statistics.' }, { role: 'user', content: JSON.stringify(input) }],
      }),
    });
    if (!response.ok) throw new Error('AI provider unavailable');
    const payload = await response.json();
    const workout = JSON.parse(payload.choices?.[0]?.message?.content ?? '');
    if (!workout || !Array.isArray(workout.drills) || !Array.isArray(workout.warmup) || !Array.isArray(workout.coachingNotes)) throw new Error('Invalid workout response');
    return NextResponse.json({ workout, generatedBy: 'RCL AI coach' });
  } catch {
    return NextResponse.json({ error: 'We could not generate that workout right now. Please try again.' }, { status: 502 });
  }
}
