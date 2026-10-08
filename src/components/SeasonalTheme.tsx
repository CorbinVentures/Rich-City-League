'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  DEFAULT_SEASONAL_THEME_CONFIG,
  parseSeasonalThemeConfig,
  resolveSeasonalTheme,
  type SeasonalThemeConfig,
} from '@/lib/seasonal-themes';

const SETTING_KEY = 'seasonal_theme_config';

export function SeasonalTheme() {
  const supabase = useMemo(() => getSupabaseClient(true), []);
  const [config, setConfig] = useState<SeasonalThemeConfig>(DEFAULT_SEASONAL_THEME_CONFIG);
  const theme = resolveSeasonalTheme(config);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!supabase) return;
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();

      if (active && data?.value) setConfig(parseSeasonalThemeConfig(data.value));
    }

    void load();

    const onLocalConfig = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      setConfig(parseSeasonalThemeConfig(detail));
    };
    window.addEventListener('rcl-seasonal-theme-config', onLocalConfig);

    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    if (supabase) {
      channel = supabase
        .channel('rcl_seasonal_theme_config')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_settings', filter: `key=eq.${SETTING_KEY}` },
          (payload) => {
            const value = (payload.new as { value?: unknown } | null)?.value;
            if (value) setConfig(parseSeasonalThemeConfig(value));
          },
        )
        .subscribe();
    }

    return () => {
      active = false;
      window.removeEventListener('rcl-seasonal-theme-config', onLocalConfig);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    const root = document.documentElement;

    if (!theme || config.mode === 'off') {
      delete root.dataset.seasonTheme;
      delete root.dataset.seasonIntensity;
      delete root.dataset.seasonEffects;
      root.style.removeProperty('--season-accent');
      root.style.removeProperty('--season-accent-2');
      root.style.removeProperty('--season-glow');
      return;
    }

    root.dataset.seasonTheme = theme.id;
    root.dataset.seasonIntensity = config.intensity;
    root.dataset.seasonEffects = config.effects ? 'on' : 'off';
    root.style.setProperty('--season-accent', theme.accent);
    root.style.setProperty('--season-accent-2', theme.accent2);
    root.style.setProperty('--season-glow', theme.glow);

    return () => {
      delete root.dataset.seasonTheme;
      delete root.dataset.seasonIntensity;
      delete root.dataset.seasonEffects;
      root.style.removeProperty('--season-accent');
      root.style.removeProperty('--season-accent-2');
      root.style.removeProperty('--season-glow');
    };
  }, [theme, config.effects, config.intensity, config.mode]);

  return (
    <div
      className="rcl-seasonal-atmosphere"
      data-active-theme={theme?.id ?? 'none'}
      aria-hidden="true"
    >
      <span className="rcl-seasonal-glow rcl-seasonal-glow-a" />
      <span className="rcl-seasonal-glow rcl-seasonal-glow-b" />
      <span className="rcl-seasonal-particles">
        {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
      </span>
    </div>
  );
}
