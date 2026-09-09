export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Row<T> = T;
type Insert<T> = Omit<T, 'id' | 'created_at' | 'updated_at'> &
  Partial<Pick<T, 'id' | 'created_at' | 'updated_at'>>;
type Update<T> = Partial<T>;

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Row<ProfileRow>; Insert: Insert<ProfileRow>; Update: Update<ProfileRow> };
      leagues: { Row: League; Insert: Insert<League>; Update: Update<League> };
      seasons: { Row: Season; Insert: Insert<Season>; Update: Update<Season> };
      divisions: { Row: Division; Insert: Insert<Division>; Update: Update<Division> };
      teams: { Row: Team; Insert: Insert<Team>; Update: Update<Team> };
      team_seasons: { Row: TeamSeason; Insert: Insert<TeamSeason>; Update: Update<TeamSeason> };
      players: { Row: Player; Insert: Insert<Player>; Update: Update<Player> };
      team_coaches: { Row: TeamCoach; Insert: Insert<TeamCoach>; Update: Update<TeamCoach> };
      rosters: { Row: Roster; Insert: Insert<Roster>; Update: Update<Roster> };
      games: { Row: Game; Insert: Insert<Game>; Update: Update<Game> };
      player_game_stats: { Row: PlayerGameStats; Insert: Insert<PlayerGameStats>; Update: Update<PlayerGameStats> };
      team_game_stats: { Row: TeamGameStats; Insert: Insert<TeamGameStats>; Update: Update<TeamGameStats> };
      standings: { Row: Standing; Insert: Insert<Standing>; Update: Update<Standing> };
      registrations: { Row: Registration; Insert: Insert<Registration>; Update: Update<Registration> };
      payments: { Row: Payment; Insert: Insert<Payment>; Update: Update<Payment> };
      posts: { Row: Post; Insert: Insert<Post>; Update: Update<Post> };
      comments: { Row: Comment; Insert: Insert<Comment>; Update: Update<Comment> };
      likes: { Row: Like; Insert: Like; Update: Partial<Like> };
      follows: { Row: Follow; Insert: Follow; Update: Partial<Follow> };
      news: { Row: News; Insert: Insert<News>; Update: Update<News> };
      media: { Row: Media; Insert: Insert<Media>; Update: Update<Media> };
      awards: { Row: Award; Insert: Insert<Award>; Update: Update<Award> };
      staff: { Row: Staff; Insert: Insert<Staff>; Update: Update<Staff> };
      notifications: { Row: Notification; Insert: Insert<Notification>; Update: Update<Notification> };
      commissioners: { Row: Commissioner; Insert: Insert<Commissioner>; Update: Update<Commissioner> };
      registration_items: { Row: RegistrationItem; Insert: Insert<RegistrationItem>; Update: Update<RegistrationItem> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: 'player' | 'coach' | 'staff' | 'admin';
      season_status: 'draft' | 'registration' | 'active' | 'completed' | 'archived';
      registration_status: 'pending' | 'approved' | 'waitlisted' | 'rejected' | 'cancelled';
      payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'waived';
      game_status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed';
      content_status: 'draft' | 'published' | 'archived';
    };
  };
}

export interface ProfileRow { id: string; username: string | null; first_name: string | null; last_name: string | null; display_name: string | null; avatar_url: string | null; bio: string | null; phone: string | null; role: Database['public']['Enums']['app_role']; is_active: boolean; created_at: string; updated_at: string; }
export interface League { id: string; name: string; slug: string; description: string | null; city: string; state: string; is_active: boolean; created_at: string; updated_at: string; }
export interface Season { id: string; league_id: string; name: string; slug: string; start_date: string; end_date: string; status: Database['public']['Enums']['season_status']; registration_open: boolean; created_at: string; updated_at: string; }
export interface Division { id: string; season_id: string; name: string; age_group: string | null; gender: string | null; max_teams: number | null; created_at: string; }
export interface Team { id: string; league_id: string; name: string; slug: string; short_name: string | null; logo_url: string | null; primary_color: string | null; secondary_color: string | null; city: string | null; description: string | null; is_active: boolean; created_at: string; updated_at: string; }
export interface TeamSeason { id: string; team_id: string; season_id: string; division_id: string | null; seed: number | null; created_at: string; }
export interface Player { id: string; profile_id: string | null; first_name: string; last_name: string; jersey_number: string | null; position: string | null; height_inches: number | null; date_of_birth: string | null; hometown: string | null; photo_url: string | null; is_active: boolean; created_at: string; updated_at: string; }
export interface TeamCoach { id: string; team_id: string; profile_id: string; title: string; created_at: string; }
export interface Roster { id: string; team_season_id: string; player_id: string; jersey_number: string | null; is_captain: boolean; joined_at: string; left_at: string | null; created_at: string; }
export interface Game { id: string; season_id: string; division_id: string | null; home_team_id: string; away_team_id: string; venue_id: string | null; scheduled_at: string; status: Database['public']['Enums']['game_status']; home_score: number; away_score: number; notes: string | null; created_by: string | null; created_at: string; updated_at: string; }
export interface PlayerGameStats { id: string; game_id: string; player_id: string; team_id: string; minutes: number | null; points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number; fouls: number; field_goals_made: number; field_goals_attempted: number; three_pointers_made: number; three_pointers_attempted: number; free_throws_made: number; free_throws_attempted: number; created_at: string; updated_at: string; }
export interface TeamGameStats { id: string; game_id: string; team_id: string; points: number; rebounds: number; assists: number; turnovers: number; fouls: number; }
export interface Standing { id: string; season_id: string; division_id: string | null; team_id: string; wins: number; losses: number; ties: number; points_for: number; points_against: number; streak: string | null; rank: number | null; updated_at: string; }
export interface Registration { id: string; season_id: string; applicant_id: string | null; team_id: string | null; first_name: string; last_name: string; email: string; date_of_birth: string | null; emergency_contact: Json; status: Database['public']['Enums']['registration_status']; submitted_at: string; reviewed_at: string | null; reviewed_by: string | null; notes: string | null; }
export interface Payment { id: string; registration_id: string; amount_cents: number; currency: string; status: Database['public']['Enums']['payment_status']; provider: string | null; provider_payment_id: string | null; paid_at: string | null; created_at: string; }
export interface Post { id: string; author_id: string; body: string; media_urls: Json; status: Database['public']['Enums']['content_status']; created_at: string; updated_at: string; }
export interface Comment { id: string; post_id: string; author_id: string; body: string; created_at: string; }
export interface Like { post_id: string; user_id: string; created_at: string; }
export interface Follow { follower_id: string; following_id: string; created_at: string; }
export interface News { id: string; author_id: string | null; title: string; slug: string; excerpt: string | null; body: string; cover_image_url: string | null; status: Database['public']['Enums']['content_status']; published_at: string | null; created_at: string; updated_at: string; }
export interface Media { id: string; uploader_id: string | null; title: string; description: string | null; storage_path: string; media_type: string; status: Database['public']['Enums']['content_status']; created_at: string; }
export interface Award { id: string; season_id: string; player_id: string | null; team_id: string | null; name: string; description: string | null; awarded_at: string; created_at: string; }
export interface Staff { id: string; profile_id: string; title: string; permissions: Json; created_at: string; }
export interface Notification { id: string; recipient_id: string; actor_id: string | null; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string; }
export interface Commissioner { id: string; league_id: string; profile_id: string; title: string; permissions: Json; created_at: string; }
export interface RegistrationItem { id: string; registration_id: string; player_id: string | null; team_id: string | null; amount_cents: number; description: string; created_at: string; }
