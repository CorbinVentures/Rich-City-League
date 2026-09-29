import type { Metadata } from 'next';
import { PlayerPassportExperience } from '@/components/PlayerPassportExperience';
import { getPlayerDetail } from '@/lib/public-data';

export const revalidate=60;
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params;const data=await getPlayerDetail(id);if(!data)return{title:'RCL Basketball Passport',robots:{index:false,follow:false}};const name=`${data.player.first_name} ${data.player.last_name}`;return{title:{absolute:`${name} Basketball Passport | RCL`},description:`Verified Rich City League Basketball Passport for ${name}: career stats, Game IQ, REP, highlights, awards, development and reliability.`,alternates:{canonical:`/players/${id}/passport`}};}

export default async function PlayerPassportPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <PlayerPassportExperience playerId={id}/>;}
