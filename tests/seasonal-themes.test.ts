import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEASONAL_THEME_CONFIG,
  parseSeasonalThemeConfig,
  resolveSeasonalTheme,
  type SeasonalThemeConfig,
} from '../src/lib/seasonal-themes';

const at = (isoDate: string) => new Date(`${isoDate}T16:00:00.000Z`);

describe('seasonal theme calendar', () => {
  it.each([
    ['2026-02-05', 'black-history'],
    ['2026-02-12', 'valentines'],
    ['2026-03-16', 'st-patricks'],
    ['2027-03-27', 'easter'],
    ['2027-05-29', 'memorial-day'],
    ['2026-06-18', 'juneteenth'],
    ['2026-07-04', 'july-fourth'],
    ['2026-10-20', 'halloween'],
    ['2026-10-31', 'halloween'],
    ['2026-11-23', 'thanksgiving'],
    ['2026-11-29', 'thanksgiving'],
    ['2026-12-10', 'christmas'],
    ['2026-12-30', 'new-year'],
    ['2027-01-02', 'new-year'],
  ])('resolves %s to %s in Eastern time', (date, expected) => {
    expect(resolveSeasonalTheme(DEFAULT_SEASONAL_THEME_CONFIG, at(date))?.id).toBe(expected);
  });

  it.each(['2026-01-10', '2026-03-20', '2026-10-03', '2027-01-03'])(
    'keeps the core RCH theme outside scheduled windows on %s',
    (date) => {
      expect(resolveSeasonalTheme(DEFAULT_SEASONAL_THEME_CONFIG, at(date))).toBeNull();
    },
  );

  it('lets specific holidays override broad month-long themes', () => {
    expect(resolveSeasonalTheme(DEFAULT_SEASONAL_THEME_CONFIG, at('2026-02-11'))?.id).toBe('valentines');
    expect(resolveSeasonalTheme(DEFAULT_SEASONAL_THEME_CONFIG, at('2026-02-20'))?.id).toBe('black-history');
  });

  it('supports a platform-wide manual override', () => {
    const config: SeasonalThemeConfig = {
      ...DEFAULT_SEASONAL_THEME_CONFIG,
      mode: 'manual',
      manualTheme: 'halloween',
    };
    expect(resolveSeasonalTheme(config, at('2026-10-03'))?.id).toBe('halloween');
  });

  it('supports turning seasonal presentation off entirely', () => {
    const config: SeasonalThemeConfig = { ...DEFAULT_SEASONAL_THEME_CONFIG, mode: 'off' };
    expect(resolveSeasonalTheme(config, at('2026-12-24'))).toBeNull();
  });

  it('skips disabled themes without breaking the rest of the calendar', () => {
    const config: SeasonalThemeConfig = {
      ...DEFAULT_SEASONAL_THEME_CONFIG,
      disabledThemes: ['halloween'],
    };
    expect(resolveSeasonalTheme(config, at('2026-10-25'))).toBeNull();
    expect(resolveSeasonalTheme(config, at('2026-12-12'))?.id).toBe('christmas');
  });

  it('sanitizes invalid persisted configuration', () => {
    expect(parseSeasonalThemeConfig({ mode: 'nonsense', intensity: 'wild', effects: false })).toEqual({
      ...DEFAULT_SEASONAL_THEME_CONFIG,
      effects: false,
    });
  });
});
