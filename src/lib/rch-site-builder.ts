/* RCH Sites: deliberately pure, allowlisted microsite presentation rules.
 * This module cannot edit core RCH settings, rankings, roles or organization billing.
 * Storage, publish rights and customer data require separate server/RLS enforcement.
 */
export const RCH_SITE_TYPES = ['trainer','coach','aau','organizer'] as const;
export type RchSiteType = (typeof RCH_SITE_TYPES)[number];

export const RCH_SITE_THEME_KEYS = ['courtside','spotlight','clean-slate'] as const;
export type RchSiteThemeKey = (typeof RCH_SITE_THEME_KEYS)[number];
export const RCH_SITE_THEMES: Record<RchSiteThemeKey,{label:string;canvas:string;accent:string;ink:string}> = {
  courtside: {label:'Courtside',canvas:'#101115',accent:'#E73356',ink:'#FFFFFF'},
  spotlight: {label:'Spotlight',canvas:'#151823',accent:'#FFB547',ink:'#FFFFFF'},
  'clean-slate': {label:'Clean Slate',canvas:'#F7F7F7',accent:'#C8102E',ink:'#151515'},
};

export const RCH_SITE_SECTION_KEYS = ['hero','about','services','schedule','roster','media','contact'] as const;
export type RchSiteSectionKey = (typeof RCH_SITE_SECTION_KEYS)[number];
const DEFAULT_SECTIONS: Record<RchSiteType,readonly RchSiteSectionKey[]> = {
  trainer:['hero','about','services','schedule','media','contact'],
  coach:['hero','about','services','schedule','media','contact'],
  aau:['hero','about','roster','schedule','media','contact'],
  organizer:['hero','about','schedule','media','contact'],
};
export type RchSiteDraft = {
  siteType:RchSiteType;
  theme:RchSiteThemeKey;
  tagline:string;
  about:string;
  callToAction:string;
  sections:RchSiteSectionKey[];
};

const MAX_TAGLINE_LENGTH=110;
const MAX_ABOUT_LENGTH=1000;
const MAX_ACTION_LENGTH=32;
const VALID_SLUG=/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;
const RESERVED = new Set(['admin','api','auth','billing','dashboard','login','register','rch','richcityhoops','support','www']);
const allowedType=(value:unknown):value is RchSiteType=>RCH_SITE_TYPES.some(type=>type===value);
const allowedTheme=(value:unknown):value is RchSiteThemeKey=>RCH_SITE_THEME_KEYS.some(key=>key===value);
const allowedSection=(value:unknown):value is RchSiteSectionKey=>RCH_SITE_SECTION_KEYS.some(section=>section===value);

/** Rejects invalid / reserved slugs; a DB UNIQUE constraint must handle races. */
export function isRchSiteSlug(value:unknown):value is string {
  return typeof value==='string' && value.length>=3 && value.length<=48 && VALID_SLUG.test(value) && !RESERVED.has(value);
}
export function rchSitePath(slug:string):string {
  if(!isRchSiteSlug(slug))throw new Error('Invalid RCH site slug');
  return '/sites/'+slug;
}

/** One safe palette and a handful of fixed sections — never arbitrary HTML, JSX, CSS or JS. */
export function normalizeRchSiteDraft(input:unknown, fallbackType:RchSiteType='trainer'):RchSiteDraft {
  const raw=input && typeof input==='object' && !Array.isArray(input) ? input as Record<string,unknown> : {};
  const siteType=allowedType(raw.siteType)?raw.siteType:fallbackType;
  const theme=allowedTheme(raw.theme)?raw.theme:'courtside';
  const asText=(value:unknown,max:number)=>typeof value==='string'
    ? value.replace(/<[^>]*>/g,'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,max):'';
  const seen=new Set<RchSiteSectionKey>();
  const sections:Array<RchSiteSectionKey>=[];
  const rawSections=Array.isArray(raw.sections)?raw.sections:DEFAULT_SECTIONS[siteType];
  for(const section of rawSections){
    if(allowedSection(section) && !seen.has(section)){seen.add(section);sections.push(section);}
  }
  if(!seen.has('hero'))sections.unshift('hero');
  if(!seen.has('contact'))sections.push('contact');
  return {
    siteType,theme,
    tagline:asText(raw.tagline,MAX_TAGLINE_LENGTH),
    about:asText(raw.about,MAX_ABOUT_LENGTH),
    callToAction:asText(raw.callToAction,MAX_ACTION_LENGTH)||'Get started',
    sections,
  };
}

export function rchSiteSectionsFor(type:RchSiteType):RchSiteSectionKey[] {
  return [...DEFAULT_SECTIONS[type]];
}
