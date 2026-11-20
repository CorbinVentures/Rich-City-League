import {getPublicClient} from '@/lib/public-data';

export type CrewInvite = {
 id: string;
 name: string;
 motto: string | null;
 city: string | null;
 homeCourt: string | null;
 logoUrl: string | null;
};

export type CrewInviteResult =
 | {status: 'found'; crew: CrewInvite}
 | {status: 'missing' | 'unavailable'; crew: null};

const CREW_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Public anon/RLS client only. Never use the service role for share previews.
export async function loadCrewInvite(id: string): Promise<CrewInviteResult> {
 if (!CREW_ID.test(id)) return {status: 'missing', crew: null};
 const db = getPublicClient() as any;
 if (!db) return {status: 'unavailable', crew: null};

 try {
  const {data, error} = await db.from('commonwealth_crews')
   .select('id,name,motto,city,home_court_slug,logo_path')
   .eq('id', id).maybeSingle();
  if (error) return {status: 'unavailable', crew: null};
  if (!data) return {status: 'missing', crew: null};

  const logoUrl: string | null = data.logo_path
   ? db.storage.from('rch-crew-logos').getPublicUrl(data.logo_path).data.publicUrl
   : null;
  return {
   status: 'found',
   crew: {
    id: data.id,
    name: data.name,
    motto: data.motto,
    city: data.city,
    homeCourt: data.home_court_slug,
    logoUrl,
   },
  };
 } catch {
  return {status: 'unavailable', crew: null};
 }
}
