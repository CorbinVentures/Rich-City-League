'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaCalendarDays, FaCheck, FaCircleExclamation, FaGear } from 'react-icons/fa6';
import { AdminWorkspace } from '@/components/AdminWorkspace';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  DEFAULT_SEASONAL_THEME_CONFIG,
  SEASONAL_THEMES,
  parseSeasonalThemeConfig,
  resolveSeasonalTheme,
  type SeasonalThemeConfig,
  type SeasonalThemeId,
  type SeasonalThemeIntensity,
  type SeasonalThemeMode,
} from '@/lib/seasonal-themes';

const SETTING_KEY = 'seasonal_theme_config';

function nextAutomaticTheme(config: SeasonalThemeConfig) {
  const automatic: SeasonalThemeConfig = { ...config, mode: 'automatic', manualTheme: null };
  const today = new Date();
  const current = resolveSeasonalTheme(automatic, today)?.id ?? null;

  for (let offset = 1; offset <= 400; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    const theme = resolveSeasonalTheme(automatic, candidate);
    if (theme && theme.id !== current) return { theme, date: candidate };
  }
  return null;
}

export default function SeasonalThemesAdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const isAdmin = profile?.role === 'admin';
  const [config, setConfig] = useState<SeasonalThemeConfig>(DEFAULT_SEASONAL_THEME_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const activeTheme = resolveSeasonalTheme(config);
  const nextTheme = useMemo(() => nextAutomaticTheme(config), [config]);

  const preview = useCallback((next: SeasonalThemeConfig) => {
    setConfig(next);
    window.dispatchEvent(new CustomEvent('rcl-seasonal-theme-config', { detail: next }));
  }, []);

  useEffect(() => {
    async function load() {
      if (!db || !isAdmin) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error: loadError } = await db
        .from('site_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();

      if (loadError) setError(loadError.message);
      const next = parseSeasonalThemeConfig(data?.value ?? DEFAULT_SEASONAL_THEME_CONFIG);
      setConfig(next);
      window.dispatchEvent(new CustomEvent('rcl-seasonal-theme-config', { detail: next }));
      setLoading(false);
    }

    if (!authLoading) void load();
  }, [authLoading, db, isAdmin]);

  function setMode(mode: SeasonalThemeMode) {
    const manualTheme = mode === 'manual' ? (config.manualTheme ?? 'halloween') : config.manualTheme;
    preview({ ...config, mode, manualTheme });
  }

  function setManualTheme(manualTheme: SeasonalThemeId) {
    preview({ ...config, mode: 'manual', manualTheme });
  }

  function setIntensity(intensity: SeasonalThemeIntensity) {
    preview({ ...config, intensity });
  }

  function toggleTheme(id: SeasonalThemeId) {
    const disabledThemes = config.disabledThemes.includes(id)
      ? config.disabledThemes.filter((themeId) => themeId !== id)
      : [...config.disabledThemes, id];
    preview({ ...config, disabledThemes });
  }

  async function save() {
    if (!db || !user || !isAdmin) return;
    setSaving(true);
    setMessage('');
    setError('');

    const { error: saveError } = await db
      .from('site_settings')
      .upsert({ key: SETTING_KEY, value: config }, { onConflict: 'key' });

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    await db.from('audit_logs').insert({
      user_id: user.id,
      action: 'ADMIN_SEASONAL_THEME_CONFIG',
      details: `Seasonal theme mode set to ${config.mode}; manual=${config.manualTheme ?? 'none'}; intensity=${config.intensity}`,
    });

    setMessage('Seasonal theme settings are live.');
    window.dispatchEvent(new CustomEvent('rcl-seasonal-theme-config', { detail: config }));
    setSaving(false);
  }

  if (authLoading || loading) {
    return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="xl" className="py-10"><div className="h-40 animate-pulse rounded-3xl border border-white/10 bg-white/[.03]" /></Container></main>;
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#03070d] text-white">
        <Container maxWidth="lg" className="py-16 text-center">
          <FaCircleExclamation className="mx-auto text-3xl text-rcl-orange" />
          <h1 className="mt-4 font-display text-3xl font-black uppercase">Admin access required</h1>
          <Link href="/" className="mt-6 inline-flex rounded-xl border border-white/10 px-5 py-3 text-xs font-black uppercase">Return home</Link>
        </Container>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#03070d] pb-28 text-white">
      <Container maxWidth="xl" className="py-8 sm:py-10">
        <AdminWorkspace />

        <div className="mt-8 flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin/control-center" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-white/45 hover:text-white">
              <FaArrowLeft /> Site Control
            </Link>
            <p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-rcl-orange">Automatic presentation system</p>
            <h1 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Seasonal Themes</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
              Keep the RCH interface intact while the accent lighting, atmosphere and selected visual effects automatically change around key holidays.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.025] px-5 py-4 lg:min-w-72">
            <p className="text-[11px] font-black uppercase tracking-[.2em] text-white/35">Current presentation</p>
            <p className="mt-2 font-display text-xl font-black uppercase">{activeTheme?.name ?? 'Core RCH theme'}</p>
            <p className="mt-1 text-xs text-white/40">
              {config.mode === 'off' ? 'Seasonal system is off.' : config.mode === 'manual' ? 'Manual override is active.' : 'Following the automatic calendar.'}
            </p>
          </div>
        </div>

        {message && <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-4 text-sm text-emerald-100"><FaCheck />{message}</div>}
        {error && <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/[.06] p-4 text-sm text-red-100"><FaCircleExclamation />{error}</div>}

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-orange/10 text-rcl-orange"><FaGear /></span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.2em] text-white/35">Control mode</p>
                <h2 className="font-display text-2xl font-black uppercase">How themes activate</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {([
                ['automatic', 'Automatic', 'Switch from the RCH calendar.'],
                ['manual', 'Manual', 'Force one theme platform-wide.'],
                ['off', 'Off', 'Always use the core RCH design.'],
              ] as const).map(([mode, label, detail]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMode(mode)}
                  className={`rounded-2xl border p-4 text-left transition ${config.mode === mode ? 'border-rcl-orange/50 bg-rcl-orange/10' : 'border-white/10 bg-black/20 hover:border-white/20'}`}
                >
                  <span className="font-display text-lg font-black uppercase">{label}</span>
                  <span className="mt-2 block text-xs leading-5 text-white/40">{detail}</span>
                </button>
              ))}
            </div>

            {config.mode === 'manual' && (
              <div className="mt-6">
                <label htmlFor="manual-season-theme" className="text-xs font-black uppercase tracking-[.16em] text-white/45">Manual theme</label>
                <select
                  id="manual-season-theme"
                  value={config.manualTheme ?? ''}
                  onChange={(event) => setManualTheme(event.target.value as SeasonalThemeId)}
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#06111c] px-4 text-sm font-bold text-white outline-none focus:border-rcl-orange/50"
                >
                  {SEASONAL_THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
                </select>
              </div>
            )}

            <div className="mt-7 border-t border-white/10 pt-6">
              <p className="text-xs font-black uppercase tracking-[.16em] text-white/45">Visual intensity</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['subtle', 'standard', 'bold'] as SeasonalThemeIntensity[]).map((intensity) => (
                  <button
                    type="button"
                    key={intensity}
                    onClick={() => setIntensity(intensity)}
                    className={`min-h-11 rounded-xl border px-4 text-xs font-black uppercase tracking-wider ${config.intensity === intensity ? 'border-rcl-orange/50 bg-rcl-orange/10 text-rcl-orange' : 'border-white/10 bg-black/20 text-white/45'}`}
                  >
                    {intensity}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => preview({ ...config, effects: !config.effects })}
                aria-pressed={config.effects}
                className="mt-5 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 text-left"
              >
                <span>
                  <strong className="block text-sm font-black uppercase">Atmospheric motion</strong>
                  <small className="mt-1 block text-xs leading-5 text-white/40">Snow, fog and celebration sparks. Reduced-motion device settings still take priority.</small>
                </span>
                <span className={`relative h-7 w-12 shrink-0 rounded-full border transition ${config.effects ? 'border-rcl-orange/50 bg-rcl-orange' : 'border-white/15 bg-white/10'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${config.effects ? 'left-6' : 'left-1'}`} />
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-orange/10 text-rcl-orange"><FaCalendarDays /></span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.2em] text-white/35">Schedule</p>
                <h2 className="font-display text-2xl font-black uppercase">What happens next</h2>
              </div>
            </div>

            {nextTheme ? (
              <div className="mt-6 rounded-2xl border border-rcl-orange/20 bg-rcl-orange/[.06] p-5">
                <p className="text-[11px] font-black uppercase tracking-[.18em] text-rcl-orange">Next automatic theme</p>
                <p className="mt-2 font-display text-2xl font-black uppercase">{nextTheme.theme.name}</p>
                <p className="mt-2 text-sm text-white/50">{nextTheme.theme.scheduleLabel}</p>
              </div>
            ) : (
              <p className="mt-6 text-sm text-white/45">No enabled seasonal window was found in the next year.</p>
            )}

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase tracking-[.16em] text-white/50">Safety rails</p>
              <p className="mt-2 text-xs leading-5 text-white/38">
                Holiday styling changes accents and ambient effects only. Core surfaces, typography and contrast remain locked to the approved RCH interface.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Theme calendar</p>
              <h2 className="mt-2 font-display text-3xl font-black uppercase">Holiday lineup</h2>
            </div>
            <p className="hidden text-xs text-white/35 sm:block">Disable any theme without changing code.</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SEASONAL_THEMES.map((theme) => {
              const disabled = config.disabledThemes.includes(theme.id);
              return (
                <article key={theme.id} className={`rounded-3xl border p-5 transition ${disabled ? 'border-white/5 bg-white/[.015] opacity-55' : 'border-white/10 bg-white/[.03]'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[.16em] text-white/35">{theme.scheduleLabel}</p>
                      <h3 className="mt-2 font-display text-xl font-black uppercase">{theme.name}</h3>
                    </div>
                    <span
                      className="h-8 w-8 shrink-0 rounded-full border border-white/10"
                      style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` }}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-3 min-h-12 text-xs leading-5 text-white/42">{theme.description}</p>
                  <button
                    type="button"
                    onClick={() => toggleTheme(theme.id)}
                    className={`mt-5 min-h-10 rounded-xl border px-4 text-xs font-black uppercase tracking-wider ${disabled ? 'border-white/10 text-white/55' : 'border-rcl-orange/30 bg-rcl-orange/[.06] text-rcl-orange'}`}
                  >
                    {disabled ? 'Enable theme' : 'Enabled'}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <div className="sticky bottom-4 z-40 mt-8 rounded-2xl border border-white/10 bg-[#06111c]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase">Ready to publish</p>
              <p className="mt-1 text-xs text-white/40">Changes above are previewed in this browser. Save makes them global.</p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="min-h-12 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-[.14em] text-black disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save seasonal settings'}
            </button>
          </div>
        </div>
      </Container>
    </main>
  );
}
