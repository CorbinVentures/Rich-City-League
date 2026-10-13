import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from '@/lib/supabase-config';
import Link from 'next/link';
import { CommandDashboard } from '@/components/command/CommandDashboard';
export const dynamic = 'force-dynamic';
export default async function CommandPage(){
 const config=getSupabaseConfig();
 if(config.status!=='configured') return <main style={{minHeight:'100dvh',padding:40,background:'#090b10',color:'white'}}>Command Center is temporarily unavailable.</main>;
 const cookieStore=await cookies();
 const supabase=createServerClient(config.url!,config.anonKey!,{cookies:{getAll(){return cookieStore.getAll()},setAll(){}}});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect('/member-access?next=%2Fcommand');
 const {data:profile}=await supabase.from('profiles').select('role,is_active').eq('id',user.id).maybeSingle();
 if(profile?.role!=='admin'||profile?.is_active===false) return <main style={{minHeight:'100dvh',padding:40,background:'#090b10',color:'white'}}><h1>Access restricted</h1><p>RCL Command Center is for authorized league administrators only.</p><Link href="/">Return to RCH</Link></main>;
 return <CommandDashboard/>;
}
