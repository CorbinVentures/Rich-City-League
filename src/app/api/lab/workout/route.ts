import { NextResponse } from 'next/server';
import { getDrillsForSkill, RCL_DRILL_LIBRARY } from '@/lib/rcl-drill-library';

const skills = ['Shooting', 'Ball handling', 'Finishing', 'Playmaking', 'Defense', 'Athleticism', 'Rebounding', 'Mental / IQ'] as const;
const levels = ['Beginner', 'Intermediate', 'Advanced', 'Elite'] as const;
const lengths = [15, 30, 45, 60, 90] as const;
const environments = ['Indoor court', 'Outdoor court', 'Gym', 'Home / no equipment'] as const;
const maxBodySize = 8_000;
const providerTimeoutMs = 18_000;

type WorkoutRequest = { skill: typeof skills[number]; level: typeof levels[number]; length: typeof lengths[number]; environment: typeof environments[number]; equipment: string[]; goal: string };
export type WorkoutDrill = {
  id: string;
  slug: string;
  title: string;
  description: string;
  prescription: string;
  duration: number;
  focus: string[];
  coachingPoints: string[];
  commonMistakes: string[];
  instructions: string[];
  demonstrationType: 'animation' | 'video';
  skill: string;
  difficulty: string;
  equipment: string[];
  videoSlug: string;
  videoId: string;
};
export type Workout = { title: string; skill: string; minutes: number; difficulty: string; goal: string; warmup: string[]; drills: WorkoutDrill[]; finisher: string; coachingNotes: string[] };

function normalizeInput(input: unknown): WorkoutRequest | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  const skill = typeof value.skill === 'string' ? value.skill.trim() : '';
  const level = typeof value.level === 'string' ? value.level.trim() : '';
  const environment = typeof value.environment === 'string' ? value.environment.trim() : '';
  const equipment = Array.isArray(value.equipment) ? value.equipment.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];
  const goal = typeof value.goal === 'string' ? value.goal.trim() : '';
  const length = typeof value.length === 'number' ? value.length : Number(value.length);
  if (!skills.includes(skill as WorkoutRequest['skill']) || !levels.includes(level as WorkoutRequest['level']) || !lengths.includes(length as WorkoutRequest['length']) || !environments.includes(environment as WorkoutRequest['environment'])) return null;
  if (!equipment.length || equipment.length > 8 || equipment.some((item) => item.length > 40) || (equipment.includes('None') && equipment.length > 1) || goal.length > 500) return null;
  return { skill: skill as WorkoutRequest['skill'], level: level as WorkoutRequest['level'], length: length as WorkoutRequest['length'], environment: environment as WorkoutRequest['environment'], equipment: [...new Set(equipment)], goal };
}

function errorResponse(message: string, status: number, code: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function libraryDrill(drill: typeof RCL_DRILL_LIBRARY[number], index: number): WorkoutDrill {
  const videoId = drill.videoUrl.split('/').pop() ?? drill.slug;
  return {
    id: `${drill.drillId}-${index}`,
    slug: drill.slug,
    title: drill.name,
    description: drill.description,
    prescription: `${drill.sets} sets × ${drill.repetitions} reps`,
    duration: drill.durationSeconds,
    focus: drill.tags.slice(0, 3),
    coachingPoints: drill.coachingPoints,
    commonMistakes: drill.commonMistakes,
    instructions: drill.instructions,
    demonstrationType: 'animation',
    skill: drill.skill,
    difficulty: drill.difficulty,
    equipment: drill.equipment,
    videoSlug: drill.slug,
    videoId,
  };
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function compatibleLabDrills(input: WorkoutRequest) {
  const difficultyRank = levels.indexOf(input.level);
  return getDrillsForSkill(input.skill).filter((drill) => {
    const drillRank = levels.indexOf(drill.difficulty as WorkoutRequest['level']);
    const levelOk = drillRank < 0 || drillRank <= Math.min(levels.length - 1, difficultyRank + 1);
    const equipmentOk = drill.equipment.every((item) => item === 'None' || input.equipment.includes(item));
    return levelOk && equipmentOk;
  });
}

function sessionTiming(length: WorkoutRequest['length']) {
  if (length <= 15) return { warmup: 3, finisher: 2, main: 10 };
  if (length <= 30) return { warmup: 5, finisher: 3, main: 22 };
  if (length <= 45) return { warmup: 6, finisher: 4, main: 35 };
  if (length <= 60) return { warmup: 8, finisher: 5, main: 47 };
  return { warmup: 10, finisher: 7, main: 73 };
}

function fitDrillTime(drills: WorkoutDrill[], length: WorkoutRequest['length']) {
  if (!drills.length) return drills;
  const { main } = sessionTiming(length);
  const base = Math.max(2, Math.floor(main / drills.length));
  let remaining = main - base * drills.length;
  return drills.map((drill) => {
    const minutes = base + (remaining-- > 0 ? 1 : 0);
    return { ...drill, duration: Math.max(120, minutes * 60) };
  });
}

function warmupFor(length: WorkoutRequest['length']) {
  const minutes = sessionTiming(length).warmup;
  if (minutes <= 3) return [`Dynamic movement + ball rhythm · ${minutes} minutes`];
  const movement = Math.max(2, Math.floor(minutes / 2));
  return [`Dynamic movement and mobility · ${movement} minutes`, `Ball touches and low-intensity form work · ${minutes - movement} minutes`];
}

function fallbackWorkout(input: WorkoutRequest): Workout {
  const pool = compatibleLabDrills(input);
  const drillCount = input.length <= 15 ? 2 : input.length <= 45 ? 3 : input.length <= 60 ? 4 : 5;
  const selected = shuffled(pool).slice(0, Math.min(drillCount, pool.length)).map(libraryDrill);
  const drills = fitDrillTime(selected, input.length);
  const finisherMinutes = sessionTiming(input.length).finisher;
  return {
    title: `${input.skill} ${['development','game-speed','skill-build','performance'][Math.floor(Math.random()*4)]} session`,
    skill: input.skill,
    minutes: input.length,
    difficulty: input.level,
    goal: input.goal || `Build reliable ${input.skill.toLowerCase()} habits`,
    warmup: warmupFor(input.length),
    drills,
    finisher: `Use the final ${finisherMinutes} minutes for quality reps of the session's main skill. Stop and reset whenever mechanics break down.`,
    coachingNotes: ['Track misses without judgment.', 'Reset your feet and breathing between reps.', `Use your ${input.environment.toLowerCase()} to rehearse game-speed intent.`],
  };
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, 12) : [];
}

function normalizeWorkout(value: unknown, input: WorkoutRequest): Workout | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const pool = compatibleLabDrills(input);
  if (!pool.length) return null;
  const drills = Array.isArray(candidate.drills) ? candidate.drills.map((item, index) => {
    if (!item || typeof item !== 'object') return null;
    const raw = item as Record<string, unknown>;
    const slug = typeof raw.videoSlug === 'string' ? raw.videoSlug : typeof raw.slug === 'string' ? raw.slug : '';
    const libraryEntry = pool.find((drill) => drill.slug === slug) ?? pool[index % pool.length];
    if (!libraryEntry) return null;
    const base = libraryDrill(libraryEntry, index);
    return {
      ...base,
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : base.title,
      description: typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : base.description,
      prescription: typeof raw.prescription === 'string' && raw.prescription.trim() ? raw.prescription.trim() : base.prescription,
      focus: asStringArray(raw.focus).length ? asStringArray(raw.focus) : base.focus,
      instructions: base.instructions,
      coachingPoints: base.coachingPoints,
      commonMistakes: base.commonMistakes,
      demonstrationType: 'animation' as const,
    };
  }).filter((item) => item !== null).slice(0, 8) : [];
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  if (!title || !drills.length) return null;
  return {
    title: title.slice(0, 120),
    skill: input.skill,
    minutes: input.length,
    difficulty: typeof candidate.difficulty === 'string' ? candidate.difficulty.slice(0, 30) : input.level,
    goal: typeof candidate.goal === 'string' && candidate.goal.trim() ? candidate.goal.trim().slice(0, 500) : input.goal || `Build reliable ${input.skill.toLowerCase()} habits`,
    warmup: warmupFor(input.length),
    drills: fitDrillTime(drills, input.length),
    finisher: typeof candidate.finisher === 'string' && candidate.finisher.trim() ? candidate.finisher.trim().slice(0, 500) : `Finish with ${sessionTiming(input.length).finisher} minutes of focused, high-quality work.`,
    coachingNotes: asStringArray(candidate.coachingNotes),
  };
}

async function readProviderResponse(input: WorkoutRequest, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), providerTimeoutMs);
  try {
    const response = await fetch(process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: ['Bearer', apiKey].join(' '), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.9,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an expert basketball development coach. Return JSON with title, goal, warmup string[], drills object[], finisher, and coachingNotes string[]. Every drill MUST belong to the requested skill category. Vary drill selection, order, prescriptions, title, finisher, and coaching emphasis between requests. Respect the requested level, available equipment, environment, duration, and goal. Do not substitute drills from another category. Each drill must reference one of these allowed videoSlug values and never include a URL: ' + compatibleLabDrills(input).map((drill) => drill.slug).join(', ') },
          { role: 'user', content: JSON.stringify(input) },
        ],
      }),
      signal: controller.signal,
    });
    if (response.status === 429) throw new Error('RATE_LIMITED');
    if (!response.ok) throw new Error('PROVIDER_UNAVAILABLE');
    const payload: unknown = await response.json();
    const content = payload && typeof payload === 'object' && 'choices' in payload && Array.isArray(payload.choices) ? (payload.choices[0] as { message?: { content?: unknown } })?.message?.content : null;
    if (typeof content !== 'string' || !content.trim()) throw new Error('EMPTY_RESPONSE');
    return JSON.parse(content) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > maxBodySize) return errorResponse('That request is too large. Shorten your goal and try again.', 413, 'PAYLOAD_TOO_LARGE');
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return errorResponse('Send a valid workout request.', 400, 'INVALID_JSON'); }
    const input = normalizeInput(body);
    if (!input) return errorResponse('Choose a valid skill, level, length, environment, equipment, and goal.', 400, 'INVALID_INPUT');
    if (!compatibleLabDrills(input).length) {
      return errorResponse(`No ${input.skill.toLowerCase()} drills match that equipment setup. Add the required equipment or choose a different focus.`, 422, 'NO_COMPATIBLE_DRILLS');
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ workout: fallbackWorkout(input), generatedBy: 'RCL training engine' });
    try {
      const workout = normalizeWorkout(await readProviderResponse(input, apiKey), input);
      if (workout) return NextResponse.json({ workout, generatedBy: 'RCL AI coach' });
      return NextResponse.json({ workout: fallbackWorkout(input), generatedBy: 'RCL training engine', fallbackReason: 'AI session validation failed' });
    } catch (error) {
      const fallbackReason = error instanceof Error && error.name === 'AbortError' ? 'AI timeout' : error instanceof Error ? error.message : 'AI unavailable';
      return NextResponse.json({ workout: fallbackWorkout(input), generatedBy: 'RCL training engine', fallbackReason });
    }
  } catch {
    return errorResponse('We could not process that workout request. Please try again.', 500, 'REQUEST_FAILED');
  }
}
