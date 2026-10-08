'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

export function MessageIntent(){
  const pathname=usePathname();
  const {user,loading}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(),[]);
  const handled=useRef(false);

  useEffect(()=>{
    if(pathname!=='/messages'||loading||handled.current)return;
    const target=new URLSearchParams(window.location.search).get('to');
    if(!target)return;
    handled.current=true;

    if(!user){
      window.location.href=`/auth/sign-in?redirect=${encodeURIComponent(`/messages?to=${target}`)}`;
      return;
    }
    if(!supabase||target===user.id){
      window.history.replaceState({},'', '/messages');
      return;
    }

    let cancelled=false;
    void supabase.rpc('start_direct_conversation',{target_profile_id:target} as never).then(({data,error})=>{
      if(cancelled)return;
      const conversationId=data as string|null;
      if(!error&&conversationId){window.location.href=`/messages/${conversationId}`;return;}
      window.history.replaceState({},'', '/messages');
    });
    return()=>{cancelled=true;};
  },[pathname,loading,user?.id,supabase]);

  useEffect(()=>{handled.current=false;},[pathname]);
  return null;
}
