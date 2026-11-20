// Safe to import in the browser: URL helpers only, no Supabase/server dependencies.
export const RCH_ORIGIN = 'https://www.richcityhoops.com';

export function crewInvitePath(id: string) {
 return '/crews/invite/' + encodeURIComponent(id);
}

export function crewInviteUrl(id: string) {
 return RCH_ORIGIN + crewInvitePath(id);
}

export function crewJoinPath(id: string) {
 return '/crews?crew=' + encodeURIComponent(id) + '#rch-crew-hq';
}
