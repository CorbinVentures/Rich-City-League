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

function getAuthErrorMessage(error: unknown, fallback: string) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) return 'Invalid email or password.';
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (code === 'user_banned') return 'This account is unavailable. Contact the league administrator.';
  if (message.includes('password')) return 'Use a password with at least 8 characters.';
  return fallback;
}

export function useAuth() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoverySession, setRecoverySession] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const config = getSupabaseConfig();
    if (config.status !== 'configured') {
      setError(getSupabaseConfigMessage(config.status));
      setLoading(false);
      setRecoveryLoading(false);
      return () => {
        mounted = false;
      };
    }
    if (!supabase) {
      setError(getSupabaseUnavailableMessage());
      setLoading(false);
      setRecoveryLoading(false);
      return () => {
        mounted = false;
      };
    }

    let requestId = 0;

    const loadProfile = async (currentUser: User | null, currentRequestId: number) => {
      if (!currentUser) {
        if (mounted && currentRequestId === requestId) setProfile(null);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      if (mounted && currentRequestId === requestId) setProfile(profileData);
    };

    const applySession = async (currentUser: User | null, event?: string) => {
      const currentRequestId = ++requestId;
      if (!mounted) return;
      setUser(currentUser);
      if (event === 'PASSWORD_RECOVERY') setRecoverySession(true);
      if (event === 'SIGNED_OUT') setRecoverySession(false);
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_OUT') setRecoveryLoading(false);
      try {
        await loadProfile(currentUser, currentRequestId);
      } catch (err) {
        if (!mounted || currentRequestId !== requestId) return;
        console.error('Unable to load profile', err);
        setError('Unable to load your profile.');
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      void applySession(session?.user ?? null, event);
    });

    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        await applySession(data.user);
        if (mounted) setRecoveryLoading(false);
      } catch (err) {
        console.error('Unable to load session', err);
        if (mounted) {
          setError('Unable to load your session.');
          setRecoveryLoading(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getUser();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    try {
      setError(null);
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      setUser(data.user);
      return data;
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Unable to create your account.'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    try {
      setError(null);
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setUser(data.user);
      return data;
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Unable to sign in.'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    try {
      setError(null);
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Unable to sign out.'));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    if (typeof window === 'undefined') throw new Error('Password recovery is only available in the browser.');
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) {
      setError('Unable to send the password reset email.');
      throw error;
    }
  };

  const resendConfirmation = async (email: string) => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    setError(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      setError('Unable to resend the confirmation email. Please try again later.');
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    setError(null);
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
    recoverySession,
    recoveryLoading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    resendConfirmation,
    updatePassword,
  };
}
