/**
 * Demonstration-only rows for the Runs leaderboard. These are never inserted
 * into profiles, box scores, REP, or the verified leaderboard RPC.
 */
export type RunLeaderboardEntry = {
  profile_id: string;
  player_name: string;
  avatar_url: string | null;
  city: string;
  games: number;
  ppg: number | string;
  apg: number | string;
  rpg: number | string;
  wins: number;
  rep: number;
  player_level: number;
};

export type DisplayRunLeaderboardEntry = RunLeaderboardEntry & { isDemo: boolean };
export type RunLeaderboardScope = 'city' | 'state';

const MIN_PREVIEW_ROWS = 10;

const SAMPLE_PLAYERS: RunLeaderboardEntry[] = [
  { profile_id: 'sample-run-01', player_name: 'Sample Guard', avatar_url: null, city: 'Richmond', games: 7, ppg: 24.6, apg: 4.7, rpg: 5.1, wins: 6, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-02', player_name: 'Sample Wing', avatar_url: null, city: 'Norfolk', games: 7, ppg: 21.3, apg: 3.4, rpg: 6.6, wins: 5, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-03', player_name: 'Sample Playmaker', avatar_url: null, city: 'Virginia Beach', games: 6, ppg: 18.1, apg: 8.2, rpg: 4.3, wins: 5, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-04', player_name: 'Sample Center', avatar_url: null, city: 'Chesapeake', games: 6, ppg: 20.7, apg: 2.1, rpg: 11.4, wins: 4, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-05', player_name: 'Sample Shooter', avatar_url: null, city: 'Alexandria', games: 5, ppg: 16.9, apg: 4.5, rpg: 3.5, wins: 4, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-06', player_name: 'Sample Slasher', avatar_url: null, city: 'Newport News', games: 5, ppg: 23.1, apg: 3.9, rpg: 5.7, wins: 3, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-07', player_name: 'Sample Defender', avatar_url: null, city: 'Roanoke', games: 5, ppg: 16.4, apg: 3.1, rpg: 8.2, wins: 3, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-08', player_name: 'Sample Forward', avatar_url: null, city: 'Petersburg', games: 4, ppg: 14.9, apg: 4.6, rpg: 7.3, wins: 2, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-09', player_name: 'Sample Sixth', avatar_url: null, city: 'Fredericksburg', games: 4, ppg: 13.7, apg: 5.2, rpg: 4.4, wins: 2, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-10', player_name: 'Sample Rookie', avatar_url: null, city: 'Charlottesville', games: 3, ppg: 11.8, apg: 2.4, rpg: 3.8, wins: 1, rep: 0, player_level: 1 },
];

/**
 * The server's verified ranking order is authoritative. Real players always
 * occupy the highest ranks; examples fill the unused top-ten slots and disappear
 * completely after ten verified players are ranked.
 */
export function buildRunLeaderboardDisplay(
  verifiedPlayers: readonly RunLeaderboardEntry[],
  scope: RunLeaderboardScope,
  city: string,
): DisplayRunLeaderboardEntry[] {
  const realRows = verifiedPlayers.map((player) => ({ ...player, isDemo: false }));
  const localCity = city.trim() || 'Richmond';
  const demoRows = SAMPLE_PLAYERS.slice(0, Math.max(0, MIN_PREVIEW_ROWS - realRows.length)).map((player) => ({
    ...player,
    city: scope === 'city' ? localCity : player.city,
    isDemo: true,
  }));
  return [...realRows, ...demoRows];
}
