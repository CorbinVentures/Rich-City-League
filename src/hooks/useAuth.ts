import { useState, useEffect, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import { getSupabaseConfig, getSupabaseConfigMessage } from '@/lib/supabase-config';
import { Profile } from '@/types';

function getSupabaseUnavailableMessage() {
  const status = getSupabaseConfig().status;
  return status === 'configured'
    ? 'Supabase client could not be initialized. Check the public URL and anon key.'
    : getSupabaseConfigMessage(status);
}

export function useAuth() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const config = getSupabaseConfig();
    if (config.status !== 'configured') {
      setError(getSupabaseConfigMessage(config.status));
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    if (!supabase) {
      setError(getSupabaseUnavailableMessage());
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const loadProfile = async (currentUser: User | null) => {
      if (!currentUser) {
        if (mounted) setProfile(null);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      if (mounted) setProfile(profileData);
    };

    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setUser(data.user);
        await loadProfile(data.user);
      } catch (err) {
        console.error('Unable to load session', err);
        if (mounted) setError('Unable to load your session.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null).catch((err: unknown) => {
        console.error('Unable to load profile', err);
        if (mounted) setError('Unable to load your profile.');
      });
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    if (typeof window === 'undefined') throw new Error('Password recovery is only available in the browser.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) {
      setError('Unable to send the password reset email.');
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError('Unable to update your password.');
      throw error;
    }
  };

  return {
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };
}
