'use client';

import {useCallback,useState} from 'react';
import RunsWorldGame from '@/components/runs/RunsWorldGame';
import {RunsRulesIntro} from '@/components/runs/RunsRulesIntro';

// Detailed rules remain available on demand; never block a visitor's first
// court-map interaction with a five-chapter modal.
export default function RunsWorldPage(){
 const [rulesOpen,setRulesOpen]=useState(false);
 const closeRules=useCallback(()=>setRulesOpen(false),[]);
 return <><RunsWorldGame onOpenRules={()=>setRulesOpen(true)} introEnabled={!rulesOpen} initialScreen="world"/><RunsRulesIntro open={rulesOpen} onClose={closeRules}/></>;
}
