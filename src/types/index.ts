export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  role?: 'player' | 'coach' | 'fan' | 'staff' | 'admin' | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}
