import Link from 'next/link';
import { FaBasketball, FaCrown, FaPeopleGroup } from 'react-icons/fa6';
import { getServerSupabaseClient } from '@/lib/supabase-server';

type CrewRow={id:string;name:string;city:string;motto:string;logo_path:string|null};
type FavoriteRow={member_id:string;position:number};
type Person={id:string;display_name:string|null;username:string|null;avatar_url:string|null};

export async function PublicCrewShowcase({profileId}:{profileId:string}){
  const client=await getServerSupabaseClient();
  if(!client)return null;
  const db=client as any;
  const {data:membership}=await db.from('commonwealth_crew_members').select('crew_id,role').eq('profile_id',profileId).order('joined_at',{ascending:false}).limit(1).maybeSingle();
  if(!membership)return null;
  const [{data:crew},{data:favoriteRows}]=await Promise.all([
    db.from('commonwealth_crews').select('id,name,city,motto,logo_path').eq('id',membership.crew_id).maybeSingle(),
    db.from('commonwealth_crew_favorites').select('member_id,position').eq('owner_id',profileId).eq('crew_id',membership.crew_id).order('position').limit(5),
  ]);
  if(!crew)return null;
  const team=crew as CrewRow;
  const ids=((favoriteRows||[]) as FavoriteRow[]).map(f=>f.member_id);
  const {data:profiles}=ids.length?await db.from('profiles').select('id,display_name,username,avatar_url').in('id',ids).eq('is_active',true):{data:[]};
  const byId=new Map<string,Person>(((profiles||[]) as Person[]).map(p=>[p.id,p]));
  const logo=team.logo_path?db.storage.from('rch-crew-logos').getPublicUrl(team.logo_path).data.publicUrl:null;
  return <section className="mt-5 rounded-2xl border border-[#2b628c] bg-[linear-gradient(125deg,#0e2a42,#081525)] p-5" aria-label="Member crew and favorite teammates">
    <div className="flex flex-wrap items-center gap-4">
      <Link href={'/crews?crew='+team.id} className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#5ba1d2] bg-[#194364]">{logo?<img src={logo} alt={team.name+' logo'} className="h-full w-full object-contain"/>:<FaBasketball className="text-2xl text-[#b4e0ff]"/>}</Link>
      <div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-[#8dccf8]"><FaPeopleGroup/> RCH Crew · {membership.role==='captain'?'Captain':'Member'}</p><Link href={'/crews?crew='+team.id} className="mt-1 block font-display text-2xl font-black uppercase text-white hover:text-[#a9dbff]">{team.name}</Link><p className="mt-1 text-xs text-[#a9cce6]">{team.city}{team.motto?' · '+team.motto:''}</p></div>
      <Link href="/commonwealth" className="inline-flex items-center gap-2 rounded-xl border border-[#4d85ab] px-3 py-2 text-xs font-black text-[#9bd3fa]"><FaCrown/> Cup</Link>
    </div>
    {ids.length>0&&<div className="mt-5 border-t border-[#355d79] pt-4"><h3 className="text-xs font-black uppercase tracking-[.16em] text-[#9dc5e7]">My Crew Top 5</h3><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{ids.map((id,i)=>{const person=byId.get(id);return person?<Link href={'/social/profile/'+id} key={id} className="min-w-0 rounded-xl border border-[#315978] bg-[#102e47] p-3 text-center hover:border-[#8dc9f3]"><span className="mx-auto grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[#255577]">{person.avatar_url?<img src={person.avatar_url} alt="" className="h-full w-full object-cover"/>:<FaBasketball/>}</span><span className="mt-2 block truncate text-xs font-black text-white">{i+1}. {person.display_name||person.username||'Teammate'}</span></Link>:null;})}</div></div>}
  </section>;
}
