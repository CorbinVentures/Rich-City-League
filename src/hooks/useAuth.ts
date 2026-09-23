import { useState, useEffect, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseRecoveryClient } from '@/lib/supabase';
import { getSupabaseConfig, getSupabaseConfigMessage } from '@/lib/supabase-config';
import { Profile } from '@/types';

const PRODUCTION_SITE_URL = 'https://richcityhoops.com';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

function getAuthSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (configuredSiteUrl === PRODUCTION_SITE_URL) return configuredSiteUrl;
  if (typeof window !== 'undefined' && LOCAL_HOSTNAMES.has(window.location.hostname)) {
    return window.location.origin.replace(/\/$/, '');
  }
  return PRODUCTION_SITE_URL;
}

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

function getRecoveryUrlState() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return (
    params.get('type') === 'recovery' ||
    hashParams.get('type') === 'recovery' ||
    Boolean(params.get('code')) ||
    Boolean(params.get('token_hash'))
  );
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
      return () => { mounted = false; };
    }
    if (!supabase) {
      setError(getSupabaseUnavailableMessage());
      setLoading(false);
      setRecoveryLoading(false);
      return () => { mounted = false; };
    }

    let requestId = 0;
    let recoveryFlow = getRecoveryUrlState();
    if (recoveryFlow) setRecoverySession(true);

    const loadProfile = async (currentUser: User | null, currentRequestId: number) => {
      if (!currentUser || recoveryFlow) {
        if (mounted && currentRequestId === requestId) setProfile(null);
        return;
      }
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      if (mounted && currentRequestId === requestId) {
        if (!profileData) {
          setProfile(null);
          return;
        }
        const visibility = profileData.profile_visibility;
        setProfile({
          ...profileData,
          profile_visibility: visibility === 'public' || visibility === 'friends' || visibility === 'private' ? visibility : undefined,
        });
      }
    };

    const applySession = async (currentUser: User | null, event?: string) => {
      const currentRequestId = ++requestId;
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        recoveryFlow = true;
        setRecoverySession(true);
        setUser(null);
        setProfile(null);
        setRecoveryLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        recoveryFlow = false;
        setRecoverySession(false);
      }

      if (recoveryFlow) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(currentUser);
      try {
        await loadProfile(currentUser, currentRequestId);
      } catch (err) {
        if (!mounted || currentRequestId !== requestId) return;
        console.error('Unable to load profile', err);
        setError('Unable to load your profile.');
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (recoveryFlow && event !== 'SIGNED_OUT') {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          setRecoverySession(true);
          setUser(null);
          setProfile(null);
          setRecoveryLoading(false);
        }
        return;
      }
      void applySession(session?.user ?? null, event);
    });

    const getUser = async () => {
      try {
        if (!recoveryFlow) {
          const { data } = await supabase.auth.getUser();
          if (!mounted) return;
          await applySession(data.user);
        } else {
          setRecoverySession(true);
          setUser(null);
          setProfile(null);
        }

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

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    try {
      setError(null);
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${getAuthSiteUrl()}/auth/sign-in`, data: metadata },
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
      setRecoverySession(false);
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Unable to sign out.'));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase) throw new Error(getSupabaseUnavailableMessage());
    setError(null);
    const recoveryClient = getSupabaseRecoveryClient();
    if (!recoveryClient) throw new Error(getSupabaseUnavailableMessage());
    const redirectTo = `${getAuthSiteUrl()}/auth/confirm`;
    const { error } = await recoveryClient.auth.resetPasswordForEmail(email, { redirectTo });
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
      setError('Unable to resend the email confirmation. Please try again later.');
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
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRecoverySession(false);
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
