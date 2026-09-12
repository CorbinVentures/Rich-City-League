import { NextResponse } from 'next/server';
import { getDrillsForSkill, RCL_DRILL_LIBRARY } from '@/lib/rcl-drill-library';

const levels = ['Beginner', 'Intermediate', 'Advanced', 'Elite'] as const;
const lengths = [15, 30, 45, 60, 90] as const;
const environments = ['Indoor court', 'Outdoor court', 'Gym', 'Home / no equipment'] as const;
const maxBodySize = 8_000;
const providerTimeoutMs = 18_000;

type WorkoutRequest = { skill: string; level: typeof levels[number]; length: typeof lengths[number]; environment: typeof environments[number]; equipment: string[]; goal: string };
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
  if (!skill || skill.length > 80 || !levels.includes(level as WorkoutRequest['level']) || !lengths.includes(length as WorkoutRequest['length']) || !environments.includes(environment as WorkoutRequest['environment'])) return null;
  if (equipment.length > 8 || equipment.some((item) => item.length > 40) || goal.length > 500) return null;
  return { skill, level: level as WorkoutRequest['level'], length: length as WorkoutRequest['length'], environment: environment as WorkoutRequest['environment'], equipment: [...new Set(equipment)], goal };
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
    skill: drill.skill,
    difficulty: drill.difficulty,
    equipment: drill.equipment,
    videoSlug: drill.slug,
    videoId,
  };
}

function fallbackWorkout(input: WorkoutRequest): Workout {
  const drills = getDrillsForSkill(input.skill).slice(0, 3).map(libraryDrill);
  return {
    title: `${input.skill} consistency session`,
    skill: input.skill,
    minutes: input.length,
    difficulty: input.level,
    goal: input.goal || `Build reliable ${input.skill.toLowerCase()} habits`,
    warmup: ['Dynamic movement and mobility · 3 minutes', 'Ball touches and rhythm work · 2 minutes', 'Low-intensity form repetitions · 3 minutes'],
    drills,
    finisher: `Complete ${Math.max(5, Math.round(input.length / 3))} quality reps before you leave.`,
    coachingNotes: ['Track misses without judgment.', 'Reset your feet and breathing between reps.', `Use your ${input.environment.toLowerCase()} to rehearse game-speed intent.`],
  };
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, 12) : [];
}

function normalizeWorkout(value: unknown, input: WorkoutRequest): Workout | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const drills = Array.isArray(candidate.drills) ? candidate.drills.map((item, index) => {
    if (!item || typeof item !== 'object') return null;
    const raw = item as Record<string, unknown>;
    const slug = typeof raw.videoSlug === 'string' ? raw.videoSlug : typeof raw.slug === 'string' ? raw.slug : '';
    const libraryEntry = getDrillsForSkill(input.skill).find((drill) => drill.slug === slug) ?? getDrillsForSkill(input.skill)[index % getDrillsForSkill(input.skill).length];
    if (!libraryEntry) return null;
    const base = libraryDrill(libraryEntry, index);
    return {
      ...base,
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : base.title,
      description: typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : base.description,
      prescription: typeof raw.prescription === 'string' && raw.prescription.trim() ? raw.prescription.trim() : base.prescription,
      focus: asStringArray(raw.focus).length ? asStringArray(raw.focus) : base.focus,
    };
  }).filter((item): item is WorkoutDrill => item !== null).slice(0, 8) : [];
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  if (!title || !drills.length) return null;
  return {
    title: title.slice(0, 120),
    skill: input.skill,
    minutes: input.length,
    difficulty: typeof candidate.difficulty === 'string' ? candidate.difficulty.slice(0, 30) : input.level,
    goal: typeof candidate.goal === 'string' && candidate.goal.trim() ? candidate.goal.trim().slice(0, 500) : input.goal || `Build reliable ${input.skill.toLowerCase()} habits`,
    warmup: asStringArray(candidate.warmup),
    drills,
    finisher: typeof candidate.finisher === 'string' ? candidate.finisher.trim().slice(0, 500) : 'Finish with one focused, high-quality round.',
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
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an expert basketball development coach. Return JSON with title, goal, warmup string[], drills object[], finisher, and coachingNotes string[]. Each drill must reference one of these known videoSlug values and never include a URL: ' + getDrillsForSkill(input.skill).map((drill) => drill.slug).join(', ') },
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ workout: fallbackWorkout(input), generatedBy: 'RCL training engine' });
    try {
      const workout = normalizeWorkout(await readProviderResponse(input, apiKey), input);
      if (!workout) return errorResponse('The coach returned an incomplete session. Please try again.', 502, 'INVALID_PROVIDER_RESPONSE');
      return NextResponse.json({ workout, generatedBy: 'RCL AI coach' });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return errorResponse('The coach took too long to respond. Try again in a moment.', 504, 'AI_TIMEOUT');
      if (error instanceof Error && error.message === 'RATE_LIMITED') return errorResponse('The coach is busy right now. Please try again shortly.', 429, 'AI_RATE_LIMITED');
      return errorResponse('The coach is temporarily unavailable. Try again or use the training engine.', 502, 'AI_UNAVAILABLE');
    }
  } catch {
    return errorResponse('We could not process that workout request. Please try again.', 500, 'REQUEST_FAILED');
  }
}
