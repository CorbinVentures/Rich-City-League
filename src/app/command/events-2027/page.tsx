import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from '@/lib/supabase-config';
import { CommandEventBudgets2027 } from '@/components/command/CommandEventBudgets2027';
export const dynamic = 'force-dynamic';
export default async function EventBudgets2027Page(){
 const config=getSupabaseConfig();
 if(config.status!=='configured') return <main style={{padding:40,background:'#090b10',minHeight:'100dvh',color:'white'}}>Command Center is temporarily unavailable.</main>;
 const cookieStore=await cookies();
 const supabase=createServerClient(config.url!,config.anonKey!,{cookies:{getAll(){return cookieStore.getAll()},setAll(){}}});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect('/member-access?next=%2Fcommand%2Fevents-2027');
 const {data:profile}=await supabase.from('profiles').select('role,is_active').eq('id',user.id).maybeSingle();
 if(profile?.role!=='admin'||profile?.is_active===false) return <main style={{padding:40,minHeight:'100dvh',background:'#090b10',color:'white'}}><h1>Access restricted</h1><p>Only authorized RCL administrators may view financial plans.</p></main>;
 return <CommandEventBudgets2027/>;
}
