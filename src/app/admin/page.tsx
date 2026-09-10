'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  FaUserShield, 
  FaChartLine, 
  FaUsers, 
  FaBasketball, 
  FaComment, 
  FaNewspaper, 
  FaGear,
  FaPlus,
  FaTrash,
  FaCheck,
  FaCircleExclamation,
  FaClock
} from 'react-icons/fa6';

export default function AdminDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'roster' | 'games' | 'social' | 'cms'>('analytics');
  
  // Data States
  const [analytics, setAnalytics] = useState<any>({
    players: 0,
    teams: 0,
    coaches: 0,
    games: 0,
    posts: 0,
  });
  const [usersList, setUsersRoster] = useState<any[]>([]);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [coachesList, setCoachesList] = useState<any[]>([]);
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [postsList, setPostsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Box Score Entry Form State
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<'scheduled' | 'live' | 'completed'>('completed');
  const [playerStatsForm, setPlayerStatsForm] = useState<any[]>([]);
  const [scoreSubmitting, setScoreSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Roster Creators
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSlug, setNewTeamSlug] = useState('');
  const [newPlayerProfileId, setNewPlayerProfileId] = useState('');
  const [newPlayerTeamId, setNewPlayerTeamId] = useState('');
  const [newPlayerJersey, setNewPlayerJersey] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState('G');

  // Security and role validation
  const isAuthorizedAdmin = useMemo(() => {
    if (authLoading) return null;
    if (!user) return false;
    // Direct check for admin email or verified roles
    return user.email === 'info@rich-city-league.com' || (profile?.role as any) === 'admin' || (profile?.role as any) === 'super_admin';
  }, [user, profile, authLoading]);

  // Fetch Dashboard Database Data
  const loadDashboardData = async () => {
    if (!supabase || !isAuthorizedAdmin) return;
    setDataLoading(true);
    try {
      // 1. Fetch Analytics Counts
      const [
        { count: playersCount },
        { count: teamsCount },
        { count: coachesCount },
        { count: gamesCount },
        { count: postsCount },
      ] = await Promise.all([
        supabase.from('players').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('team_coaches').select('*', { count: 'exact', head: true }),
        supabase.from('games').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
      ]);

      setAnalytics({
        players: playersCount ?? 0,
        teams: teamsCount ?? 0,
        coaches: coachesCount ?? 0,
        games: gamesCount ?? 0,
        posts: postsCount ?? 0,
      });

      // 2. Fetch rosters
      const [
        { data: users },
        { data: teams },
        { data: players },
        { data: coaches },
        { data: games },
        { data: posts },
        { data: logs },
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('players').select('*, profile:profiles(*)'),
        supabase.from('team_coaches').select('*, profile:profiles(*)'),
        supabase.from('games').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').order('scheduled_at', { ascending: false }),
        supabase.from('posts').select('*, author:profiles(*)').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*, admin:profiles(*)').order('created_at', { ascending: false }).limit(20),
      ]);

      if (users) setUsersRoster(users);
      if (teams) setTeamsList(teams);
      if (players) setPlayersList(players);
      if (coaches) setCoachesList(coaches);
      if (games) setGamesList(games);
      if (posts) setPostsList(posts);
      if (logs) setAuditLogs(logs);

    } catch (err) {
      console.error('Error loading admin control data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorizedAdmin === true) {
      loadDashboardData();
    }
  }, [isAuthorizedAdmin, supabase]);

  // Insert Audit Log helper
  const postAuditLog = async (action: string, details: string) => {
    if (!supabase || !user) return;
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      details,
    } as never);
  };

  // Manage Role Updates
  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    if (!supabase) return;
    const { error } = await (supabase.from('profiles') as any)
      .update({ role: newRole as any })
      .eq('id', targetUserId);

    if (!error) {
      await postAuditLog('UPDATE_USER_ROLE', `Updated user ID ${targetUserId} to role ${newRole}`);
      loadDashboardData();
    }
  };

  // Manage Team Insertion
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newTeamName.trim() || !newTeamSlug.trim()) return;

    const { error } = await supabase.from('teams').insert({
      name: newTeamName.trim(),
      slug: newTeamSlug.trim(),
    } as never);

    if (!error) {
      await postAuditLog('CREATE_TEAM', `Created team ${newTeamName}`);
      setNewTeamName('');
      setNewTeamSlug('');
      loadDashboardData();
    }
  };

  // Manage Player Creation
  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newPlayerProfileId) return;

    const { error } = await supabase.from('players').insert({
      profile_id: newPlayerProfileId,
      team_id: newPlayerTeamId || null,
      jersey_number: newPlayerJersey || null,
      position: newPlayerPosition,
    } as never);

    if (!error) {
      await postAuditLog('CREATE_PLAYER', `Assigned user ID ${newPlayerProfileId} as official player`);
      setNewPlayerProfileId('');
      setNewPlayerJersey('');
      loadDashboardData();
    }
  };

  // Game Score Box Score Load Trigger
  const handleSelectGame = async (gameId: string) => {
    setSelectedGameId(gameId);
    setValidationError(null);
    const game = gamesList.find((g) => g.id === gameId);
    if (!game) return;

    setHomeScore(game.home_score ?? 0);
    setAwayScore(game.away_score ?? 0);
    setGameStatus(game.status);

    // Prepare default empty box scores for active team members
    if (!supabase) return;
    const { data: teamSeasons } = await supabase
      .from('team_seasons')
      .select('id, team_id')
      .in('team_id', [game.home_team_id, game.away_team_id]);
    const teamSeasonIds = (teamSeasons ?? []).map((teamSeason) => teamSeason.id);
    const { data: rosterRows } = teamSeasonIds.length
      ? await supabase.from('rosters').select('player_id, team_season_id').in('team_season_id', teamSeasonIds)
      : { data: [] };
    const playerIds = (rosterRows ?? []).map((roster) => roster.player_id);
    const { data: teamPlayers } = playerIds.length
      ? await supabase.from('players').select('*, profile:profiles(*)').in('id', playerIds)
      : { data: [] };
    const teamByPlayerId = new Map(
      (rosterRows ?? []).map((roster) => [
        roster.player_id,
        teamSeasons?.find((teamSeason) => teamSeason.id === roster.team_season_id)?.team_id,
      ]),
    );

    const initialStats = (teamPlayers || []).map((p: any) => ({
      player_id: p.id,
      player_name: `${p.profile?.first_name || 'RCL'} ${p.profile?.last_name || 'Athlete'}`,
      team_id: teamByPlayerId.get(p.id),
      min: 24,
      pts: 0,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      ftm: 0,
      fta: 0,
      orb: 0,
      drb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      tov: 0,
      pf: 0,
    }));

    setPlayerStatsForm(initialStats);
  };

  // Box score stat box change handler
  const handleStatFieldChange = (idx: number, field: string, value: number) => {
    setPlayerStatsForm((curr) => {
      const copy = [...curr];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // Save Game Score and recalculate totals
  const handleSaveGameScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedGameId || scoreSubmitting) return;

    // VALIDATION CHECKS (Section 41 requirements)
    setValidationError(null);
    for (const stat of playerStatsForm) {
      if (stat.fgm > stat.fga) {
        setValidationError(`Invalid stats for ${stat.player_name}: FGM cannot exceed FGA.`);
        return;
      }
      if (stat.tpm > stat.tpa) {
        setValidationError(`Invalid stats for ${stat.player_name}: 3PM cannot exceed 3PA.`);
        return;
      }
      if (stat.ftm > stat.fta) {
        setValidationError(`Invalid stats for ${stat.player_name}: FTM cannot exceed FTA.`);
        return;
      }
      if (
        stat.min < 0 || stat.pts < 0 || stat.fga < 0 || stat.fgm < 0 ||
        stat.tpa < 0 || stat.tpm < 0 || stat.fta < 0 || stat.ftm < 0 ||
        stat.orb < 0 || stat.drb < 0 || stat.ast < 0 || stat.stl < 0 ||
        stat.blk < 0 || stat.tov < 0 || stat.pf < 0
      ) {
        setValidationError(`Negative impossible values are not allowed.`);
        return;
      }
    }

    setScoreSubmitting(true);
    try {
      // 1. Update Game Table status and scores
      const { error: gameErr } = await (supabase.from('games') as any)
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: gameStatus as any,
        })
        .eq('id', selectedGameId);

      if (gameErr) throw gameErr;

      // 2. Clear pre-existing player game logs for this game to prevent duplicate calculations
      await supabase.from('player_game_stats').delete().eq('game_id', selectedGameId);

      // 3. Save official box score entries
      const statPayloads = playerStatsForm.map((stat) => ({
        game_id: selectedGameId,
        player_id: stat.player_id,
        team_id: stat.team_id,
        minutes: stat.min,
        points: stat.pts,
        field_goals_made: stat.fgm,
        field_goals_attempted: stat.fga,
        three_pointers_made: stat.tpm,
        three_pointers_attempted: stat.tpa,
        free_throws_made: stat.ftm,
        free_throws_attempted: stat.fta,
        rebounds: stat.orb + stat.drb,
        assists: stat.ast,
        steals: stat.stl,
        blocks: stat.blk,
        turnovers: stat.tov,
        fouls: stat.pf,
      }));

      const { error: statsErr } = await supabase.from('player_game_stats').insert(statPayloads as never);
      if (statsErr) throw statsErr;

      // Log audit action
      await postAuditLog('SAVE_GAME_SCORES', `Saved game score for match ID ${selectedGameId} and verified box stats.`);
      
      alert('Game scores and player box statistics successfully saved and verified!');
      loadDashboardData();
      setSelectedGameId('');
    } catch (err) {
      console.error(err);
      setValidationError('Failed to save official game statistics.');
    } finally {
      setScoreSubmitting(false);
    }
  };

  // Moderate Delete Post
  const handleModerateDeletePost = async (postId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) {
      await postAuditLog('MODERATE_DELETE_POST', `Deleted inappropriate social post ID ${postId}`);
      loadDashboardData();
    }
  };

  // Rendering Guard / Shield
  if (authLoading) {
    return (
      <Container maxWidth="xl" className="py-24 text-center text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-rcl-gold border-white/20 mx-auto" />
        <p className="mt-4 text-sm text-gray-400">Verifying administrator authorization level...</p>
      </Container>
    );
  }

  if (isAuthorizedAdmin === false) {
    return (
      <main className="min-h-screen bg-rcl-black bg-[radial-gradient(ellipse_at_top,rgba(230,57,70,0.25),transparent_70%)] py-24 text-white flex items-center justify-center">
        <div className="rounded-3xl border border-rcl-red/30 bg-black/60 p-12 text-center max-w-md shadow-2xl backdrop-blur-md">
          <FaUserShield className="h-16 w-16 text-rcl-red mx-auto animate-bounce" />
          <h2 className="mt-6 font-display text-2xl font-black uppercase tracking-tight text-white">RESTRICTED SHIELD</h2>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">
            Unauthorized access detected. This console is restricted exclusively to Rich City League system administrators.
          </p>
          <Link href="/" className="mt-8 inline-block rounded-xl bg-white px-6 py-2.5 text-xs font-black text-black uppercase tracking-widest hover:bg-rcl-gold">
            RETURN TO COURT
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-rcl-black bg-[radial-gradient(ellipse_at_top,rgba(29,53,87,0.3),transparent_70%)] pb-24 text-white font-display">
      <section className="border-b border-white/10 py-12">
        <Container maxWidth="xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="rounded-full bg-rcl-gold/10 border border-rcl-gold/20 px-3 py-0.5 text-[10px] font-black tracking-widest text-rcl-gold uppercase flex items-center gap-1.5 w-fit">
                <FaUserShield /> SYSTEM CONTROL CENTER
              </span>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
                RCL <span className="text-rcl-gold">ADMIN DASHBOARD</span>
              </h1>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={loadDashboardData} 
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-widest hover:text-rcl-gold"
              >
                REFRESH DATA
              </button>
            </div>
          </div>
        </Container>
      </section>

      {/* Tabs */}
      <Container maxWidth="xl" className="mt-8">
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {[
            { id: 'analytics', label: 'ANALYTICS & AUDIT LOGS', icon: <FaChartLine /> },
            { id: 'users', label: 'USER ROLES', icon: <FaUsers /> },
            { id: 'roster', label: 'ROSTERS', icon: <FaBasketball /> },
            { id: 'games', label: 'GAME STATS ENTRY', icon: <FaCheck /> },
            { id: 'social', label: 'SOCIAL MODERATION', icon: <FaComment /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === tab.id 
                  ? 'bg-rcl-gold text-black' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="mt-8">
          {dataLoading ? (
            <div className="h-48 animate-pulse rounded-2xl bg-white/5 border border-white/10" />
          ) : (
            <>
              {/* Tab 1: Analytics & Audit Logs */}
              {activeTab === 'analytics' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    {[
                      { label: 'TOTAL PLAYERS', value: analytics.players },
                      { label: 'TOTAL TEAMS', value: analytics.teams },
                      { label: 'TOTAL COACHES', value: analytics.coaches },
                      { label: 'GAMES PLAYED', value: analytics.games },
                      { label: 'TIMELINE POSTS', value: analytics.posts },
                    ].map((stat, i) => (
                      <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.01] p-5 shadow-lg text-center">
                        <span className="block text-[10px] font-black tracking-widest text-gray-500 uppercase">{stat.label}</span>
                        <span className="block font-display text-3xl font-extrabold text-white mt-1">{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Audit logs */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 shadow-xl">
                    <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase flex items-center gap-2">
                      <FaClock /> ACTIVE ADMINISTRATIVE AUDIT LOG
                    </h3>
                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[500px]">
                        <thead>
                          <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500">
                            <th className="pb-3">ADMIN EMAIL</th>
                            <th className="pb-3">ACTION</th>
                            <th className="pb-3">DETAILS</th>
                            <th className="pb-3 text-right">DATE / TIME</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-gray-500">No actions recorded in system log yet.</td>
                            </tr>
                          ) : (
                            auditLogs.map((log) => (
                              <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.01] transition last:border-0">
                                <td className="py-3 font-semibold text-gray-300">{log.admin?.email || 'System Admin'}</td>
                                <td className="py-3">
                                  <span className="rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[9px] font-black text-blue-400">
                                    {log.action}
                                  </span>
                                </td>
                                <td className="py-3 text-gray-400 font-mono text-[11px]">{log.details}</td>
                                <td className="py-3 text-right text-gray-500 font-mono text-[10px]">
                                  {new Date(log.created_at).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Users Roles */}
              {activeTab === 'users' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 shadow-xl">
                  <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase mb-6">
                    MANAGE USER ROLES & ROSTER ROLES
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500">
                          <th className="pb-3">USER NAME</th>
                          <th className="pb-3">EMAIL</th>
                          <th className="pb-3">CURRENT ROLE</th>
                          <th className="pb-3 text-right">ASSIGN ROLE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map((usr) => (
                          <tr key={usr.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.01]">
                            <td className="py-4 font-bold text-white">
                              {usr.first_name ? `${usr.first_name} ${usr.last_name || ''}` : usr.display_name || 'RCL User'}
                            </td>
                            <td className="py-4 text-gray-400 font-mono">{usr.email}</td>
                            <td className="py-4">
                              <span className="rounded bg-rcl-gold/10 border border-rcl-gold/20 px-2 py-0.5 text-[10px] font-black text-rcl-gold uppercase">
                                {usr.role || 'user'}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <select
                                value={usr.role || 'user'}
                                onChange={(e) => handleUpdateRole(usr.id, e.target.value)}
                                className="rounded-lg border border-white/10 bg-black p-1.5 text-xs text-white focus:border-rcl-gold outline-none"
                              >
                                <option value="user">USER</option>
                                <option value="player">PLAYER</option>
                                <option value="coach">COACH</option>
                                <option value="staff">STAFF</option>
                                <option value="admin">ADMIN</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Rosters */}
              {activeTab === 'roster' && (
                <div className="grid gap-8 lg:grid-cols-2">
                  {/* Create Team */}
                  <form onSubmit={handleCreateTeam} className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 shadow-xl space-y-4">
                    <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase">
                      CREATE NEW LEAGUE TEAM
                    </h3>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 mb-1">TEAM NAME</label>
                      <input
                        type="text"
                        required
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g. Richmond Generals"
                        className="w-full rounded-xl border border-white/10 bg-black p-3 text-sm text-white focus:border-rcl-gold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 mb-1">TEAM SLUG</label>
                      <input
                        type="text"
                        required
                        value={newTeamSlug}
                        onChange={(e) => setNewTeamSlug(e.target.value)}
                        placeholder="e.g. richmond-generals"
                        className="w-full rounded-xl border border-white/10 bg-black p-3 text-sm text-white focus:border-rcl-gold outline-none"
                      />
                    </div>
                    <button type="submit" className="w-full rounded-xl bg-rcl-gold py-2.5 font-bold text-black text-xs uppercase tracking-wider">
                      CREATE TEAM
                    </button>
                  </form>

                  {/* Create Player Profile mapping */}
                  <form onSubmit={handleCreatePlayer} className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 shadow-xl space-y-4">
                    <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase">
                      REGISTER PLAYER TO TEAM
                    </h3>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 mb-1">SELECT USER PROFILE</label>
                      <select
                        required
                        value={newPlayerProfileId}
                        onChange={(e) => setNewPlayerProfileId(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black p-3 text-sm text-white focus:border-rcl-gold outline-none"
                      >
                        <option value="">-- Choose User Profile --</option>
                        {usersList.map((usr) => (
                          <option key={usr.id} value={usr.id}>
                            {usr.first_name ? `${usr.first_name} ${usr.last_name || ''}` : usr.display_name} ({usr.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 mb-1">ASSIGN TEAM</label>
                      <select
                        value={newPlayerTeamId}
                        onChange={(e) => setNewPlayerTeamId(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black p-3 text-sm text-white focus:border-rcl-gold outline-none"
                      >
                        <option value="">-- Free Agent / Unassigned --</option>
                        {teamsList.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 mb-1">JERSEY #</label>
                        <input
                          type="text"
                          value={newPlayerJersey}
                          onChange={(e) => setNewPlayerJersey(e.target.value)}
                          placeholder="e.g. 23"
                          className="w-full rounded-xl border border-white/10 bg-black p-3 text-sm text-white focus:border-rcl-gold outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 mb-1">POSITION</label>
                        <select
                          value={newPlayerPosition}
                          onChange={(e) => setNewPlayerPosition(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-black p-3 text-sm text-white focus:border-rcl-gold outline-none"
                        >
                          <option value="G">G</option>
                          <option value="F">F</option>
                          <option value="C">C</option>
                          <option value="G-F">G-F</option>
                          <option value="F-C">F-C</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="w-full rounded-xl bg-rcl-gold py-2.5 font-bold text-black text-xs uppercase tracking-wider">
                      OFFICIALLY REGISTER PLAYER
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 4: Game score entry */}
              {activeTab === 'games' && (
                <div className="space-y-8">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 shadow-xl">
                    <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase mb-4">
                      SELECT GAME TO LOG SCORE & STATS
                    </h3>
                    <select
                      value={selectedGameId}
                      onChange={(e) => handleSelectGame(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black p-3.5 text-sm text-white focus:border-rcl-gold outline-none"
                    >
                      <option value="">-- Choose Matchup --</option>
                      {gamesList.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.away_team?.name} @ {g.home_team?.name} ({new Date(g.scheduled_at).toLocaleDateString()}) - {g.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedGameId && (
                    <form onSubmit={handleSaveGameScore} className="space-y-8">
                      {/* Scoreboard Entry */}
                      <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 shadow-xl">
                        <h4 className="font-display text-xs font-black tracking-widest text-gray-500 uppercase mb-4">
                          OFFICIAL SCOREBOARD
                        </h4>

                        <div className="grid gap-6 sm:grid-cols-3 items-center">
                          <div className="text-center">
                            <span className="block text-sm font-bold text-gray-300">AWAY TEAM SCORE</span>
                            <input
                              type="number"
                              required
                              min={0}
                              value={awayScore}
                              onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                              className="mt-2 w-28 text-center rounded-xl border border-white/10 bg-black p-3 font-display text-2xl font-black text-white focus:border-rcl-gold outline-none"
                            />
                          </div>

                          <div className="text-center">
                            <span className="block text-[10px] font-black text-gray-500 uppercase">MATCHUP STATUS</span>
                            <select
                              value={gameStatus}
                              onChange={(e) => setGameStatus(e.target.value as any)}
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black p-3.5 text-xs text-white font-bold focus:border-rcl-gold outline-none"
                            >
                              <option value="scheduled">SCHEDULED</option>
                              <option value="live">LIVE CENTER</option>
                              <option value="completed">COMPLETED</option>
                            </select>
                          </div>

                          <div className="text-center">
                            <span className="block text-sm font-bold text-gray-300">HOME TEAM SCORE</span>
                            <input
                              type="number"
                              required
                              min={0}
                              value={homeScore}
                              onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                              className="mt-2 w-28 text-center rounded-xl border border-white/10 bg-black p-3 font-display text-2xl font-black text-white focus:border-rcl-gold outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Box Score Stats table */}
                      <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 shadow-xl">
                        <h4 className="font-display text-xs font-black tracking-widest text-gray-500 uppercase mb-4">
                          INDIVIDUAL PLAYER BOX SCORE ENTRIES
                        </h4>

                        {validationError && (
                          <div className="mb-4 rounded-xl border border-rcl-red/30 bg-rcl-red/10 p-4 text-xs font-black text-rcl-red flex items-center gap-2">
                            <FaCircleExclamation /> {validationError}
                          </div>
                        )}

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs min-w-[900px]">
                            <thead>
                              <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500">
                                <th className="pb-3">PLAYER</th>
                                <th className="pb-3 text-center">MIN</th>
                                <th className="pb-3 text-center">PTS</th>
                                <th className="pb-3 text-center">FGM</th>
                                <th className="pb-3 text-center">FGA</th>
                                <th className="pb-3 text-center">3PM</th>
                                <th className="pb-3 text-center">3PA</th>
                                <th className="pb-3 text-center">FTM</th>
                                <th className="pb-3 text-center">FTA</th>
                                <th className="pb-3 text-center">ORB</th>
                                <th className="pb-3 text-center">DRB</th>
                                <th className="pb-3 text-center">AST</th>
                                <th className="pb-3 text-center">STL</th>
                                <th className="pb-3 text-center">BLK</th>
                                <th className="pb-3 text-center">TOV</th>
                                <th className="pb-3 text-center">PF</th>
                              </tr>
                            </thead>
                            <tbody>
                              {playerStatsForm.map((stat, idx) => (
                                <tr key={stat.player_id} className="border-b border-white/5 hover:bg-white/[0.01]">
                                  <td className="py-2 font-bold text-white">{stat.player_name}</td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.min} onChange={(e) => handleStatFieldChange(idx, 'min', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.pts} onChange={(e) => handleStatFieldChange(idx, 'pts', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1 font-bold text-rcl-gold" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.fgm} onChange={(e) => handleStatFieldChange(idx, 'fgm', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.fga} onChange={(e) => handleStatFieldChange(idx, 'fga', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.tpm} onChange={(e) => handleStatFieldChange(idx, 'tpm', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.tpa} onChange={(e) => handleStatFieldChange(idx, 'tpa', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.ftm} onChange={(e) => handleStatFieldChange(idx, 'ftm', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.fta} onChange={(e) => handleStatFieldChange(idx, 'fta', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.orb} onChange={(e) => handleStatFieldChange(idx, 'orb', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.drb} onChange={(e) => handleStatFieldChange(idx, 'drb', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.ast} onChange={(e) => handleStatFieldChange(idx, 'ast', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.stl} onChange={(e) => handleStatFieldChange(idx, 'stl', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.blk} onChange={(e) => handleStatFieldChange(idx, 'blk', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.tov} onChange={(e) => handleStatFieldChange(idx, 'tov', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input type="number" min={0} value={stat.pf} onChange={(e) => handleStatFieldChange(idx, 'pf', parseInt(e.target.value) || 0)} className="w-12 text-center bg-black border border-white/10 rounded p-1" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={scoreSubmitting}
                        className="w-full rounded-2xl bg-rcl-gold py-4 font-black text-black tracking-widest uppercase hover:bg-white disabled:opacity-50"
                      >
                        {scoreSubmitting ? 'SAVING OFFICIAL STATS...' : 'SAVE & CALCULATE TO LEAGUE'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Tab 5: Social Moderation */}
              {activeTab === 'social' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 shadow-xl">
                  <h3 className="font-display text-sm font-black tracking-widest text-rcl-gold uppercase mb-6">
                    TIMELINE MODERATION QUEUE
                  </h3>
                  <div className="space-y-4">
                    {postsList.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center">No active community timeline posts registered.</p>
                    ) : (
                      postsList.map((post) => {
                        const author = post.author;
                        return (
                          <div key={post.id} className="flex justify-between items-center rounded-xl border border-white/5 bg-black/40 p-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-white">
                                  {author?.first_name ? `${author.first_name} ${author.last_name || ''}` : author?.display_name || 'RCL Athlete'}
                                </span>
                                <span className="text-[10px] text-gray-500">({new Date(post.created_at).toLocaleDateString()})</span>
                              </div>
                              <p className="mt-2 text-xs text-gray-300 font-sans">{post.body}</p>
                            </div>
                            <button
                              onClick={() => handleModerateDeletePost(post.id)}
                              className="rounded bg-rcl-red/10 border border-rcl-red/20 hover:bg-rcl-red hover:text-white px-3 py-1.5 text-[10px] font-black text-rcl-red flex items-center gap-1 uppercase tracking-widest transition"
                            >
                              <FaTrash /> DELETE POST
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
