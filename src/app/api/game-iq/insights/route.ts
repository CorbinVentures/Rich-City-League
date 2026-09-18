import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';

function extractResponseText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  return (payload?.output ?? [])
    .flatMap((item: any) => item?.content ?? [])
    .map((item: any) => item?.text ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

export async function POST(request: Request) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const gameId = typeof body?.game_id === 'string' ? body.game_id : '';
  if (!gameId) return NextResponse.json({ error: 'game_id is required.' }, { status: 400 });

  const [gameResult, eventsResult, statsResult, teamsResult] = await Promise.all([
    supabase.from('games').select('id, home_team_id, away_team_id, home_score, away_score, status, season_id').eq('id', gameId).single(),
    supabase.from('game_events').select('*').eq('game_id', gameId).is('voided_at', null).order('sequence_no'),
    supabase.from('player_game_stats').select('*').eq('game_id', gameId),
    supabase.from('teams').select('id,name'),
  ]);
  if (gameResult.error || eventsResult.error || statsResult.error || teamsResult.error) {
    return NextResponse.json({ error: 'Unable to load the official game data.' }, { status: 500 });
  }

  const game = gameResult.data as unknown as {
    id: string;
    home_team_id: string;
    away_team_id: string;
    home_score: number;
    away_score: number;
    status: string;
    season_id: string;
  } | null;
  if (!game) return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
  const teamNames = new Map((teamsResult.data ?? []).map((team: { id: string; name: string }) => [team.id, team.name]));
  const payload = {
    game: {
      home: teamNames.get(game.home_team_id) ?? 'Home',
      away: teamNames.get(game.away_team_id) ?? 'Away',
      score: [game.home_score, game.away_score],
      status: game.status,
    },
    official_stats: statsResult.data ?? [],
    play_by_play: eventsResult.data ?? [],
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: 'AI analysis is not configured yet. Add OPENAI_API_KEY to the Vercel environment.',
      deterministic: {
        message: 'The RCL stat engine is active; AI interpretation is waiting for its server key.',
        events: eventsResult.data?.length ?? 0,
      },
    }, { status: 503 });
  }

  const model = process.env.OPENAI_GAME_IQ_MODEL || 'gpt-5.6-luna';
  const prompt = [
    'You are RCL Game IQ, a basketball analytics assistant.',
    'Use only the official structured game data supplied below. Never invent a stat, player action, lineup, injury, or coaching decision.',
    'Write a concise coach-facing game report with: 1) what happened, 2) key statistical drivers, 3) player impact notes, 4) one or two questions a coach should investigate next.',
    'Clearly distinguish recorded facts from analytical interpretation.',
    JSON.stringify(payload),
  ].join('\n\n');

  const aiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  });

  if (!aiResponse.ok) {
    const detail = await aiResponse.text();
    console.error('Game IQ OpenAI error', detail);
    return NextResponse.json({ error: 'Game IQ AI analysis failed.' }, { status: 502 });
  }

  const aiPayload = await aiResponse.json();
  const insight = extractResponseText(aiPayload);
  if (!insight) return NextResponse.json({ error: 'Game IQ returned no analysis.' }, { status: 502 });

  await supabase.from('game_ai_insights').insert({
    game_id: gameId,
    insight_type: 'postgame_coach_report',
    title: 'Game IQ Coach Report',
    body: insight,
    data: payload,
    confidence: 0.9,
    created_by: user.id,
  } as never);

  return NextResponse.json({ insight });
}
