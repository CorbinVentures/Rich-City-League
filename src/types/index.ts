export interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  role?: 'player' | 'coach' | 'staff' | 'admin' | null;
  created_at?: string;
  updated_at?: string;
}
