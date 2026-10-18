'use client';

import {useCallback,useEffect,useState} from 'react';
import RunsWorldGame from '@/components/runs/RunsWorldGame';
import {RunsRulesIntro} from '@/components/runs/RunsRulesIntro';

const SESSION_KEY='rch-runs-rules-intro-session-v1';

export default function RunsWorldPage(){
 const [rulesOpen,setRulesOpen]=useState(false);
 useEffect(()=>{
  try{if(window.sessionStorage.getItem(SESSION_KEY)==='seen')return;}catch{/* Storage is optional. */}
  setRulesOpen(true);
 },[]);
 const closeRules=useCallback(()=>{
  setRulesOpen(false);
  try{window.sessionStorage.setItem(SESSION_KEY,'seen');}catch{/* Never block entry. */}
 },[]);
 return <><RunsWorldGame onOpenRules={()=>setRulesOpen(true)}/><RunsRulesIntro open={rulesOpen} onClose={closeRules}/></>;
}
