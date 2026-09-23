export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          details: string | null
          id: string
          reason: string | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          awarded_at: string
          created_at: string
          description: string | null
          id: string
          name: string
          player_id: string | null
          season_id: string
          team_id: string | null
        }
        Insert: {
          awarded_at?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          player_id?: string | null
          season_id: string
          team_id?: string | null
        }
        Update: {
          awarded_at?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          player_id?: string | null
          season_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          requirement_type: string
          requirement_value: number
          tier: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          icon: string
          id?: string
          is_active?: boolean
          name: string
          requirement_type: string
          requirement_value: number
          tier: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          requirement_type?: string
          requirement_value?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          quantity: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          quantity: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          quantity?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_badges: {
        Row: {
          badge_id: string
          created_at: string
          earned_at: string
          id: string
          profile_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          earned_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          earned_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      commissioners: {
        Row: {
          created_at: string
          id: string
          league_id: string
          permissions: Json
          profile_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          permissions?: Json
          profile_id: string
          title?: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          permissions?: Json
          profile_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissioners_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissioners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          community_type: string
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          privacy: string
          slug: string
          updated_at: string
        }
        Insert: {
          community_type?: string
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          privacy?: string
          slug: string
          updated_at?: string
        }
        Update: {
          community_type?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          privacy?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          profile_id: string
          role: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          profile_id: string
          role?: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          body: string
          community_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          community_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          community_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assets: {
        Row: {
          alt_text: string | null
          asset_key: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          location: string
          storage_path: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alt_text?: string | null
          asset_key: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location: string
          storage_path?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alt_text?: string | null
          asset_key?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          profile_id: string
          role: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          profile_id: string
          role?: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          conversation_type: string
          created_at: string
          created_by: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          conversation_type?: string
          created_at?: string
          created_by: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          conversation_type?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_appeals: {
        Row: {
          case_id: string
          decided_at: string | null
          decision_notes: string | null
          id: string
          outcome: string | null
          reason: string
          reviewer_id: string | null
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          case_id: string
          decided_at?: string | null
          decision_notes?: string | null
          id?: string
          outcome?: string | null
          reason: string
          reviewer_id?: string | null
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          case_id?: string
          decided_at?: string | null
          decision_notes?: string | null
          id?: string
          outcome?: string | null
          reason?: string
          reviewer_id?: string | null
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipline_appeals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "discipline_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_appeals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_appeals_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_cases: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string
          decided_at: string | null
          decision: string | null
          decision_maker: string | null
          decision_notes: string | null
          description: string
          evidence: Json
          game_id: string | null
          id: string
          incident_date: string
          player_id: string | null
          reported_profile_id: string | null
          sanction: string | null
          status: string
          team_id: string | null
          updated_at: string
          witnesses: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by: string
          decided_at?: string | null
          decision?: string | null
          decision_maker?: string | null
          decision_notes?: string | null
          description: string
          evidence?: Json
          game_id?: string | null
          id?: string
          incident_date: string
          player_id?: string | null
          reported_profile_id?: string | null
          sanction?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          witnesses?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string
          decided_at?: string | null
          decision?: string | null
          decision_maker?: string | null
          decision_notes?: string | null
          description?: string
          evidence?: Json
          game_id?: string | null
          id?: string
          incident_date?: string
          player_id?: string | null
          reported_profile_id?: string | null
          sanction?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discipline_cases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "discipline_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_cases_decision_maker_fkey"
            columns: ["decision_maker"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_cases_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_cases_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_cases_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_cases_reported_profile_id_fkey"
            columns: ["reported_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_cases_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      divisions: {
        Row: {
          age_group: string | null
          created_at: string
          gender: string | null
          id: string
          leagueapps_program_id: number | null
          max_teams: number | null
          name: string
          season_id: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          leagueapps_program_id?: number | null
          max_teams?: number | null
          name: string
          season_id: string
        }
        Update: {
          age_group?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          leagueapps_program_id?: number | null
          max_teams?: number | null
          name?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_order: {
        Row: {
          created_at: string
          draft_id: string
          id: string
          pick_number: number
          round_number: number
          team_id: string
        }
        Insert: {
          created_at?: string
          draft_id: string
          id?: string
          pick_number: number
          round_number: number
          team_id: string
        }
        Update: {
          created_at?: string
          draft_id?: string
          id?: string
          pick_number?: number
          round_number?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_order_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_order_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_picks: {
        Row: {
          draft_id: string
          id: string
          pick_number: number
          player_id: string
          round_number: number
          selected_at: string
          selected_by: string
          team_id: string
        }
        Insert: {
          draft_id: string
          id?: string
          pick_number: number
          player_id: string
          round_number: number
          selected_at?: string
          selected_by: string
          team_id: string
        }
        Update: {
          draft_id?: string
          id?: string
          pick_number?: number
          player_id?: string
          round_number?: number
          selected_at?: string
          selected_by?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_picks_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_selected_by_fkey"
            columns: ["selected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_pools: {
        Row: {
          added_by: string
          eligibility_reason: string | null
          eligible: boolean
          id: string
          player_id: string
          season_id: string
          updated_at: string
        }
        Insert: {
          added_by: string
          eligibility_reason?: string | null
          eligible?: boolean
          id?: string
          player_id: string
          season_id: string
          updated_at?: string
        }
        Update: {
          added_by?: string
          eligibility_reason?: string | null
          eligible?: boolean
          id?: string
          player_id?: string
          season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_pools_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pools_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pools_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pools_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          clock_deadline_at: string | null
          clock_duration_seconds: number
          clock_remaining_seconds: number | null
          clock_started_at: string | null
          created_at: string
          created_by: string
          current_pick: number
          id: string
          name: string
          roster_limit: number
          rounds: number
          season_id: string
          status: string
        }
        Insert: {
          clock_deadline_at?: string | null
          clock_duration_seconds?: number
          clock_remaining_seconds?: number | null
          clock_started_at?: string | null
          created_at?: string
          created_by: string
          current_pick?: number
          id?: string
          name: string
          roster_limit?: number
          rounds?: number
          season_id: string
          status?: string
        }
        Update: {
          clock_deadline_at?: string | null
          clock_duration_seconds?: number
          clock_remaining_seconds?: number | null
          clock_started_at?: string | null
          created_at?: string
          created_by?: string
          current_pick?: number
          id?: string
          name?: string
          roster_limit?: number
          rounds?: number
          season_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_badges: {
        Row: {
          badge_id: string
          created_at: string
          earned_at: string
          id: string
          profile_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          earned_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          earned_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_profiles: {
        Row: {
          created_at: string
          fan_level: number
          favorite_team_id: string | null
          games_attended: number
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fan_level?: number
          favorite_team_id?: string | null
          games_attended?: number
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fan_level?: number
          favorite_team_id?: string | null
          games_attended?: number
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_profiles_favorite_team_id_fkey"
            columns: ["favorite_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_matchups: {
        Row: {
          away_points: number
          away_team_id: string
          created_at: string
          ends_at: string
          fantasy_season_id: string
          home_points: number
          home_team_id: string
          id: string
          starts_at: string
          status: string
          week_number: number
          winner_team_id: string | null
        }
        Insert: {
          away_points?: number
          away_team_id: string
          created_at?: string
          ends_at: string
          fantasy_season_id: string
          home_points?: number
          home_team_id: string
          id?: string
          starts_at: string
          status?: string
          week_number: number
          winner_team_id?: string | null
        }
        Update: {
          away_points?: number
          away_team_id?: string
          created_at?: string
          ends_at?: string
          fantasy_season_id?: string
          home_points?: number
          home_team_id?: string
          id?: string
          starts_at?: string
          status?: string
          week_number?: number
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_matchups_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_matchups_fantasy_season_id_fkey"
            columns: ["fantasy_season_id"]
            isOneToOne: false
            referencedRelation: "fantasy_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_matchups_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_matchups_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_rosters: {
        Row: {
          acquired_at: string
          fantasy_team_id: string
          player_id: string
          roster_slot: string
        }
        Insert: {
          acquired_at?: string
          fantasy_team_id: string
          player_id: string
          roster_slot?: string
        }
        Update: {
          acquired_at?: string
          fantasy_team_id?: string
          player_id?: string
          roster_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_rosters_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_scores: {
        Row: {
          created_at: string
          fantasy_points: number
          fantasy_team_id: string
          game_id: string
          id: string
          player_id: string
          scoring_breakdown: Json
        }
        Insert: {
          created_at?: string
          fantasy_points: number
          fantasy_team_id: string
          game_id: string
          id?: string
          player_id: string
          scoring_breakdown?: Json
        }
        Update: {
          created_at?: string
          fantasy_points?: number
          fantasy_team_id?: string
          game_id?: string
          id?: string
          player_id?: string
          scoring_breakdown?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_scores_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_scores_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_seasons: {
        Row: {
          champion_fantasy_team_id: string | null
          created_at: string
          id: string
          name: string
          scoring_rules: Json
          season_id: string
          status: string
        }
        Insert: {
          champion_fantasy_team_id?: string | null
          created_at?: string
          id?: string
          name: string
          scoring_rules?: Json
          season_id: string
          status?: string
        }
        Update: {
          champion_fantasy_team_id?: string | null
          created_at?: string
          id?: string
          name?: string
          scoring_rules?: Json
          season_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_seasons_champion_fantasy_team_id_fkey"
            columns: ["champion_fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: true
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_teams: {
        Row: {
          created_at: string
          fantasy_season_id: string
          id: string
          losses: number
          manager_id: string
          name: string
          total_points: number
          wins: number
        }
        Insert: {
          created_at?: string
          fantasy_season_id: string
          id?: string
          losses?: number
          manager_id: string
          name: string
          total_points?: number
          wins?: number
        }
        Update: {
          created_at?: string
          fantasy_season_id?: string
          id?: string
          losses?: number
          manager_id?: string
          name?: string
          total_points?: number
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_fantasy_season_id_fkey"
            columns: ["fantasy_season_id"]
            isOneToOne: false
            referencedRelation: "fantasy_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_ai_insights: {
        Row: {
          body: string
          confidence: number | null
          created_by: string | null
          data: Json
          game_id: string
          generated_at: string
          id: string
          insight_type: string
          title: string
        }
        Insert: {
          body: string
          confidence?: number | null
          created_by?: string | null
          data?: Json
          game_id: string
          generated_at?: string
          id?: string
          insight_type: string
          title: string
        }
        Update: {
          body?: string
          confidence?: number | null
          created_by?: string | null
          data?: Json
          game_id?: string
          generated_at?: string
          id?: string
          insight_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_ai_insights_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_ai_insights_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_events: {
        Row: {
          clock_seconds: number
          created_at: string
          created_by: string | null
          event_type: string
          foul_type: string | null
          game_id: string
          id: string
          metadata: Json
          period_number: number
          player_id: string | null
          player_in_id: string | null
          player_out_id: string | null
          points: number
          secondary_player_id: string | null
          sequence_no: number
          shot_result: string | null
          shot_value: number | null
          shot_x: number | null
          shot_y: number | null
          shot_zone: string | null
          team_id: string | null
          turnover_type: string | null
          voided_at: string | null
        }
        Insert: {
          clock_seconds?: number
          created_at?: string
          created_by?: string | null
          event_type: string
          foul_type?: string | null
          game_id: string
          id?: string
          metadata?: Json
          period_number: number
          player_id?: string | null
          player_in_id?: string | null
          player_out_id?: string | null
          points?: number
          secondary_player_id?: string | null
          sequence_no: number
          shot_result?: string | null
          shot_value?: number | null
          shot_x?: number | null
          shot_y?: number | null
          shot_zone?: string | null
          team_id?: string | null
          turnover_type?: string | null
          voided_at?: string | null
        }
        Update: {
          clock_seconds?: number
          created_at?: string
          created_by?: string | null
          event_type?: string
          foul_type?: string | null
          game_id?: string
          id?: string
          metadata?: Json
          period_number?: number
          player_id?: string | null
          player_in_id?: string | null
          player_out_id?: string | null
          points?: number
          secondary_player_id?: string | null
          sequence_no?: number
          shot_result?: string | null
          shot_value?: number | null
          shot_x?: number | null
          shot_y?: number | null
          shot_zone?: string | null
          team_id?: string | null
          turnover_type?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_player_in_id_fkey"
            columns: ["player_in_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_player_in_id_fkey"
            columns: ["player_in_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_player_out_id_fkey"
            columns: ["player_out_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_player_out_id_fkey"
            columns: ["player_out_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_secondary_player_id_fkey"
            columns: ["secondary_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_secondary_player_id_fkey"
            columns: ["secondary_player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_lineups: {
        Row: {
          created_at: string
          ended_clock_seconds: number | null
          game_id: string
          id: string
          period_number: number
          player_ids: string[]
          plus_minus: number
          points_against: number
          points_for: number
          possessions: number
          seconds_played: number
          segment_key: string | null
          started_clock_seconds: number
          team_id: string
        }
        Insert: {
          created_at?: string
          ended_clock_seconds?: number | null
          game_id: string
          id?: string
          period_number: number
          player_ids?: string[]
          plus_minus?: number
          points_against?: number
          points_for?: number
          possessions?: number
          seconds_played?: number
          segment_key?: string | null
          started_clock_seconds?: number
          team_id: string
        }
        Update: {
          created_at?: string
          ended_clock_seconds?: number | null
          game_id?: string
          id?: string
          period_number?: number
          player_ids?: string[]
          plus_minus?: number
          points_against?: number
          points_for?: number
          possessions?: number
          seconds_played?: number
          segment_key?: string | null
          started_clock_seconds?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_lineups_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_lineups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_participation_status: {
        Row: {
          created_at: string
          game_id: string
          id: string
          player_id: string
          reason: string | null
          recorded_by: string
          status: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          player_id: string
          reason?: string | null
          recorded_by: string
          status: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          player_id?: string
          reason?: string | null
          recorded_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_participation_status_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_participation_status_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_participation_status_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_participation_status_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          away_score: number
          away_team_id: string
          created_at: string
          created_by: string | null
          division_id: string | null
          home_score: number
          home_team_id: string
          id: string
          leagueapps_game_id: number | null
          notes: string | null
          period_count: number
          period_length_seconds: number
          scheduled_at: string
          scorebook_mode: string
          scorebook_status: string
          season_id: string
          shot_clock_seconds: number | null
          status: Database["public"]["Enums"]["game_status"]
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          away_score?: number
          away_team_id: string
          created_at?: string
          created_by?: string | null
          division_id?: string | null
          home_score?: number
          home_team_id: string
          id?: string
          leagueapps_game_id?: number | null
          notes?: string | null
          period_count?: number
          period_length_seconds?: number
          scheduled_at: string
          scorebook_mode?: string
          scorebook_status?: string
          season_id: string
          shot_clock_seconds?: number | null
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          away_score?: number
          away_team_id?: string
          created_at?: string
          created_by?: string | null
          division_id?: string | null
          home_score?: number
          home_team_id?: string
          id?: string
          leagueapps_game_id?: number | null
          notes?: string | null
          period_count?: number
          period_length_seconds?: number
          scheduled_at?: string
          scorebook_mode?: string
          scorebook_status?: string
          season_id?: string
          shot_clock_seconds?: number | null
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          quantity_delta: number
          reason: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          quantity_delta: number
          reason: string
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          quantity_delta?: number
          reason?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_assessments: {
        Row: {
          assessed_at: string
          category: string
          created_at: string
          id: string
          notes: string | null
          profile_id: string
          score: number
          verification_status: string
        }
        Insert: {
          assessed_at?: string
          category: string
          created_at?: string
          id?: string
          notes?: string | null
          profile_id: string
          score: number
          verification_status?: string
        }
        Update: {
          assessed_at?: string
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          profile_id?: string
          score?: number
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_assessments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_challenge_attempts: {
        Row: {
          attempts: number | null
          challenge_key: string
          challenge_name: string
          created_at: string
          id: string
          profile_id: string
          result: number
          verification_status: string
        }
        Insert: {
          attempts?: number | null
          challenge_key: string
          challenge_name: string
          created_at?: string
          id?: string
          profile_id: string
          result: number
          verification_status?: string
        }
        Update: {
          attempts?: number | null
          challenge_key?: string
          challenge_name?: string
          created_at?: string
          id?: string
          profile_id?: string
          result?: number
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_challenge_attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_film_entries: {
        Row: {
          created_at: string
          id: string
          lesson: string
          media_url: string | null
          possession_type: string | null
          profile_id: string
          title: string
          visibility: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson?: string
          media_url?: string | null
          possession_type?: string | null
          profile_id: string
          title: string
          visibility?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson?: string
          media_url?: string | null
          possession_type?: string | null
          profile_id?: string
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_film_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_notebook_entries: {
        Row: {
          body: string
          created_at: string
          id: string
          profile_id: string
          session_id: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          profile_id: string
          session_id?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          profile_id?: string
          session_id?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_notebook_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_notebook_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lab_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_program_enrollments: {
        Row: {
          completed_at: string | null
          completed_sessions: number
          focus: string | null
          id: string
          profile_id: string
          program_key: string
          program_name: string
          started_at: string
          status: string
          total_sessions: number
        }
        Insert: {
          completed_at?: string | null
          completed_sessions?: number
          focus?: string | null
          id?: string
          profile_id: string
          program_key: string
          program_name: string
          started_at?: string
          status?: string
          total_sessions: number
        }
        Update: {
          completed_at?: string | null
          completed_sessions?: number
          focus?: string | null
          id?: string
          profile_id?: string
          program_key?: string
          program_name?: string
          started_at?: string
          status?: string
          total_sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_program_enrollments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_proof_snapshots: {
        Row: {
          captured_at: string
          category: string
          game_metric: string
          game_value: number | null
          games_sampled: number
          id: string
          lab_score: number | null
          profile_id: string
        }
        Insert: {
          captured_at?: string
          category: string
          game_metric: string
          game_value?: number | null
          games_sampled?: number
          id?: string
          lab_score?: number | null
          profile_id: string
        }
        Update: {
          captured_at?: string
          category?: string
          game_metric?: string
          game_value?: number | null
          games_sampled?: number
          id?: string
          lab_score?: number | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_proof_snapshots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          profile_id: string
          skill: string
          source: string
          status: string
          title: string
          workout: Json
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes: number
          id?: string
          profile_id: string
          skill: string
          source?: string
          status?: string
          title: string
          workout?: Json
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          profile_id?: string
          skill?: string
          source?: string
          status?: string
          title?: string
          workout?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lab_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_request_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_request_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "league_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      league_requests: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          requester_id: string
          resolution: string | null
          status: string
          subject: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          requester_id: string
          resolution?: string | null
          status?: string
          subject: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          requester_id?: string
          resolution?: string | null
          status?: string
          subject?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      league_transactions: {
        Row: {
          approved_by: string | null
          created_at: string
          executed_at: string | null
          id: string
          notes: string | null
          player_ids: string[]
          proposed_by: string
          reason: string | null
          receiving_team_id: string | null
          season_id: string
          sending_team_id: string | null
          status: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          notes?: string | null
          player_ids?: string[]
          proposed_by: string
          reason?: string | null
          receiving_team_id?: string | null
          season_id: string
          sending_team_id?: string | null
          status?: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          notes?: string | null
          player_ids?: string[]
          proposed_by?: string
          reason?: string | null
          receiving_team_id?: string | null
          season_id?: string
          sending_team_id?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_transactions_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_transactions_receiving_team_id_fkey"
            columns: ["receiving_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_transactions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_transactions_sending_team_id_fkey"
            columns: ["sending_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      leagueapps_program_scope: {
        Row: {
          enabled: boolean
          program_id: number
          program_name: string
          scope: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          program_id: number
          program_name: string
          scope: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          program_id?: number
          program_name?: string
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      leagueapps_records: {
        Row: {
          created_at: string
          external_id: string
          id: string
          last_updated: number | null
          payload: Json
          resource: string
          synced_at: string
        }
        Insert: {
          created_at?: string
          external_id: string
          id?: string
          last_updated?: number | null
          payload?: Json
          resource: string
          synced_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string
          id?: string
          last_updated?: number | null
          payload?: Json
          resource?: string
          synced_at?: string
        }
        Relationships: []
      }
      leagueapps_sync_state: {
        Row: {
          last_error: string | null
          last_id: number
          last_synced_at: string | null
          last_updated: number
          records_synced: number
          resource: string
          status: string
        }
        Insert: {
          last_error?: string | null
          last_id?: number
          last_synced_at?: string | null
          last_updated?: number
          records_synced?: number
          resource: string
          status?: string
        }
        Update: {
          last_error?: string | null
          last_id?: number
          last_synced_at?: string | null
          last_updated?: number
          records_synced?: number
          resource?: string
          status?: string
        }
        Relationships: []
      }
      leagueapps_team_mappings: {
        Row: {
          leagueapps_team_id: number
          program_id: number
          team_id: string
          team_name: string
          team_season_id: string | null
          updated_at: string
        }
        Insert: {
          leagueapps_team_id: number
          program_id: number
          team_id: string
          team_name: string
          team_season_id?: string | null
          updated_at?: string
        }
        Update: {
          leagueapps_team_id?: number
          program_id?: number
          team_id?: string
          team_name?: string
          team_season_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leagueapps_team_mappings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leagueapps_team_mappings_team_season_id_fkey"
            columns: ["team_season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          city: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          state: string
          updated_at: string
        }
        Insert: {
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          state?: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string
          description: string | null
          id: string
          media_type: string
          status: Database["public"]["Enums"]["content_status"]
          storage_path: string
          title: string
          uploader_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          media_type: string
          status?: Database["public"]["Enums"]["content_status"]
          storage_path: string
          title: string
          uploader_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          media_type?: string
          status?: Database["public"]["Enums"]["content_status"]
          storage_path?: string
          title?: string
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_id: string | null
          body: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          announcements: boolean
          comments: boolean
          email_enabled: boolean
          email_league: boolean
          email_messages: boolean
          email_social: boolean
          friend_requests: boolean
          messages: boolean
          profile_id: string
          reactions: boolean
          updated_at: string
        }
        Insert: {
          announcements?: boolean
          comments?: boolean
          email_enabled?: boolean
          email_league?: boolean
          email_messages?: boolean
          email_social?: boolean
          friend_requests?: boolean
          messages?: boolean
          profile_id: string
          reactions?: boolean
          updated_at?: string
        }
        Update: {
          announcements?: boolean
          comments?: boolean
          email_enabled?: boolean
          email_league?: boolean
          email_messages?: boolean
          email_social?: boolean
          friend_requests?: boolean
          messages?: boolean
          profile_id?: string
          reactions?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_snapshot: Json
          quantity: number
          unit_price: number
          variant_id: string | null
          variant_snapshot: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_snapshot: Json
          quantity: number
          unit_price: number
          variant_id?: string | null
          variant_snapshot?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_snapshot?: Json
          quantity?: number
          unit_price?: number
          variant_id?: string | null
          variant_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string | null
          fulfillment_status: string
          id: string
          order_number: string
          payment_status: string
          shipping: number
          shipping_address: Json | null
          subtotal: number
          tax: number
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name?: string | null
          fulfillment_status?: string
          id?: string
          order_number?: string
          payment_status?: string
          shipping?: number
          shipping_address?: Json | null
          subtotal: number
          tax?: number
          total: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          fulfillment_status?: string
          id?: string
          order_number?: string
          payment_status?: string
          shipping?: number
          shipping_address?: Json | null
          subtotal?: number
          tax?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          provider: string | null
          provider_payment_id: string | null
          registration_id: string
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          registration_id: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          registration_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      player_badges: {
        Row: {
          badge_id: string
          created_at: string
          earned_at: string
          game_id: string | null
          id: string
          player_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          earned_at?: string
          game_id?: string | null
          id?: string
          player_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          earned_at?: string
          game_id?: string | null
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_badges_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_badges_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_badges_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_evaluations: {
        Row: {
          created_at: string
          evaluation_score: number
          evaluator_id: string
          id: string
          notes: string | null
          player_id: string
          scores: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          evaluation_score?: number
          evaluator_id: string
          id?: string
          notes?: string | null
          player_id: string
          scores?: Json
          session_id: string
        }
        Update: {
          created_at?: string
          evaluation_score?: number
          evaluator_id?: string
          id?: string
          notes?: string | null
          player_id?: string
          scores?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_evaluations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_evaluations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tryout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      player_game_stats: {
        Row: {
          assists: number
          blocks: number
          created_at: string
          field_goals_attempted: number
          field_goals_made: number
          fouls: number
          free_throws_attempted: number
          free_throws_made: number
          game_id: string
          id: string
          minutes: number | null
          player_id: string
          plus_minus: number
          points: number
          rebounds: number
          steals: number
          team_id: string
          three_pointers_attempted: number
          three_pointers_made: number
          turnovers: number
          updated_at: string
        }
        Insert: {
          assists?: number
          blocks?: number
          created_at?: string
          field_goals_attempted?: number
          field_goals_made?: number
          fouls?: number
          free_throws_attempted?: number
          free_throws_made?: number
          game_id: string
          id?: string
          minutes?: number | null
          player_id: string
          plus_minus?: number
          points?: number
          rebounds?: number
          steals?: number
          team_id: string
          three_pointers_attempted?: number
          three_pointers_made?: number
          turnovers?: number
          updated_at?: string
        }
        Update: {
          assists?: number
          blocks?: number
          created_at?: string
          field_goals_attempted?: number
          field_goals_made?: number
          fouls?: number
          free_throws_attempted?: number
          free_throws_made?: number
          game_id?: string
          id?: string
          minutes?: number | null
          player_id?: string
          plus_minus?: number
          points?: number
          rebounds?: number
          steals?: number
          team_id?: string
          three_pointers_attempted?: number
          three_pointers_made?: number
          turnovers?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_game_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_game_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_game_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_iq_history: {
        Row: {
          calculated_at: string
          community_popularity_score: number
          court_performance_score: number
          exposure_index: number
          growth_consistency_score: number
          id: string
          player_id: string
          rcl_rating: number
          skill_profile_score: number
          teammate_grade_score: number
        }
        Insert: {
          calculated_at?: string
          community_popularity_score: number
          court_performance_score: number
          exposure_index: number
          growth_consistency_score: number
          id?: string
          player_id: string
          rcl_rating: number
          skill_profile_score: number
          teammate_grade_score: number
        }
        Update: {
          calculated_at?: string
          community_popularity_score?: number
          court_performance_score?: number
          exposure_index?: number
          growth_consistency_score?: number
          id?: string
          player_id?: string
          rcl_rating?: number
          skill_profile_score?: number
          teammate_grade_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_iq_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_iq_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_iq_profiles: {
        Row: {
          community_popularity_score: number
          court_performance_score: number
          created_at: string
          exposure_index: number
          games_evaluated: number
          growth_consistency_score: number
          last_calculated_at: string | null
          player_archetype: string | null
          player_id: string
          previous_rating: number | null
          rating_change: number
          rating_trend: string
          rcl_rating: number
          skill_profile_score: number
          teammate_grade_score: number
          updated_at: string
        }
        Insert: {
          community_popularity_score?: number
          court_performance_score?: number
          created_at?: string
          exposure_index?: number
          games_evaluated?: number
          growth_consistency_score?: number
          last_calculated_at?: string | null
          player_archetype?: string | null
          player_id: string
          previous_rating?: number | null
          rating_change?: number
          rating_trend?: string
          rcl_rating?: number
          skill_profile_score?: number
          teammate_grade_score?: number
          updated_at?: string
        }
        Update: {
          community_popularity_score?: number
          court_performance_score?: number
          created_at?: string
          exposure_index?: number
          games_evaluated?: number
          growth_consistency_score?: number
          last_calculated_at?: string | null
          player_archetype?: string | null
          player_id?: string
          previous_rating?: number | null
          rating_change?: number
          rating_trend?: string
          rcl_rating?: number
          skill_profile_score?: number
          teammate_grade_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_iq_profiles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_iq_profiles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_of_week: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          player_id: string
          season_id: string
          stats: Json
          updated_at: string
          week_number: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          player_id: string
          season_id: string
          stats?: Json
          updated_at?: string
          week_number: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          player_id?: string
          season_id?: string
          stats?: Json
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_of_week_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_of_week_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_of_week_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          date_of_birth: string | null
          first_name: string
          height_inches: number | null
          hometown: string | null
          id: string
          is_active: boolean
          jersey_number: string | null
          last_name: string
          leagueapps_last_updated: number | null
          leagueapps_profile_id: number | null
          leagueapps_user_id: number | null
          photo_url: string | null
          position: string | null
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          height_inches?: number | null
          hometown?: string | null
          id?: string
          is_active?: boolean
          jersey_number?: string | null
          last_name: string
          leagueapps_last_updated?: number | null
          leagueapps_profile_id?: number | null
          leagueapps_user_id?: number | null
          photo_url?: string | null
          position?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          height_inches?: number | null
          hometown?: string | null
          id?: string
          is_active?: boolean
          jersey_number?: string | null
          last_name?: string
          leagueapps_last_updated?: number | null
          leagueapps_profile_id?: number | null
          leagueapps_user_id?: number | null
          photo_url?: string | null
          position?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          media_urls: Json
          status: Database["public"]["Enums"]["content_status"]
          target_profile_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          media_urls?: Json
          status?: Database["public"]["Enums"]["content_status"]
          target_profile_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          media_urls?: Json
          status?: Database["public"]["Enums"]["content_status"]
          target_profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          inventory: number
          name: string
          product_id: string
          reserved: number
          size: string | null
          sku: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          inventory?: number
          name: string
          product_id: string
          reserved?: number
          size?: string | null
          sku: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          inventory?: number
          name?: string
          product_id?: string
          reserved?: number
          size?: string | null
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          collection_id: string | null
          compare_at_price: number | null
          created_at: string
          currency: string
          description: string | null
          edition_size: number | null
          featured: boolean
          id: string
          images: Json
          limited_edition: boolean
          name: string
          price: number
          release_date: string | null
          short_description: string | null
          slug: string
          status: string
          team: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          collection_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          edition_size?: number | null
          featured?: boolean
          id?: string
          images?: Json
          limited_edition?: boolean
          name: string
          price: number
          release_date?: string | null
          short_description?: string | null
          slug: string
          status?: string
          team?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          collection_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          edition_size?: number | null
          featured?: boolean
          id?: string
          images?: Json
          limited_edition?: boolean
          name?: string
          price?: number
          release_date?: string | null
          short_description?: string | null
          slug?: string
          status?: string
          team?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "shop_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_roles: {
        Row: {
          created_at: string
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          friend_request_policy: string
          id: string
          is_active: boolean
          is_vip: boolean
          jersey_number: string | null
          last_name: string | null
          location: string | null
          message_policy: string
          phone: string | null
          position: string | null
          profile_visibility: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          username: string | null
          vip_label: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          friend_request_policy?: string
          id: string
          is_active?: boolean
          is_vip?: boolean
          jersey_number?: string | null
          last_name?: string | null
          location?: string | null
          message_policy?: string
          phone?: string | null
          position?: string | null
          profile_visibility?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username?: string | null
          vip_label?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          friend_request_policy?: string
          id?: string
          is_active?: boolean
          is_vip?: boolean
          jersey_number?: string | null
          last_name?: string | null
          location?: string | null
          message_policy?: string
          phone?: string | null
          position?: string | null
          profile_visibility?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username?: string | null
          vip_label?: string
        }
        Relationships: []
      }
      reaction_types: {
        Row: {
          created_at: string
          emoji: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "reaction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_items: {
        Row: {
          amount_cents: number
          created_at: string
          description: string
          id: string
          player_id: string | null
          registration_id: string
          team_id: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          description: string
          id?: string
          player_id?: string | null
          registration_id: string
          team_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string
          id?: string
          player_id?: string | null
          registration_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_items_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_items_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_items_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          applicant_id: string | null
          date_of_birth: string | null
          division_id: string | null
          email: string
          emergency_contact: Json
          first_name: string
          id: string
          last_name: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          season_id: string
          status: Database["public"]["Enums"]["registration_status"]
          submitted_at: string
          team_id: string | null
        }
        Insert: {
          applicant_id?: string | null
          date_of_birth?: string | null
          division_id?: string | null
          email: string
          emergency_contact?: Json
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          season_id: string
          status?: Database["public"]["Enums"]["registration_status"]
          submitted_at?: string
          team_id?: string | null
        }
        Update: {
          applicant_id?: string | null
          date_of_birth?: string | null
          division_id?: string | null
          email?: string
          emergency_contact?: Json
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          season_id?: string
          status?: Database["public"]["Enums"]["registration_status"]
          submitted_at?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          post_id: string | null
          reason: string
          reported_profile_id: string | null
          reporter_id: string
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          post_id?: string | null
          reason: string
          reported_profile_id?: string | null
          reporter_id: string
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          post_id?: string | null
          reason?: string
          reported_profile_id?: string | null
          reporter_id?: string
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_profile_id_fkey"
            columns: ["reported_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_status_history: {
        Row: {
          changed_by: string
          created_at: string
          effective_at: string
          id: string
          reason: string | null
          roster_id: string
          status: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          effective_at?: string
          id?: string
          reason?: string | null
          roster_id: string
          status: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          effective_at?: string
          id?: string
          reason?: string | null
          roster_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_status_history_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      rosters: {
        Row: {
          created_at: string
          id: string
          is_captain: boolean
          jersey_number: string | null
          joined_at: string
          left_at: string | null
          player_id: string
          team_season_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_captain?: boolean
          jersey_number?: string | null
          joined_at?: string
          left_at?: string | null
          player_id: string
          team_season_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_captain?: boolean
          jersey_number?: string | null
          joined_at?: string
          left_at?: string | null
          player_id?: string
          team_season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosters_team_season_id_fkey"
            columns: ["team_season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      run_players: {
        Row: {
          joined_at: string
          profile_id: string
          run_id: string
        }
        Insert: {
          joined_at?: string
          profile_id: string
          run_id: string
        }
        Update: {
          joined_at?: string
          profile_id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_players_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          capacity: number
          court_name: string
          created_at: string
          description: string | null
          game_format: string
          host_id: string
          id: string
          location: string
          max_players: number
          run_type: string
          skill_level: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          court_name: string
          created_at?: string
          description?: string | null
          game_format?: string
          host_id: string
          id?: string
          location: string
          max_players?: number
          run_type?: string
          skill_level?: string
          starts_at: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          court_name?: string
          created_at?: string
          description?: string | null
          game_format?: string
          host_id?: string
          id?: string
          location?: string
          max_players?: number
          run_type?: string
          skill_level?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string
          post_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      score_explanations: {
        Row: {
          calculated_at: string
          components: Json
          data_points: number
          id: string
          player_id: string | null
          profile_id: string | null
          score: number
          score_type: string
        }
        Insert: {
          calculated_at?: string
          components?: Json
          data_points?: number
          id?: string
          player_id?: string | null
          profile_id?: string | null
          score: number
          score_type: string
        }
        Update: {
          calculated_at?: string
          components?: Json
          data_points?: number
          id?: string
          player_id?: string | null
          profile_id?: string | null
          score?: number
          score_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_explanations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_explanations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_explanations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string
          id: string
          league_id: string
          leagueapps_program_id: number | null
          name: string
          registration_open: boolean
          slug: string
          start_date: string
          status: Database["public"]["Enums"]["season_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          league_id: string
          leagueapps_program_id?: number | null
          name: string
          registration_open?: boolean
          slug: string
          start_date: string
          status?: Database["public"]["Enums"]["season_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          league_id?: string
          leagueapps_program_id?: number | null
          name?: string
          registration_open?: boolean
          slug?: string
          start_date?: string
          status?: Database["public"]["Enums"]["season_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      shop_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      social_rep_claims: {
        Row: {
          action_type: string
          claimed_at: string
          profile_id: string
          target_id: string
        }
        Insert: {
          action_type: string
          claimed_at?: string
          profile_id: string
          target_id: string
        }
        Update: {
          action_type?: string
          claimed_at?: string
          profile_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_rep_claims_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_rep_daily_limits: {
        Row: {
          action_type: string
          claim_date: string
          claims: number
          profile_id: string
        }
        Insert: {
          action_type: string
          claim_date?: string
          claims?: number
          profile_id: string
        }
        Update: {
          action_type?: string
          claim_date?: string
          claims?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_rep_daily_limits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          id: string
          permissions: Json
          profile_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json
          profile_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json
          profile_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      standings: {
        Row: {
          division_id: string | null
          id: string
          losses: number
          points_against: number
          points_for: number
          rank: number | null
          season_id: string
          streak: string | null
          team_id: string
          ties: number
          updated_at: string
          wins: number
        }
        Insert: {
          division_id?: string | null
          id?: string
          losses?: number
          points_against?: number
          points_for?: number
          rank?: number | null
          season_id: string
          streak?: string | null
          team_id: string
          ties?: number
          updated_at?: string
          wins?: number
        }
        Update: {
          division_id?: string | null
          id?: string
          losses?: number
          points_against?: number
          points_for?: number
          rank?: number | null
          season_id?: string
          streak?: string | null
          team_id?: string
          ties?: number
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "standings_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          audience: string
          author_id: string
          body: string | null
          created_at: string
          expires_at: string
          id: string
          media_url: string | null
          story_type: string
        }
        Insert: {
          audience?: string
          author_id: string
          body?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          story_type?: string
        }
        Update: {
          audience?: string
          author_id?: string
          body?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          story_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_coaches: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          team_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          team_id: string
          title?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_coaches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_coaches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_game_stats: {
        Row: {
          assists: number
          fouls: number
          game_id: string
          id: string
          points: number
          rebounds: number
          team_id: string
          turnovers: number
        }
        Insert: {
          assists?: number
          fouls?: number
          game_id: string
          id?: string
          points?: number
          rebounds?: number
          team_id: string
          turnovers?: number
        }
        Update: {
          assists?: number
          fouls?: number
          game_id?: string
          id?: string
          points?: number
          rebounds?: number
          team_id?: string
          turnovers?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_game_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_seasons: {
        Row: {
          created_at: string
          division_id: string | null
          id: string
          season_id: string
          seed: number | null
          team_id: string
        }
        Insert: {
          created_at?: string
          division_id?: string | null
          id?: string
          season_id: string
          seed?: number | null
          team_id: string
        }
        Update: {
          created_at?: string
          division_id?: string | null
          id?: string
          season_id?: string
          seed?: number | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_seasons_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_seasons_division_same_season_fk"
            columns: ["season_id", "division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["season_id", "id"]
          },
          {
            foreignKeyName: "team_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teammate_evaluations: {
        Row: {
          coachability: number
          communication: number
          created_at: string
          defense: number
          effort: number
          evaluator_player_id: string
          game_id: string
          id: string
          leadership: number
          team_chemistry: number
          teammate_player_id: string
          unselfishness: number
        }
        Insert: {
          coachability: number
          communication: number
          created_at?: string
          defense: number
          effort: number
          evaluator_player_id: string
          game_id: string
          id?: string
          leadership: number
          team_chemistry: number
          teammate_player_id: string
          unselfishness: number
        }
        Update: {
          coachability?: number
          communication?: number
          created_at?: string
          defense?: number
          effort?: number
          evaluator_player_id?: string
          game_id?: string
          id?: string
          leadership?: number
          team_chemistry?: number
          teammate_player_id?: string
          unselfishness?: number
        }
        Relationships: [
          {
            foreignKeyName: "teammate_evaluations_evaluator_player_id_fkey"
            columns: ["evaluator_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teammate_evaluations_evaluator_player_id_fkey"
            columns: ["evaluator_player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teammate_evaluations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teammate_evaluations_teammate_player_id_fkey"
            columns: ["teammate_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teammate_evaluations_teammate_player_id_fkey"
            columns: ["teammate_player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          city: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          league_id: string
          leagueapps_team_id: number | null
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          short_name: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          league_id: string
          leagueapps_team_id?: number | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          league_id?: string
          leagueapps_team_id?: number | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      tryout_attendance: {
        Row: {
          id: string
          marked_at: string
          marked_by: string
          notes: string | null
          registration_id: string
          status: string
        }
        Insert: {
          id?: string
          marked_at?: string
          marked_by: string
          notes?: string | null
          registration_id: string
          status: string
        }
        Update: {
          id?: string
          marked_at?: string
          marked_by?: string
          notes?: string | null
          registration_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tryout_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_attendance_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "tryout_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tryout_registrations: {
        Row: {
          created_at: string
          id: string
          player_id: string
          registered_by: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          registered_by: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          registered_by?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tryout_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registrations_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tryout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tryout_sessions: {
        Row: {
          capacity: number
          created_at: string
          created_by: string
          eligibility: string
          ends_at: string
          evaluator_staff_ids: string[]
          id: string
          notes: string | null
          season_id: string
          starts_at: string
          status: string
          venue_id: string | null
        }
        Insert: {
          capacity: number
          created_at?: string
          created_by: string
          eligibility?: string
          ends_at: string
          evaluator_staff_ids?: string[]
          id?: string
          notes?: string | null
          season_id: string
          starts_at: string
          status?: string
          venue_id?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string
          eligibility?: string
          ends_at?: string
          evaluator_staff_ids?: string[]
          id?: string
          notes?: string | null
          season_id?: string
          starts_at?: string
          status?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tryout_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_sessions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tryout_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          activity_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          profile_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          profile_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_levels: {
        Row: {
          current_streak: number
          level: number
          profile_id: string
          updated_at: string
          xp: number
        }
        Insert: {
          current_streak?: number
          level?: number
          profile_id: string
          updated_at?: string
          xp?: number
        }
        Update: {
          current_streak?: number
          level?: number
          profile_id?: string
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_levels_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          amenities: Json
          city: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          postal_code: string | null
          state: string | null
        }
        Insert: {
          address?: string | null
          amenities?: Json
          city?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          postal_code?: string | null
          state?: string | null
        }
        Update: {
          address?: string | null
          amenities?: Json
          city?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          postal_code?: string | null
          state?: string | null
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          profile_id: string
          reason: string
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          profile_id: string
          reason: string
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          profile_id?: string
          reason?: string
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leagueapps_mens_registrations: {
        Row: {
          created_at: string | null
          external_id: string | null
          id: string | null
          last_updated: number | null
          payload: Json | null
          resource: string | null
          synced_at: string | null
        }
        Relationships: []
      }
      public_player_iq: {
        Row: {
          community_popularity_score: number | null
          court_performance_score: number | null
          exposure_index: number | null
          games_evaluated: number | null
          growth_consistency_score: number | null
          last_calculated_at: string | null
          player_archetype: string | null
          player_id: string | null
          previous_rating: number | null
          rating_change: number | null
          rating_trend: string | null
          rcl_rating: number | null
          skill_profile_score: number | null
          teammate_grade_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_iq_profiles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_iq_profiles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
        ]
      }
      public_players: {
        Row: {
          first_name: string | null
          height_inches: number | null
          hometown: string | null
          id: string | null
          is_active: boolean | null
          jersey_number: string | null
          last_name: string | null
          photo_url: string | null
          position: string | null
        }
        Insert: {
          first_name?: string | null
          height_inches?: number | null
          hometown?: string | null
          id?: string | null
          is_active?: boolean | null
          jersey_number?: string | null
          last_name?: string | null
          photo_url?: string | null
          position?: string | null
        }
        Update: {
          first_name?: string | null
          height_inches?: number | null
          hometown?: string | null
          id?: string | null
          is_active?: boolean | null
          jersey_number?: string | null
          last_name?: string | null
          photo_url?: string | null
          position?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_shop_inventory: {
        Args: {
          adjustment_reason: string
          quantity_delta: number
          target_variant: string
        }
        Returns: {
          color: string | null
          created_at: string
          id: string
          inventory: number
          name: string
          product_id: string
          reserved: number
          size: string | null
          sku: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "product_variants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      award_xp: {
        Args: {
          source_kind?: string
          source_uuid?: string
          target_profile_id: string
          xp_amount: number
          xp_reason: string
        }
        Returns: {
          current_streak: number
          level: number
          profile_id: string
          updated_at: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "user_levels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_fantasy_points: {
        Args: {
          assists: number
          blocks: number
          points: number
          rebounds: number
          rules?: Json
          steals: number
          turnovers: number
        }
        Returns: number
      }
      can_manage_game: { Args: { target_game_id: string }; Returns: boolean }
      complete_lab_session: {
        Args: { target_session: string }
        Returns: {
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          profile_id: string
          skill: string
          source: string
          status: string
          title: string
          workout: Json
        }
        SetofOptions: {
          from: "*"
          to: "lab_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_draft_order: {
        Args: { ordered_teams: string[]; target_draft: string }
        Returns: undefined
      }
      finalize_game_scorebook: {
        Args: { target_game_id: string }
        Returns: {
          away_score: number
          away_team_id: string
          created_at: string
          created_by: string | null
          division_id: string | null
          home_score: number
          home_team_id: string
          id: string
          leagueapps_game_id: number | null
          notes: string | null
          period_count: number
          period_length_seconds: number
          scheduled_at: string
          scorebook_mode: string
          scorebook_status: string
          season_id: string
          shot_clock_seconds: number | null
          status: Database["public"]["Enums"]["game_status"]
          updated_at: string
          venue_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_game_iq_access: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_coach_of_team: { Args: { target_team_id: string }; Returns: boolean }
      is_commissioner: { Args: { target_league_id: string }; Returns: boolean }
      is_community_member: {
        Args: { target_community_id: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { target_conversation_id: string }
        Returns: boolean
      }
      is_game_iq_admin: { Args: never; Returns: boolean }
      is_staff_or_admin: { Args: never; Returns: boolean }
      level_for_xp: { Args: { total_xp: number }; Returns: number }
      log_action: {
        Args: {
          action_reason?: string
          action_text: string
          details_text: string
          next_state?: Json
          previous_state?: Json
          target_resource_id?: string
          target_resource_type?: string
          target_user_id: string
        }
        Returns: undefined
      }
      manage_draft_clock: {
        Args: {
          target_action: string
          target_draft: string
          target_extension_seconds?: number
        }
        Returns: {
          clock_deadline_at: string | null
          clock_duration_seconds: number
          clock_remaining_seconds: number | null
          clock_started_at: string | null
          created_at: string
          created_by: string
          current_pick: number
          id: string
          name: string
          roster_limit: number
          rounds: number
          season_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "drafts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      materialize_leagueapps_players: {
        Args: never
        Returns: {
          eligible: number
          inserted: number
          updated: number
        }[]
      }
      materialize_leagueapps_structure: { Args: never; Returns: Json }
      rebuild_game_lineups: {
        Args: { target_game_id: string }
        Returns: undefined
      }
      rebuild_game_stats: {
        Args: { target_game_id: string }
        Returns: undefined
      }
      rebuild_season_standings: {
        Args: { target_season_id: string }
        Returns: undefined
      }
      rebuild_standings: {
        Args: { target_division_id?: string; target_season_id: string }
        Returns: undefined
      }
      record_draft_pick: {
        Args: {
          target_draft: string
          target_player: string
          target_team: string
        }
        Returns: {
          draft_id: string
          id: string
          pick_number: number
          player_id: string
          round_number: number
          selected_at: string
          selected_by: string
          team_id: string
        }
        SetofOptions: {
          from: "*"
          to: "draft_picks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_game_event: {
        Args: {
          p_clock_seconds: number
          p_event_type: string
          p_foul_type?: string
          p_metadata?: Json
          p_period_number: number
          p_player_id?: string
          p_player_in_id?: string
          p_player_out_id?: string
          p_points?: number
          p_secondary_player_id?: string
          p_shot_result?: string
          p_shot_value?: number
          p_shot_x?: number
          p_shot_y?: number
          p_shot_zone?: string
          p_team_id?: string
          p_turnover_type?: string
          target_game_id: string
        }
        Returns: {
          clock_seconds: number
          created_at: string
          created_by: string | null
          event_type: string
          foul_type: string | null
          game_id: string
          id: string
          metadata: Json
          period_number: number
          player_id: string | null
          player_in_id: string | null
          player_out_id: string | null
          points: number
          secondary_player_id: string | null
          sequence_no: number
          shot_result: string | null
          shot_value: number | null
          shot_x: number | null
          shot_y: number | null
          shot_zone: string | null
          team_id: string | null
          turnover_type: string | null
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "game_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_substitution: {
        Args: {
          target_clock_seconds: number
          target_game_id: string
          target_period: number
          target_player_in: string
          target_player_out: string
          target_team_id: string
        }
        Returns: {
          clock_seconds: number
          created_at: string
          created_by: string | null
          event_type: string
          foul_type: string | null
          game_id: string
          id: string
          metadata: Json
          period_number: number
          player_id: string | null
          player_in_id: string | null
          player_out_id: string | null
          points: number
          secondary_player_id: string | null
          sequence_no: number
          shot_result: string | null
          shot_value: number | null
          shot_x: number | null
          shot_y: number | null
          shot_zone: string | null
          team_id: string | null
          turnover_type: string | null
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "game_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refresh_lab_proof: {
        Args: { target_profile: string }
        Returns: undefined
      }
      register_for_tryout: {
        Args: { target_player: string; target_session: string }
        Returns: {
          created_at: string
          id: string
          player_id: string
          registered_by: string
          session_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tryout_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rep_progress: {
        Args: { total_xp: number }
        Returns: {
          level: number
          level_start: number
          next_level_xp: number
          progress: number
        }[]
      }
      rep_status_for_level: { Args: { target_level: number }; Returns: string }
      set_starting_lineup: {
        Args: {
          target_game_id: string
          target_period: number
          target_player_ids: string[]
          target_team_id: string
        }
        Returns: {
          clock_seconds: number
          created_at: string
          created_by: string | null
          event_type: string
          foul_type: string | null
          game_id: string
          id: string
          metadata: Json
          period_number: number
          player_id: string | null
          player_in_id: string | null
          player_out_id: string | null
          points: number
          secondary_player_id: string | null
          sequence_no: number
          shot_result: string | null
          shot_value: number | null
          shot_x: number | null
          shot_y: number | null
          shot_zone: string | null
          team_id: string | null
          turnover_type: string | null
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "game_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      share_lab_achievement: {
        Args: { achievement_body: string; achievement_title: string }
        Returns: string
      }
      start_direct_conversation: {
        Args: { target_profile_id: string }
        Returns: string
      }
      void_game_event: {
        Args: { target_event_id: string }
        Returns: {
          clock_seconds: number
          created_at: string
          created_by: string | null
          event_type: string
          foul_type: string | null
          game_id: string
          id: string
          metadata: Json
          period_number: number
          player_id: string | null
          player_in_id: string | null
          player_out_id: string | null
          points: number
          secondary_player_id: string | null
          sequence_no: number
          shot_result: string | null
          shot_value: number | null
          shot_x: number | null
          shot_y: number | null
          shot_zone: string | null
          team_id: string | null
          turnover_type: string | null
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "game_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      xp_for_level: { Args: { target_level: number }; Returns: number }
    }
    Enums: {
      app_role: "player" | "coach" | "staff" | "admin" | "fan"
      content_status: "draft" | "published" | "archived"
      game_status:
        | "scheduled"
        | "live"
        | "completed"
        | "cancelled"
        | "postponed"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "waived"
      registration_status:
        | "pending"
        | "approved"
        | "waitlisted"
        | "rejected"
        | "cancelled"
      season_status:
        | "draft"
        | "registration"
        | "active"
        | "completed"
        | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["player", "coach", "staff", "admin", "fan"],
      content_status: ["draft", "published", "archived"],
      game_status: ["scheduled", "live", "completed", "cancelled", "postponed"],
      payment_status: ["pending", "paid", "failed", "refunded", "waived"],
      registration_status: [
        "pending",
        "approved",
        "waitlisted",
        "rejected",
        "cancelled",
      ],
      season_status: [
        "draft",
        "registration",
        "active",
        "completed",
        "archived",
      ],
    },
  },
} as const
