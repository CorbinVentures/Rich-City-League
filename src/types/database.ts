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
      profiles: { Row: Row<ProfileRow>; Insert: Insert<ProfileRow>; Update: Update<ProfileRow>; Relationships: [] };
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
      reaction_types: { Row: ReactionType; Insert: Insert<ReactionType>; Update: Update<ReactionType> };
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
      profile_roles: { Row: ProfileRole; Insert: Insert<ProfileRole>; Update: Update<ProfileRole>; Relationships: [] };
      fan_profiles: { Row: FanProfile; Insert: Insert<FanProfile>; Update: Update<FanProfile>; Relationships: [] };
      score_explanations: { Row: ScoreExplanation; Insert: Insert<ScoreExplanation>; Update: Update<ScoreExplanation> };
      fantasy_seasons: { Row: FantasySeason; Insert: Insert<FantasySeason>; Update: Update<FantasySeason> };
      fantasy_teams: { Row: FantasyTeam; Insert: Insert<FantasyTeam>; Update: Update<FantasyTeam> };
      fantasy_rosters: { Row: FantasyRoster; Insert: FantasyRoster; Update: Partial<FantasyRoster> };
      fantasy_scores: { Row: FantasyScore; Insert: Insert<FantasyScore>; Update: Update<FantasyScore> };
      shop_categories: { Row: ShopCategory; Insert: Insert<ShopCategory>; Update: Update<ShopCategory> };
      shop_collections: { Row: ShopCollection; Insert: Insert<ShopCollection>; Update: Update<ShopCollection> };
      products: { Row: Product; Insert: Insert<Product>; Update: Update<Product> };
      product_variants: { Row: ProductVariant; Insert: Insert<ProductVariant>; Update: Update<ProductVariant> };
      product_favorites: { Row: ProductFavorite; Insert: ProductFavorite; Update: Partial<ProductFavorite> };
      carts: { Row: Cart; Insert: Insert<Cart>; Update: Update<Cart> };
      cart_items: { Row: CartItem; Insert: Insert<CartItem>; Update: Update<CartItem> };
      orders: { Row: Order; Insert: Insert<Order>; Update: Update<Order> };
      order_items: { Row: OrderItem; Insert: Insert<OrderItem>; Update: Update<OrderItem> };
      inventory_adjustments: { Row: InventoryAdjustment; Insert: Insert<InventoryAdjustment>; Update: Update<InventoryAdjustment> };
      tryout_sessions: { Row: TryoutSession; Insert: Insert<TryoutSession>; Update: Update<TryoutSession> };
      tryout_registrations: { Row: TryoutRegistration; Insert: Insert<TryoutRegistration>; Update: Update<TryoutRegistration> };
      tryout_attendance: { Row: TryoutAttendance; Insert: Insert<TryoutAttendance>; Update: Update<TryoutAttendance> };
      player_evaluations: { Row: PlayerEvaluation; Insert: Insert<PlayerEvaluation>; Update: Update<PlayerEvaluation> };
      draft_pools: { Row: DraftPool; Insert: Insert<DraftPool>; Update: Update<DraftPool> };
      drafts: { Row: Draft; Insert: Insert<Draft>; Update: Update<Draft> };
      draft_picks: { Row: DraftPick; Insert: Insert<DraftPick>; Update: Update<DraftPick> };
      roster_status_history: { Row: RosterStatusHistory; Insert: Insert<RosterStatusHistory>; Update: Update<RosterStatusHistory> };
      league_transactions: { Row: LeagueTransaction; Insert: Insert<LeagueTransaction>; Update: Update<LeagueTransaction> };
      league_requests: { Row: LeagueRequest; Insert: Insert<LeagueRequest>; Update: Update<LeagueRequest> };
      league_request_messages: { Row: LeagueRequestMessage; Insert: Insert<LeagueRequestMessage>; Update: Update<LeagueRequestMessage> };
      game_participation_status: { Row: GameParticipationStatus; Insert: Insert<GameParticipationStatus>; Update: Update<GameParticipationStatus> };
      discipline_categories: { Row: DisciplineCategory; Insert: Insert<DisciplineCategory>; Update: Update<DisciplineCategory> };
      discipline_cases: { Row: DisciplineCase; Insert: Insert<DisciplineCase>; Update: Update<DisciplineCase> };
      discipline_appeals: { Row: DisciplineAppeal; Insert: Insert<DisciplineAppeal>; Update: Update<DisciplineAppeal> };
    };
    Views: {
      public_players: { Row: PublicPlayer };
      public_player_iq: { Row: PublicPlayerIQ };
    };
    Functions: Record<string, never>;
    Enums: {
      app_role: 'player' | 'coach' | 'fan' | 'staff' | 'admin';
      season_status: 'draft' | 'registration' | 'active' | 'completed' | 'archived';
      registration_status: 'pending' | 'approved' | 'waitlisted' | 'rejected' | 'cancelled';
      game_status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed';
      content_status: 'draft' | 'published' | 'archived';
    };
  };
}

export interface ProfileRow { id: string; username: string | null; first_name: string | null; last_name: string | null; display_name: string | null; avatar_url: string | null; cover_url?: string | null; bio: string | null; phone: string | null; location?: string | null; profile_visibility?: 'public' | 'friends' | 'private'; role: Database['public']['Enums']['app_role']; is_active: boolean; created_at: string; updated_at: string; }
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
export interface TryoutSession { id: string; season_id: string; venue_id: string | null; starts_at: string; ends_at: string; capacity: number; eligibility: string; evaluator_staff_ids: string[]; notes: string | null; status: 'DRAFT'|'OPEN'|'FULL'|'COMPLETED'|'CANCELLED'; created_by: string; created_at: string; }
export interface TryoutRegistration { id: string; session_id: string; player_id: string; registered_by: string; created_at: string; }
export interface TryoutAttendance { id: string; registration_id: string; status: 'PRESENT'|'ABSENT'|'EXCUSED'|'LATE'; marked_by: string; notes: string | null; marked_at: string; }
export interface PlayerEvaluation { id: string; player_id: string; session_id: string; evaluator_id: string; scores: Json; evaluation_score: number; notes: string | null; created_at: string; }
export interface DraftPool { id: string; season_id: string; player_id: string; eligible: boolean; eligibility_reason: string | null; added_by: string; updated_at: string; }
export interface Draft { id: string; season_id: string; name: string; rounds: number; roster_limit: number; status: 'SETUP'|'OPEN'|'PAUSED'|'COMPLETED'|'CANCELLED'; current_pick: number; created_by: string; created_at: string; }
export interface DraftPick { id: string; draft_id: string; pick_number: number; round_number: number; team_id: string; player_id: string; selected_by: string; selected_at: string; }
export interface RosterStatusHistory { id: string; roster_id: string; status: 'ACTIVE'|'INACTIVE'|'DNP'|'SUSPENDED'|'INJURED'|'RELEASED'|'TRADED'|'WAIVED'; reason: string | null; effective_at: string; changed_by: string; created_at: string; }
export interface LeagueTransaction { id: string; season_id: string; transaction_type: string; sending_team_id: string | null; receiving_team_id: string | null; player_ids: string[]; status: string; notes: string | null; reason: string | null; proposed_by: string; approved_by: string | null; executed_at: string | null; created_at: string; updated_at: string; }
export interface LeagueRequest { id: string; requester_id: string; team_id: string | null; category: string; subject: string; description: string; status: string; assigned_to: string | null; resolution: string | null; created_at: string; updated_at: string; }
export interface LeagueRequestMessage { id: string; request_id: string; author_id: string; body: string; created_at: string; }
export interface GameParticipationStatus { id: string; game_id: string; player_id: string; status: string; reason: string | null; recorded_by: string; created_at: string; }
export interface DisciplineCategory { id: string; name: string; is_active: boolean; created_at: string; }
export interface DisciplineCase { id: string; player_id: string | null; reported_profile_id: string | null; game_id: string | null; team_id: string | null; category_id: string | null; incident_date: string; description: string; evidence: Json; witnesses: string | null; status: string; decision: string | null; sanction: string | null; decision_notes: string | null; created_by: string; decision_maker: string | null; decided_at: string | null; created_at: string; updated_at: string; }
export interface DisciplineAppeal { id: string; case_id: string; submitted_by: string; reason: string; outcome: string | null; reviewer_id: string | null; decision_notes: string | null; submitted_at: string; decided_at: string | null; }
export interface Commissioner { id: string; league_id: string; profile_id: string; title: string; permissions: Json; created_at: string; }

export interface SiteSetting { key: string; value: Json; created_at: string; updated_at: string; }
export interface Badge { id: string; name: string; description: string; category: string; icon: string; tier: string; requirement_type: string; requirement_value: number; is_active: boolean; created_at: string; updated_at: string; }
export interface PlayerBadge { id: string; player_id: string; badge_id: string; game_id: string | null; earned_at: string; created_at: string; }
export interface CoachBadge { id: string; profile_id: string; badge_id: string; earned_at: string; created_at: string; }
export interface PlayerOfWeek { id: string; player_id: string; season_id: string; week_number: number; description: string; stats: Json; is_active: boolean; created_at: string; updated_at: string; }
export interface Reaction { id: string; post_id: string; user_id: string; type: 'bucket' | 'heat' | 'strong' | 'locked' | 'money' | 'watch' | 'king' | 'certified' | 'highlight' | 'champ'; created_at: string; }
export interface ReactionType { id: string; emoji: string; label: string; sort_order: number; is_active: boolean; created_at: string; updated_at: string; }
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
export interface ProfileRole { profile_id: string; role: Database['public']['Enums']['app_role']; status: 'active' | 'pending' | 'revoked'; verified_at: string | null; verified_by: string | null; created_at: string; }
export interface FanProfile { profile_id: string; favorite_team_id: string | null; fan_level: number; games_attended: number; created_at: string; updated_at: string; }
export interface ScoreExplanation { id: string; profile_id: string | null; player_id: string | null; score_type: 'player_index' | 'player_win_factor' | 'coach_index' | 'fan_win_factor'; score: number; components: Json; data_points: number; calculated_at: string; }
export interface FantasySeason { id: string; season_id: string; name: string; status: 'draft' | 'active' | 'completed'; scoring_rules: Json; champion_fantasy_team_id: string | null; created_at: string; }
export interface FantasyTeam { id: string; fantasy_season_id: string; manager_id: string; name: string; total_points: number; wins: number; losses: number; created_at: string; }
export interface FantasyRoster { fantasy_team_id: string; player_id: string; roster_slot: 'starter' | 'bench' | 'ir'; acquired_at: string; }
export interface FantasyScore { id: string; fantasy_team_id: string; player_id: string; game_id: string; fantasy_points: number; scoring_breakdown: Json; created_at: string; }
export interface ShopCategory { id: string; name: string; slug: string; created_at: string; }
export interface ShopCollection { id: string; name: string; slug: string; description: string | null; is_published: boolean; created_at: string; updated_at: string; }
export interface Product { id: string; name: string; slug: string; description: string | null; short_description: string | null; category_id: string | null; collection_id: string | null; price: number; compare_at_price: number | null; currency: string; status: 'DRAFT' | 'ACTIVE' | 'SOLD_OUT' | 'ARCHIVED' | 'SCHEDULED'; featured: boolean; limited_edition: boolean; thumbnail_url: string | null; images: Json; team: string | null; release_date: string | null; edition_size: number | null; created_at: string; updated_at: string; }
export interface ProductVariant { id: string; product_id: string; sku: string; name: string; size: string | null; color: string | null; inventory: number; reserved: number; created_at: string; updated_at: string; }
export interface ProductFavorite { user_id: string; product_id: string; created_at: string; }
export interface Cart { id: string; user_id: string; created_at: string; updated_at: string; }
export interface CartItem { cart_id: string; variant_id: string; quantity: number; created_at: string; updated_at: string; }
export interface Order { id: string; order_number: string; user_id: string | null; customer_email: string; customer_name: string | null; shipping_address: Json; subtotal: number; shipping: number; tax: number; total: number; payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'; fulfillment_status: 'UNFULFILLED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'; tracking_number: string | null; created_at: string; updated_at: string; }
export interface OrderItem { id: string; order_id: string; product_id: string | null; variant_id: string | null; product_snapshot: Json; variant_snapshot: Json | null; quantity: number; unit_price: number; created_at: string; }
export interface InventoryAdjustment { id: string; variant_id: string; quantity_delta: number; reason: string; created_by: string | null; created_at: string; }
