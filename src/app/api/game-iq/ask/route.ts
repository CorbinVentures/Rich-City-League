import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { deriveGameAnalytics } from '@/lib/game-iq';
import type { Game, GameEvent, GameLineup, Player, PlayerGameStats } from '@/types/database';

function extractResponseText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text.trim();
  return (payload?.output ?? []).flatMap((item: any) => item?.content ?? []).map((item: any) => item?.text ?? '').filter(Boolean).join('\n').trim();
}

export async function POST(request: Request) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const gameId = typeof body?.game_id === 'string' ? body.game_id : '';
  const question = typeof body?.question === 'string' ? body.question.trim().slice(0, 500) : '';
  if (!gameId || !question) return NextResponse.json({ error: 'game_id and question are required.' }, { status: 400 });

  const [gameResult, eventsResult, statsResult, lineupsResult, playersResult] = await Promise.all([
    supabase.from('games').select('*').eq('id', gameId).single(),
    supabase.from('game_events').select('*').eq('game_id', gameId).is('voided_at', null).order('sequence_no'),
    supabase.from('player_game_stats').select('*').eq('game_id', gameId),
    supabase.from('game_lineups').select('*').eq('game_id', gameId),
    supabase.from('players').select('id,first_name,last_name,jersey_number'),
  ]);
  if (gameResult.error || eventsResult.error || statsResult.error || lineupsResult.error || playersResult.error) {
    return NextResponse.json({ error: 'Unable to load the official game data.' }, { status: 500 });
  }

  const game = gameResult.data as unknown as Game;
  const events = (eventsResult.data ?? []) as unknown as GameEvent[];
  const stats = (statsResult.data ?? []) as unknown as PlayerGameStats[];
  const lineups = (lineupsResult.data ?? []) as unknown as GameLineup[];
  const players = (playersResult.data ?? []) as unknown as Player[];
  const analytics = deriveGameAnalytics(game, events, stats, lineups);
  const playerNames = new Map(players.map((p) => [p.id, `#${p.jersey_number ?? '--'} ${p.first_name} ${p.last_name}`]));

  const compactStats = stats.map((s) => ({
    player: playerNames.get(s.player_id) ?? s.player_id,
    team_id: s.team_id,
    points: s.points, rebounds: s.rebounds, assists: s.assists, steals: s.steals, blocks: s.blocks,
    turnovers: s.turnovers, fouls: s.fouls, minutes: s.minutes, plus_minus: s.plus_minus,
    fgm: s.field_goals_made, fga: s.field_goals_attempted, tpm: s.three_pointers_made, tpa: s.three_pointers_attempted,
    ftm: s.free_throws_made, fta: s.free_throws_attempted,
  }));

  const compactEvents = events.map((e) => ({
    period: e.period_number, clock: e.clock_seconds, team_id: e.team_id, player: e.player_id ? playerNames.get(e.player_id) : null,
    type: e.event_type, points: e.points, shot_value: e.shot_value, shot_result: e.shot_result, zone: e.shot_zone,
    secondary_player: e.secondary_player_id ? playerNames.get(e.secondary_player_id) : null,
  }));

  const payload = { game: { home_team_id: game.home_team_id, away_team_id: game.away_team_id, home_score: game.home_score, away_score: game.away_score, status: game.status }, question, official_stats: compactStats, play_by_play: compactEvents, basketball_intelligence: analytics };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI analysis is not configured yet. Add OPENAI_API_KEY to the Vercel environment.' }, { status: 503 });

  const model = process.env.OPENAI_GAME_IQ_MODEL || 'gpt-5.6-luna';
  const prompt = [
    'You are RCL Game IQ, a basketball analytics assistant for coaches.',
    'Answer the coach question using only the official structured data supplied below.',
    'Never invent a stat, player action, lineup, injury, effort level, motivation, intent, or coaching decision.',
    'Start with a direct answer. Then give 2-4 short evidence bullets using recorded numbers or events. If the data cannot answer the question, say exactly what is missing.',
    'Separate recorded facts from interpretation. Coaching implications must be framed as questions or things to investigate, not certainties.',
    'Do not infer health or injuries from performance data.',
    JSON.stringify(payload),
  ].join('\n\n');

  const aiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: prompt }),
  });
  if (!aiResponse.ok) {
    const providerError = await aiResponse.text();
    console.error('Game IQ ask OpenAI error', providerError);
    let detail = 'The AI provider rejected the request.';
    try {
      const parsed = JSON.parse(providerError);
      detail = parsed?.error?.message || detail;
    } catch { /* provider returned non-JSON text */ }
    return NextResponse.json({ error: 'Game IQ could not answer that question.', detail, code: 'GAME_IQ_PROVIDER_ERROR' }, { status: 502 });
  }

  const answer = extractResponseText(await aiResponse.json());
  if (!answer) return NextResponse.json({ error: 'Game IQ returned no answer.' }, { status: 502 });

  await supabase.from('game_ai_insights').insert({
    game_id: gameId, insight_type: 'coach_question', title: 'Game IQ Coach Question',
    body: answer, data: payload, confidence: 0.9, created_by: user.id,
  } as never);

  return NextResponse.json({ answer });
}
