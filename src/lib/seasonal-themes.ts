export type SeasonalThemeId =
  | 'black-history'
  | 'valentines'
  | 'st-patricks'
  | 'easter'
  | 'memorial-day'
  | 'juneteenth'
  | 'july-fourth'
  | 'halloween'
  | 'thanksgiving'
  | 'christmas'
  | 'new-year';

export type SeasonalThemeMode = 'automatic' | 'manual' | 'off';
export type SeasonalThemeIntensity = 'subtle' | 'standard' | 'bold';

export type SeasonalThemeConfig = {
  mode: SeasonalThemeMode;
  manualTheme: SeasonalThemeId | null;
  intensity: SeasonalThemeIntensity;
  effects: boolean;
  disabledThemes: SeasonalThemeId[];
};

export type SeasonalThemeDefinition = {
  id: SeasonalThemeId;
  name: string;
  shortName: string;
  description: string;
  scheduleLabel: string;
  accent: string;
  accent2: string;
  glow: string;
};

export const DEFAULT_SEASONAL_THEME_CONFIG: SeasonalThemeConfig = {
  mode: 'automatic',
  manualTheme: null,
  intensity: 'standard',
  effects: true,
  disabledThemes: [],
};

export const SEASONAL_THEMES: SeasonalThemeDefinition[] = [
  {
    id: 'black-history',
    name: 'Black History Month',
    shortName: 'Black History',
    description: 'Black, gold, red and green accents honoring basketball culture, history and community.',
    scheduleLabel: 'February 1–29',
    accent: '#F4C95D',
    accent2: '#2EA44F',
    glow: 'rgba(244, 201, 93, .22)',
  },
  {
    id: 'valentines',
    name: 'Love of the Game',
    shortName: 'Valentine’s',
    description: 'Deep red and pink accents built around the love of basketball.',
    scheduleLabel: 'February 10–14',
    accent: '#FF6B8A',
    accent2: '#FF3D6E',
    glow: 'rgba(255, 107, 138, .22)',
  },
  {
    id: 'st-patricks',
    name: 'Lucky Run',
    shortName: 'St. Patrick’s',
    description: 'Emerald accents and a light lucky-shot atmosphere.',
    scheduleLabel: 'March 15–17',
    accent: '#5FD18A',
    accent2: '#19A15F',
    glow: 'rgba(95, 209, 138, .2)',
  },
  {
    id: 'easter',
    name: 'Spring Hoops',
    shortName: 'Easter / Spring',
    description: 'A restrained spring palette with soft pastel arena light.',
    scheduleLabel: 'Good Friday–Easter Monday',
    accent: '#9ED8FF',
    accent2: '#C5A3FF',
    glow: 'rgba(158, 216, 255, .2)',
  },
  {
    id: 'memorial-day',
    name: 'Memorial Day',
    shortName: 'Memorial Day',
    description: 'A respectful red, white and blue treatment with subdued motion.',
    scheduleLabel: 'Memorial Day weekend',
    accent: '#7DB7FF',
    accent2: '#F56C78',
    glow: 'rgba(125, 183, 255, .18)',
  },
  {
    id: 'juneteenth',
    name: 'Juneteenth',
    shortName: 'Juneteenth',
    description: 'Red, gold and green accents with a community-first presentation.',
    scheduleLabel: 'June 17–19',
    accent: '#F4C95D',
    accent2: '#D94B4B',
    glow: 'rgba(244, 201, 93, .2)',
  },
  {
    id: 'july-fourth',
    name: 'Fourth of July',
    shortName: 'July 4',
    description: 'Night-game blue, red accents and restrained firework spark effects.',
    scheduleLabel: 'July 1–5',
    accent: '#60A5FA',
    accent2: '#FF6474',
    glow: 'rgba(96, 165, 250, .22)',
  },
  {
    id: 'halloween',
    name: 'RCH After Dark',
    shortName: 'Halloween',
    description: 'Orange and purple arena lighting, fog and a darker late-night court feel.',
    scheduleLabel: 'October 20–31',
    accent: '#FF8A3D',
    accent2: '#A970FF',
    glow: 'rgba(255, 138, 61, .24)',
  },
  {
    id: 'thanksgiving',
    name: 'RCH Gives Thanks',
    shortName: 'Thanksgiving',
    description: 'Warm amber and copper accents centered on community and gratitude.',
    scheduleLabel: 'Monday before Thanksgiving–Sunday',
    accent: '#F2B35D',
    accent2: '#C9793D',
    glow: 'rgba(242, 179, 93, .2)',
  },
  {
    id: 'christmas',
    name: 'Holiday Hoops',
    shortName: 'Christmas',
    description: 'Evergreen, red and gold arena accents with optional snowfall.',
    scheduleLabel: 'December 1–26',
    accent: '#E6C65C',
    accent2: '#49B675',
    glow: 'rgba(230, 198, 92, .22)',
  },
  {
    id: 'new-year',
    name: 'New Year. New Run.',
    shortName: 'New Year',
    description: 'Midnight blue and gold with celebration sparks for the year transition.',
    scheduleLabel: 'December 29–January 2',
    accent: '#E8C86A',
    accent2: '#71A8FF',
    glow: 'rgba(232, 200, 106, .24)',
  },
];

const THEME_IDS = new Set(SEASONAL_THEMES.map((theme) => theme.id));

function normalizeConfig(value: unknown): SeasonalThemeConfig {
  if (!value || typeof value !== 'object') return DEFAULT_SEASONAL_THEME_CONFIG;
  const input = value as Partial<SeasonalThemeConfig>;
  const mode: SeasonalThemeMode = input.mode === 'manual' || input.mode === 'off' ? input.mode : 'automatic';
  const manualTheme = input.manualTheme && THEME_IDS.has(input.manualTheme) ? input.manualTheme : null;
  const intensity: SeasonalThemeIntensity =
    input.intensity === 'subtle' || input.intensity === 'bold' ? input.intensity : 'standard';
  const disabledThemes = Array.isArray(input.disabledThemes)
    ? input.disabledThemes.filter((id): id is SeasonalThemeId => typeof id === 'string' && THEME_IDS.has(id as SeasonalThemeId))
    : [];

  return {
    mode,
    manualTheme,
    intensity,
    effects: input.effects !== false,
    disabledThemes,
  };
}

export function parseSeasonalThemeConfig(value: unknown): SeasonalThemeConfig {
  return normalizeConfig(value);
}

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

function dateKey(year: number, month: number, day: number) {
  return year * 10000 + month * 100 + day;
}

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

function addUtcDays(parts: { year: number; month: number; day: number }, amount: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((7 + weekday - first) % 7) + (nth - 1) * 7;
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastWeekday = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay();
  return lastDay - ((7 + lastWeekday - weekday) % 7);
}

function matchesAutomaticTheme(id: SeasonalThemeId, year: number, month: number, day: number) {
  const current = dateKey(year, month, day);

  switch (id) {
    case 'new-year':
      return (month === 12 && day >= 29) || (month === 1 && day <= 2);
    case 'black-history':
      return month === 2;
    case 'valentines':
      return month === 2 && day >= 10 && day <= 14;
    case 'st-patricks':
      return month === 3 && day >= 15 && day <= 17;
    case 'easter': {
      const easter = easterSunday(year);
      const start = addUtcDays(easter, -2);
      const end = addUtcDays(easter, 1);
      return current >= dateKey(start.year, start.month, start.day) && current <= dateKey(end.year, end.month, end.day);
    }
    case 'memorial-day': {
      const memorial = lastWeekdayOfMonth(year, 5, 1);
      return month === 5 && day >= memorial - 3 && day <= memorial;
    }
    case 'juneteenth':
      return month === 6 && day >= 17 && day <= 19;
    case 'july-fourth':
      return month === 7 && day >= 1 && day <= 5;
    case 'halloween':
      return month === 10 && day >= 20 && day <= 31;
    case 'thanksgiving': {
      const thanksgiving = nthWeekdayOfMonth(year, 11, 4, 4);
      return month === 11 && day >= thanksgiving - 3 && day <= thanksgiving + 3;
    }
    case 'christmas':
      return month === 12 && day >= 1 && day <= 26;
    default:
      return false;
  }
}

// More specific holidays intentionally take precedence over broad seasonal windows.
const AUTOMATIC_PRIORITY: SeasonalThemeId[] = [
  'new-year',
  'valentines',
  'st-patricks',
  'easter',
  'memorial-day',
  'juneteenth',
  'july-fourth',
  'halloween',
  'thanksgiving',
  'christmas',
  'black-history',
];

export function resolveSeasonalTheme(
  configValue: unknown,
  date = new Date(),
  timeZone = 'America/New_York',
): SeasonalThemeDefinition | null {
  const config = normalizeConfig(configValue);
  if (config.mode === 'off') return null;

  if (config.mode === 'manual') {
    if (!config.manualTheme || config.disabledThemes.includes(config.manualTheme)) return null;
    return SEASONAL_THEMES.find((theme) => theme.id === config.manualTheme) ?? null;
  }

  const { year, month, day } = zonedParts(date, timeZone);
  const themeId = AUTOMATIC_PRIORITY.find(
    (id) => !config.disabledThemes.includes(id) && matchesAutomaticTheme(id, year, month, day),
  );

  return themeId ? SEASONAL_THEMES.find((theme) => theme.id === themeId) ?? null : null;
}

export function getSeasonalThemeById(id: SeasonalThemeId | null | undefined) {
  return id ? SEASONAL_THEMES.find((theme) => theme.id === id) ?? null : null;
}
