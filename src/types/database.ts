export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Row<T> = T;
type Insert<T> = Omit<T, 'id' | 'created_at' | 'updated_at'> &
  Partial<Pick<T, Extract<keyof T, 'id' | 'created_at' | 'updated_at'>>>;
type Update<T> = Partial<T>;

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Row<ProfileRow>; Insert: Insert<ProfileRow>; Update: Update<ProfileRow> };
      leagues: { Row: League; Insert: Insert<League>; Update: Update<League> };
      seasons: { Row: Season; Insert: Insert<Season>; Update: Update<Season> };
      divisions: { Row: Division; Insert: Insert<Division>; Update: Update<Division> };
      venues: { Row: Venue; Insert: Insert<Venue>; Update: Update<Venue> };
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
      site_settings: { Row: SiteSetting; Insert: Insert<SiteSetting>; Update: Update<SiteSetting> };
      badges: { Row: Badge; Insert: Insert<Badge>; Update: Update<Badge> };
      player_badges: { Row: PlayerBadge; Insert: Insert<PlayerBadge>; Update: Update<PlayerBadge> };
      coach_badges: { Row: CoachBadge; Insert: Insert<CoachBadge>; Update: Update<CoachBadge> };
      player_of_week: { Row: PlayerOfWeek; Insert: Insert<PlayerOfWeek>; Update: Update<PlayerOfWeek> };
      reactions: { Row: Reaction; Insert: Insert<Reaction>; Update: Update<Reaction> };
      audit_logs: { Row: AuditLog; Insert: Insert<AuditLog>; Update: Update<AuditLog> };
      friendships: { Row: Friendship; Insert: Insert<Friendship>; Update: Update<Friendship> };
      blocks: { Row: Block; Insert: Block; Update: Partial<Block> };
      stories: { Row: Story; Insert: Insert<Story>; Update: Update<Story> };
      story_views: { Row: StoryView; Insert: StoryView; Update: Partial<StoryView> };
      conversations: { Row: Conversation; Insert: Insert<Conversation>; Update: Update<Conversation> };
      conversation_members: { Row: ConversationMember; Insert: ConversationMember; Update: Partial<ConversationMember> };
      messages: { Row: Message; Insert: Insert<Message>; Update: Update<Message> };
      communities: { Row: Community; Insert: Insert<Community>; Update: Update<Community> };
      community_members: { Row: CommunityMember; Insert: CommunityMember; Update: Partial<CommunityMember> };
      community_posts: { Row: CommunityPost; Insert: Insert<CommunityPost>; Update: Update<CommunityPost> };
      notification_preferences: { Row: NotificationPreference; Insert: Insert<NotificationPreference>; Update: Update<NotificationPreference> };
      user_activity: { Row: UserActivity; Insert: Insert<UserActivity>; Update: Update<UserActivity> };
      xp_transactions: { Row: XpTransaction; Insert: Insert<XpTransaction>; Update: Update<XpTransaction> };
      user_levels: { Row: UserLevel; Insert: Insert<UserLevel>; Update: Update<UserLevel> };
      reports: { Row: Report; Insert: Insert<Report>; Update: Update<Report> };
      saved_posts: { Row: SavedPost; Insert: SavedPost; Update: Partial<SavedPost> };
      player_iq_profiles: { Row: PlayerIQProfile; Insert: Insert<PlayerIQProfile>; Update: Update<PlayerIQProfile> };
      player_iq_history: { Row: PlayerIQHistory; Insert: Insert<PlayerIQHistory>; Update: Update<PlayerIQHistory> };
      teammate_evaluations: { Row: TeammateEvaluation; Insert: Insert<TeammateEvaluation>; Update: Update<TeammateEvaluation> };
    };
    Views: {
      public_players: { Row: PublicPlayer };
      public_player_iq: { Row: PublicPlayerIQ };
    };
    Functions: Record<string, never>;
    Enums: {
      app_role: 'player' | 'coach' | 'staff' | 'admin';
      season_status: 'draft' | 'registration' | 'active' | 'completed' | 'archived';
      registration_status: 'pending' | 'approved' | 'waitlisted' | 'rejected' | 'cancelled';
      game_status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed';
      content_status: 'draft' | 'published' | 'archived';
    };
  };
}

export interface ProfileRow { id: string; username: string | null; first_name: string | null; last_name: string | null; display_name: string | null; avatar_url: string | null; bio: string | null; phone: string | null; role: Database['public']['Enums']['app_role']; is_active: boolean; created_at: string; updated_at: string; }
export interface League { id: string; name: string; slug: string; description: string | null; city: string; state: string; is_active: boolean; created_at: string; updated_at: string; }
export interface Season { id: string; league_id: string; name: string; slug: string; start_date: string; end_date: string; status: Database['public']['Enums']['season_status']; registration_open: boolean; created_at: string; updated_at: string; }
export interface Division { id: string; season_id: string; name: string; age_group: string | null; gender: string | null; max_teams: number | null; created_at: string; }
export interface Venue { id: string; name: string; address: string | null; city: string | null; state: string | null; postal_code: string | null; latitude: number | null; longitude: number | null; amenities: Json; created_at: string; }
export interface Team { id: string; league_id: string; name: string; slug: string; short_name: string | null; logo_url: string | null; primary_color: string | null; secondary_color: string | null; city: string | null; description: string | null; is_active: boolean; created_at: string; updated_at: string; }
export interface TeamSeason { id: string; team_id: string; season_id: string; division_id: string | null; seed: number | null; created_at: string; }
export interface Player { id: string; profile_id: string | null; first_name: string; last_name: string; jersey_number: string | null; position: string | null; height_inches: number | null; date_of_birth: string | null; hometown: string | null; photo_url: string | null; is_active: boolean; created_at: string; updated_at: string; }
export interface PublicPlayer { id: string; first_name: string; last_name: string; jersey_number: string | null; position: string | null; height_inches: number | null; hometown: string | null; photo_url: string | null; is_active: boolean; }
export interface TeamCoach { id: string; team_id: string; profile_id: string; title: string; created_at: string; }
export interface Roster { id: string; team_season_id: string; player_id: string; jersey_number: string | null; is_captain: boolean; joined_at: string; left_at: string | null; created_at: string; }
export interface Game { id: string; season_id: string; division_id: string | null; home_team_id: string; away_team_id: string; venue_id: string | null; scheduled_at: string; status: Database['public']['Enums']['game_status']; home_score: number; away_score: number; notes: string | null; created_by: string | null; created_at: string; updated_at: string; }
export interface PlayerGameStats { id: string; game_id: string; player_id: string; team_id: string; minutes: number | null; points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number; fouls: number; field_goals_made: number; field_goals_attempted: number; three_pointers_made: number; three_pointers_attempted: number; free_throws_made: number; free_throws_attempted: number; created_at: string; updated_at: string; }
export interface TeamGameStats { id: string; game_id: string; team_id: string; points: number; rebounds: number; assists: number; turnovers: number; fouls: number; }
export interface Standing { id: string; season_id: string; division_id: string | null; team_id: string; wins: number; losses: number; ties: number; points_for: number; points_against: number; streak: string | null; rank: number | null; updated_at: string; }
export interface Registration { id: string; season_id: string; division_id: string | null; applicant_id: string | null; team_id: string | null; first_name: string; last_name: string; email: string; date_of_birth: string | null; emergency_contact: Json; status: Database['public']['Enums']['registration_status']; submitted_at: string; reviewed_at: string | null; reviewed_by: string | null; notes: string | null; }
export interface Post { id: string; author_id: string; body: string; media_urls: Json; status: Database['public']['Enums']['content_status']; created_at: string; updated_at: string; }
export interface Comment { id: string; post_id: string; author_id: string; body: string; parent_id?: string | null; created_at: string; }
export interface Like { post_id: string; user_id: string; created_at: string; }
export interface Follow { follower_id: string; following_id: string; created_at: string; }
export interface News { id: string; author_id: string | null; title: string; slug: string; excerpt: string | null; body: string; cover_image_url: string | null; status: Database['public']['Enums']['content_status']; published_at: string | null; created_at: string; updated_at: string; }
export interface Media { id: string; uploader_id: string | null; title: string; description: string | null; storage_path: string; media_type: string; status: Database['public']['Enums']['content_status']; created_at: string; }
export interface Award { id: string; season_id: string; player_id: string | null; team_id: string | null; name: string; description: string | null; awarded_at: string; created_at: string; }
export interface Staff { id: string; profile_id: string; title: string; permissions: Json; created_at: string; }
export interface Notification { id: string; recipient_id: string; actor_id: string | null; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string; }
export interface Commissioner { id: string; league_id: string; profile_id: string; title: string; permissions: Json; created_at: string; }

export interface SiteSetting { key: string; value: Json; created_at: string; updated_at: string; }
export interface Badge { id: string; name: string; description: string; category: string; icon: string; tier: string; requirement_type: string; requirement_value: number; is_active: boolean; created_at: string; updated_at: string; }
export interface PlayerBadge { id: string; player_id: string; badge_id: string; game_id: string | null; earned_at: string; created_at: string; }
export interface CoachBadge { id: string; profile_id: string; badge_id: string; earned_at: string; created_at: string; }
export interface PlayerOfWeek { id: string; player_id: string; season_id: string; week_number: number; description: string; stats: Json; is_active: boolean; created_at: string; updated_at: string; }
export interface Reaction { id: string; post_id: string; user_id: string; type: 'bucket' | 'heat' | 'strong' | 'locked' | 'money' | 'watch' | 'king' | 'certified' | 'highlight' | 'champ'; created_at: string; }
export interface AuditLog { id: string; user_id: string | null; action: string; details: string | null; created_at: string; }
export interface Friendship { id: string; requester_id: string; addressee_id: string; status: 'pending' | 'accepted' | 'declined' | 'cancelled'; created_at: string; updated_at: string; }
export interface Block { blocker_id: string; blocked_id: string; created_at: string; }
export interface Story { id: string; author_id: string; story_type: 'text' | 'photo' | 'video' | 'game_day' | 'highlight'; body: string | null; media_url: string | null; expires_at: string; audience: 'public' | 'friends' | 'private'; created_at: string; }
export interface StoryView { story_id: string; viewer_id: string; viewed_at: string; }
export interface Conversation { id: string; title: string | null; conversation_type: 'direct' | 'group' | 'team' | 'community' | 'announcement'; created_by: string; created_at: string; updated_at: string; }
export interface ConversationMember { conversation_id: string; profile_id: string; role: 'member' | 'admin'; last_read_at: string | null; joined_at: string; }
export interface Message { id: string; conversation_id: string; sender_id: string; body: string; attachment_url: string | null; reply_to_id: string | null; deleted_at: string | null; created_at: string; }
export interface Community { id: string; name: string; slug: string; description: string | null; community_type: string; privacy: 'public' | 'private' | 'invite_only'; logo_url: string | null; cover_url: string | null; created_by: string; created_at: string; updated_at: string; }
export interface CommunityMember { community_id: string; profile_id: string; role: 'member' | 'moderator' | 'admin'; joined_at: string; }
export interface CommunityPost { id: string; community_id: string; author_id: string; body: string; created_at: string; updated_at: string; }
export interface NotificationPreference { profile_id: string; messages: boolean; friend_requests: boolean; comments: boolean; reactions: boolean; announcements: boolean; updated_at: string; }
export interface UserActivity { id: string; profile_id: string; activity_type: string; entity_type: string | null; entity_id: string | null; metadata: Json; created_at: string; }
export interface XpTransaction { id: string; profile_id: string; amount: number; reason: string; source_type: string | null; source_id: string | null; created_at: string; }
export interface UserLevel { profile_id: string; xp: number; level: number; current_streak: number; updated_at: string; }
export interface Report { id: string; reporter_id: string; reported_profile_id: string | null; post_id: string | null; message_id: string | null; reason: string; status: 'open' | 'reviewing' | 'resolved' | 'dismissed'; reviewed_by: string | null; created_at: string; }
export interface SavedPost { profile_id: string; post_id: string; created_at: string; }
export interface PlayerIQProfile {
  player_id: string; rcl_rating: number; court_performance_score: number; skill_profile_score: number;
  teammate_grade_score: number; community_popularity_score: number; growth_consistency_score: number;
  exposure_index: number; player_archetype: string | null; rating_trend: 'rising' | 'stable' | 'declining';
  previous_rating: number | null; rating_change: number; games_evaluated: number;
  last_calculated_at: string | null; created_at: string; updated_at: string;
}
export interface PublicPlayerIQ extends Omit<PlayerIQProfile, 'created_at' | 'updated_at'> {}
export interface PlayerIQHistory {
  id: string; player_id: string; rcl_rating: number; court_performance_score: number;
  skill_profile_score: number; teammate_grade_score: number; community_popularity_score: number;
  growth_consistency_score: number; exposure_index: number; calculated_at: string;
}
export interface TeammateEvaluation {
  id: string; game_id: string; evaluator_player_id: string; teammate_player_id: string;
  communication: number; unselfishness: number; effort: number; leadership: number;
  defense: number; team_chemistry: number; coachability: number; created_at: string;
}
