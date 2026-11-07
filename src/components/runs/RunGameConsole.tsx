'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRotateLeft, FaBasketball, FaBolt, FaCheck, FaCirclePlay, FaShieldHalved, FaTrophy } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Team = { id: string; name: string; sort_order: number };
type Member = { run_team_id: string; profile_id: string };
type Person = { id: string; display_name: string | null; username: string | null };
type Game = {
  id: string; home_run_team_id: string; away_run_team_id: string; home_score: number; away_score: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'; played_at: string | null;
  target_score: number; scoring_profile: 'one_two_three' | 'two_three'; started_at: string | null;
};
type Action = {
  id: string; sequence_no: number; action_type: 'score' | 'stat' | 'undo'; team_id: string | null;
  player_id: string | null; score_value: number | null; stat_type: string | null;
  undoes_action_id: string | null; created_at: string;
};

const statActions = [
  ['rebound', 'REB'], ['assist', 'AST'], ['steal', 'STL'], ['block', 'BLK'],
  ['turnover', 'TO'], ['defensive_stop', 'STOP'], ['three_attempted', '3PT MISS'],
] as const;
const statLong: Record<string,string> = {
  rebound: 'Rebound', assist: 'Assist', steal: 'Steal', block: 'Block', turnover: 'Turnover',
  defensive_stop: 'Defensive stop', three_attempted: 'Missed three',
};

export function RunGameConsole({ runId, canOperate: canManage, format, teams, members, profiles }: {
  runId: string; canOperate: boolean; format:string; teams: Team[]; members: Member[]; profiles: Person[];
}) {
  const {user} = useAuth();
  const db = useMemo(() => getSupabaseClient(true) as any, []);
  const [games,setGames]=useState<Game[]>([]);
  const [actions,setActions]=useState<Action[]>([]);
  const [selectedGame,setSelectedGame]=useState('');
  const [home,setHome]=useState('');
  const [away,setAway]=useState('');
  const [target,setTarget]=useState(11);
  const [scoringProfile,setScoringProfile]=useState<'one_two_three'|'two_three'>('one_two_three');
  const [activeTeam,setActiveTeam]=useState('');
  const [activePlayer,setActivePlayer]=useState('');
  const [loading,setLoading]=useState(true);
  const [actionsUnavailable,setActionsUnavailable]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [operatorCanScore,setOperatorCanScore]=useState(false);
  const canOperate=canManage||operatorCanScore;

  const load=useCallback(async()=>{
    if(!db){setLoading(false);return;}
    const {data,error:failure}=await db.from('run_games')
      .select('id,home_run_team_id,away_run_team_id,home_score,away_score,status,played_at,target_score,scoring_profile,started_at')
      .eq('run_id',runId).order('created_at',{ascending:false}).limit(20);
    if(failure){setError('Game mode is temporarily unavailable. Refresh this Run or try again shortly.');setLoading(false);return;}
    const list=(data||[]) as Game[];
    setGames(list);
    const available=list.filter(g=>g.status!=='cancelled');
    const game=available.find(g=>g.status==='live')||available.find(g=>g.id===selectedGame)||available[0];
    if(game){setSelectedGame(game.id);const result=await db.from('run_game_actions')
      .select('id,sequence_no,action_type,team_id,player_id,score_value,stat_type,undoes_action_id,created_at')
      .eq('game_id',game.id).order('sequence_no',{ascending:true}).limit(500);
      if(result.error)setActionsUnavailable(true);else{setActionsUnavailable(false);setActions((result.data||[]) as Action[]);}
    } else {setActions([]);setActionsUnavailable(false);}
    setLoading(false);
  },[db,runId,selectedGame]);

  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    let active=true;
    if(!db||!user?.id){setOperatorCanScore(false);return;}
    void db.from('rch_run_operators').select('role').eq('run_id',runId).eq('profile_id',user.id).maybeSingle()
      .then(({data,error:failure}:any)=>{if(active)setOperatorCanScore(!failure&&['scorekeeper','cohost'].includes(data?.role||''));})
      .catch(()=>{if(active)setOperatorCanScore(false);});
    return()=>{active=false;};
  },[db,runId,user?.id]);
  useEffect(()=>{
    if(!db)return;
    const channel=db.channel('rch-live-game-'+runId)
      .on('postgres_changes',{event:'*',schema:'public',table:'run_games',filter:'run_id=eq.'+runId},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'run_game_actions',filter:'run_id=eq.'+runId},()=>void load())
      .subscribe();
    return()=>{void db.removeChannel(channel);};
  },[db,runId,load]);

  const live=games.find(g=>g.status==='live')||null;
  const liveId=live?.id||'';
  const liveHomeTeamId=live?.home_run_team_id||'';
  const liveAwayTeamId=live?.away_run_team_id||'';
  const game=live||games.find(g=>g.status!=='cancelled'&&g.id===selectedGame)||games.find(g=>g.status!=='cancelled')||null;
  const undone=new Set(actions.filter(a=>a.action_type==='undo'&&a.undoes_action_id).map(a=>a.undoes_action_id!));
  const playable=actions.filter(a=>a.action_type!=='undo'&&!undone.has(a.id));
  const lastAction=playable.at(-1)||null;
  const activePlayers=useMemo(()=>members.filter(m=>m.run_team_id===activeTeam).map(m=>m.profile_id),[members,activeTeam]);
  const name=(id:string)=>profiles.find(p=>p.id===id)?.display_name||profiles.find(p=>p.id===id)?.username||'RCH Player';
  const teamName=(id:string)=>teams.find(t=>t.id===id)?.name||'Team';
  const roster=(teamId:string)=>members.filter(m=>m.run_team_id===teamId).map(m=>m.profile_id);
  useEffect(()=>{
    if(!liveId)return;
    if(activeTeam!==liveHomeTeamId&&activeTeam!==liveAwayTeamId){setActiveTeam(liveHomeTeamId);setActivePlayer(members.find(m=>m.run_team_id===liveHomeTeamId)?.profile_id||'');}
  },[liveId,liveHomeTeamId,liveAwayTeamId,activeTeam,members]);
  useEffect(()=>{
    if(activeTeam&&!activePlayers.includes(activePlayer))setActivePlayer(activePlayers[0]||'');
  },[activeTeam,activePlayer,activePlayers]);
  const statsFor=(teamId:string,playerId:string)=>{
    const playerActions=playable.filter(a=>a.player_id===playerId&&a.team_id===teamId);
    const result={pts:0,reb:0,ast:0,stl:0,blk:0,to:0,stops:0,threeMade:0,threeAttempts:0};
    for(const action of playerActions){
      if(action.action_type==='score'&&action.score_value){result.pts+=action.score_value;if(action.score_value===3){result.threeMade++;result.threeAttempts++;}}
      if(action.action_type==='stat'){
        if(action.stat_type==='rebound')result.reb++;if(action.stat_type==='assist')result.ast++;
        if(action.stat_type==='steal')result.stl++;if(action.stat_type==='block')result.blk++;
        if(action.stat_type==='turnover')result.to++;if(action.stat_type==='defensive_stop')result.stops++;
        if(action.stat_type==='three_attempted')result.threeAttempts++;
      }
    }
    return result;
  };

  async function startGame(){
    if(!db){setError('Game mode is unavailable right now.');return;}
    if(!home||!away||home===away){setError('Choose two different teams.');return;}
    setBusy(true);setError('');setNotice('');
    const {data,error:failure}=await db.rpc('rch_start_run_game',{p_run:runId,p_home_team:home,p_away_team:away,p_target_score:target,p_scoring_profile:scoringProfile});
    if(failure)setError(failure.message);else{setSelectedGame(data);setActiveTeam(home);setActivePlayer(roster(home)[0]||'');setNotice('Game is live. Score updates are shared with everyone in the Run.');await load();}
    setBusy(false);
  }
  async function recordScore(teamId:string,points:number){
    if(!game||!activePlayer||!activePlayers.includes(activePlayer)){setError('Select a rostered player for this team before recording the basket.');return;}
    await action({p_game:game.id,p_action:'score',p_team:teamId,p_player:activePlayer,p_score:points});
  }
  async function action(args:Record<string,unknown>){
    if(!db){setError('Game mode is unavailable right now.');return;}
    setBusy(true);setError('');setNotice('');
    const {error:failure}=await db.rpc('rch_record_run_game_action',args);
    if(failure)setError(failure.message);else await load();
    setBusy(false);
  }
  async function finish(){
    if(!db){setError('Game mode is unavailable right now.');return;}
    if(!game)return;
    if(!window.confirm(`Finish ${teamName(game.home_run_team_id)} ${game.home_score} – ${game.away_score} ${teamName(game.away_run_team_id)}? The score will move to independent review.`))return;
    setBusy(true);setError('');setNotice('');
    const {error:failure}=await db.rpc('rch_finish_run_game',{p_game:game.id});
    if(failure)setError(failure.message);else{setNotice('Final score saved. Open Official Score Review below to submit it for ranking.');await load();}
    setBusy(false);
  }

  const sides=game?[{id:game.home_run_team_id,score:game.home_score},{id:game.away_run_team_id,score:game.away_score}]:[];
  const eventsByTeam=(teamId:string)=>actions.filter(a=>a.team_id===teamId&&a.action_type!=='undo');
  const recap=game?.status==='completed';

  return <section id="rch-live-game" className="rch-live-game" aria-label="Runs live game mode">
    <div className="rch-live-game-heading">
      <div><p>RCH RUNS · COURTSIDE</p><h2>{live?'LIVE GAME MODE':recap?'FINAL GAME REPORT':'START A GAME'}</h2></div>
      <span className={'rch-live-game-pill '+(live?'is-live':'')}><i aria-hidden="true"/>{live?'LIVE SCORE':'REAL COURT · VERIFIED RESULTS'}</span>
    </div>
    {error&&<p className="rch-live-game-message is-error" role="alert">{error}</p>}
    {notice&&<p className="rch-live-game-message" role="status">{notice}</p>}
    {loading?<p className="rch-live-game-empty" role="status">Opening the scoreboard…</p>:!game&&!canOperate?
      <p className="rch-live-game-empty">The host has not started a game yet. When play begins, the live score and Run report will appear here.</p>:
      !game?<div className="rch-live-game-setup">
        <p>Pick the sides and house rules, then start the live board. The game takes place at the real court.</p>
        {canOperate&&!canManage&&<p className="rch-live-game-message" role="status">You’re assigned as scorekeeper. The host must start the game; the live board will open here automatically.</p>}
        <div className="rch-live-game-setup-grid">
          <label>HOME TEAM<select value={home} onChange={e=>setHome(e.target.value)}><option value="">Select team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name} · {roster(t.id).length} players</option>)}</select></label>
          <label>AWAY TEAM<select value={away} onChange={e=>setAway(e.target.value)}><option value="">Select team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name} · {roster(t.id).length} players</option>)}</select></label>
          <label>TARGET SCORE<select value={target} onChange={e=>setTarget(Number(e.target.value))}>{[11,15,21,25].map(n=><option key={n} value={n}>{n} points</option>)}</select></label>
          <label>SCORING<select value={scoringProfile} onChange={e=>setScoringProfile(e.target.value as typeof scoringProfile)}><option value="one_two_three">1s · 2s · 3s</option><option value="two_three">2s · 3s</option></select></label>
        </div>
        {home&&away&&(!roster(home).length||!roster(away).length)&&<p className="mt-3 text-xs font-semibold text-amber-200">Assign at least one registered player to each team before starting.</p>}
        <button type="button" disabled={busy||!canOperate||!canManage||!home||!away||home===away||!roster(home).length||!roster(away).length} onClick={()=>void startGame()}><FaCirclePlay/> START LIVE GAME</button>
      </div>:
      <>
        <div className="rch-live-scoreboard" aria-label="Live basketball score" aria-live="polite">
          {sides.map((side,index)=><div key={side.id} className={'rch-live-side '+(index===0?'is-home':'is-away')}>
            <span>{index===0?'HOME':'AWAY'}</span><strong>{teamName(side.id)}</strong><b>{side.score}</b>
            <small>{game.status==='live'&&side.score>=game.target_score?'GAME POINT':game.status==='completed'?'FINAL':game.target_score+' POINT TARGET'}</small>
          </div>)}
          <div className="rch-live-score-divider">{game.status==='live'?<FaBolt/>:<FaTrophy/>}</div>
        </div>
        {live&&canOperate&&<div className="rch-live-controls">
          {operatorCanScore&&!canManage&&<p className="rch-live-game-message" role="status">You’re the assigned scorekeeper. Log each play here; the host handles game setup.</p>}
          <div className="rch-live-control-head"><div><span>COURTSIDE CONTROL</span><h3>Log the next play</h3></div><label>TEAM<select value={activeTeam} onChange={e=>{setActiveTeam(e.target.value);setActivePlayer(roster(e.target.value)[0]||'');}}>{sides.map(side=><option key={side.id} value={side.id}>{teamName(side.id)}</option>)}</select></label></div>
          <label className="rch-live-player-select">WHO MADE THE PLAY?<select value={activePlayer} onChange={e=>setActivePlayer(e.target.value)}><option value="">Select rostered player</option>{activePlayers.map(id=><option key={id} value={id}>{name(id)}</option>)}</select></label>
          <div className="rch-live-score-buttons" aria-label="Add points">
            {[1,2,...(game.scoring_profile==='one_two_three'?[3]:[])].map(points=><button type="button" key={points} disabled={busy||!activePlayer} onClick={()=>void recordScore(activeTeam,points)}><b>+{points}</b><span>{points===1?'FREE THROW':points===3?'THREE':'BUCKET'}</span></button>)}
          </div>
          <div className="rch-live-stat-row"><span>ADD PLAYER STAT</span>{statActions.filter(([key])=>!(format==='1v1'&&key==='assist')).map(([key,label])=><button type="button" key={key} disabled={busy||!activePlayer} onClick={()=>void action({p_game:game.id,p_action:'stat',p_team:activeTeam,p_player:activePlayer,p_stat:key})}>{label}</button>)}</div>
          <div className="rch-live-admin-actions">
            <button type="button" disabled={busy||!lastAction} onClick={()=>lastAction&&void action({p_game:game.id,p_action:'undo',p_undo:lastAction.id})}><FaArrowRotateLeft/> UNDO LAST PLAY</button>
            <button type="button" disabled={busy} onClick={()=>void finish()}><FaCheck/> FINALIZE GAME</button>
          </div>
        </div>}
        {recap&&<div className="rch-live-final-status"><FaShieldHalved/> FINAL SCORE · {game.home_score===game.away_score?'This friendly game ended tied. A winner is required for ranked ratings.':'Submit the score for independent confirmation in Official Score Review below.'}</div>}
        <div className="rch-live-report">
          <div className="rch-live-report-head"><div><span>{recap?'PLAYER BOX SCORE':'PLAYER IMPACT'}</span><h3>{recap?'Final game report':'Live player stats'}</h3></div><small>{game.scoring_profile==='one_two_three'?'1s · 2s · 3s':'2s · 3s'} · First to {game.target_score} is game point</small></div>
          {actionsUnavailable?<p className="rch-live-game-empty">Sign in and join this Run to view player stats and the play-by-play.</p>:<div className="rch-live-boxscores">{sides.map(side=><div className="rch-live-boxscore-team" key={side.id}><h4>{teamName(side.id)} <span>{side.score}</span></h4>
            {!roster(side.id).length&&<p>Assign players to this team to capture individual stats.</p>}
            {roster(side.id).map(playerId=>{const line=statsFor(side.id,playerId);const threePct=line.threeAttempts?Math.round(line.threeMade*100/line.threeAttempts):0;return <div className="rch-live-player-line" key={playerId}><strong>{name(playerId)}</strong><span><b>{line.pts}</b> PTS</span><span>{line.reb} REB</span><span>{line.ast} AST</span><span>{line.stl} STL</span><span>{line.blk} BLK</span><span>{line.to} TO</span><small>3PT {line.threeMade}/{line.threeAttempts} · {threePct}% · {line.stops} STOPS</small></div>;})}
          </div>)}</div>}
        </div>
        {!actionsUnavailable&&<details className="rch-live-playlog"><summary><span>PLAY-BY-PLAY</span><b>{playable.length} actions</b></summary>
          <ol>{actions.slice().reverse().map(item=>{const reversed=undone.has(item.id);const text=item.action_type==='undo'?'Undid a previous action':item.action_type==='score'?`${name(item.player_id||'')} +${item.score_value} for ${teamName(item.team_id||'')}`:`${name(item.player_id||'')} · ${statLong[item.stat_type||'']||'Stat'} · ${teamName(item.team_id||'')}`;return <li key={item.id} className={reversed?'is-undone':''}><span>{String(item.sequence_no).padStart(2,'0')}</span><strong>{text}</strong>{reversed&&<small>UNDONE</small>}</li>;})}</ol>
          {!actions.length&&<p>Scoring and stats will appear here as the game is logged.</p>}
        </details>}
        {game.status==='completed'&&<a className="rch-live-review-link" href="#rch-result-review"><FaShieldHalved/> OPEN OFFICIAL SCORE REVIEW</a>}
      </>}
  </section>;
}
