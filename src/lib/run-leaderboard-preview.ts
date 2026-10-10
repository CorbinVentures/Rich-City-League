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
  { profile_id: 'sample-run-01', player_name: 'Jalen Cross', avatar_url: null, city: 'Richmond', games: 7, ppg: 24.6, apg: 4.7, rpg: 5.1, wins: 6, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-02', player_name: 'Malik Rivers', avatar_url: null, city: 'Norfolk', games: 7, ppg: 21.3, apg: 3.4, rpg: 6.6, wins: 5, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-03', player_name: 'Tre Carter', avatar_url: null, city: 'Chesapeake', games: 6, ppg: 18.8, apg: 8.1, rpg: 4.2, wins: 5, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-04', player_name: 'Devon Price', avatar_url: null, city: 'Virginia Beach', games: 7, ppg: 17.5, apg: 5.3, rpg: 6.1, wins: 4, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-05', player_name: 'Zion Hart', avatar_url: null, city: 'Newport News', games: 7, ppg: 16.9, apg: 3.9, rpg: 7.4, wins: 4, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-06', player_name: 'Kobe Ellis', avatar_url: null, city: 'Hampton', games: 6, ppg: 15.2, apg: 4.1, rpg: 5.8, wins: 3, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-07', player_name: 'Elijah Brooks', avatar_url: null, city: 'Roanoke', games: 5, ppg: 14.4, apg: 3.6, rpg: 6.5, wins: 3, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-08', player_name: 'Marcus Reed', avatar_url: null, city: 'Petersburg', games: 4, ppg: 13.9, apg: 4.6, rpg: 7.3, wins: 2, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-09', player_name: 'Andre Coleman', avatar_url: null, city: 'Fredericksburg', games: 4, ppg: 12.7, apg: 5.2, rpg: 4.4, wins: 2, rep: 0, player_level: 1 },
  { profile_id: 'sample-run-10', player_name: 'Isaiah Grant', avatar_url: null, city: 'Charlottesville', games: 3, ppg: 11.8, apg: 2.4, rpg: 3.8, wins: 1, rep: 0, player_level: 1 },
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

/** Two-letter avatar monograms that fit a fixed-width circle on mobile. */
export function runPlayerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'RH';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
