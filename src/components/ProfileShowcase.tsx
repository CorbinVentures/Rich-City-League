import React from 'react';
import Link from 'next/link';
import { FaBasketball, FaClipboard, FaLocationDot } from 'react-icons/fa6';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';
import type { RCHCoachIdentity } from '@/lib/rch-coach-identity';
import styles from './ProfileShowcase.module.css';

type Player = { position: string|null; jersey_number: string|null; height_inches: number|null; photo_url: string|null };
type Basketball = { team: {name:string}|null; games:number; ppg:number; rpg:number; apg:number; iq:{rcl_rating:number|null;player_archetype:string|null}|null };

export function ProfileShowcase({kind,name,avatar,location,position,jersey,player,basketball,coach,href,badges}:{
  kind:'player'|'coach'|'fan';name:string;avatar:string|null;location:string|null;position:string|null;jersey:string|null;
  player:Player|null;basketball:Basketball|null;coach:RCHCoachIdentity|null;href:string;badges:number;
}) {
  if(kind==='fan') return null;
  const isPlayer=kind==='player';
  const rating=basketball?.iq?.rcl_rating;
  const hasStats=Boolean(basketball?.games);
  const metrics=isPlayer
    ? [['PPG',hasStats?basketball!.ppg.toFixed(1):'—'],['RPG',hasStats?basketball!.rpg.toFixed(1):'—'],['APG',hasStats?basketball!.apg.toFixed(1):'—']]
    : [['Experience',coach?.years_experience==null?'—':`${coach.years_experience} yrs`],['Level',coach?.coaching_level||'—'],['Badges',String(badges)]];
  return <section className={styles.showcase} aria-label={isPlayer?'Player showcase':'Coach showcase'}>
    <div className={styles.portrait}>
      <ProfileAvatarMedia src={(isPlayer?player?.photo_url:null)||avatar} alt={name} className={styles.photo} sizes="(max-width: 540px) 100vw, 400px"/>
      <span className={styles.identity}>{isPlayer?<FaBasketball aria-hidden/>:<FaClipboard aria-hidden/>}{isPlayer?'PLAYER CARD':'COACH CARD'}</span>
      {isPlayer&&<div className={styles.rating}><strong>{rating==null?'—':Math.round(rating)}</strong><span>RCL RATING</span></div>}
    </div>
    <div className={styles.body}>
      <p className={styles.eyebrow}>{isPlayer?'THE PLAYER':'THE COACH'}</p>
      <h2>{isPlayer?(basketball?.iq?.player_archetype||'Build your legacy'):(coach?.headline||'Basketball coach')}</h2>
      <p className={styles.subtitle}>{isPlayer?[player?.position||position,(player?.jersey_number||jersey)?`#${player?.jersey_number||jersey}`:null,player?.height_inches?`${Math.floor(player.height_inches/12)}′ ${player.height_inches%12}″`:null].filter(Boolean).join(' · ')||'Player details not added yet':coach?.organization||'Coaching background not published yet'}</p>
      {isPlayer&&basketball?.team&&<p className={styles.team}>{basketball.team.name}</p>}
      {(coach?.city||location)&&<p className={styles.location}><FaLocationDot aria-hidden/>{(isPlayer?null:coach?.city)||location}</p>}
      <div className={styles.metrics}>{metrics.map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <p className={styles.note}>{isPlayer?(hasStats?`${basketball!.games} official RCL games · Social REP is separate`:'Official stats and rating appear as game records are added.'):'Experience and affiliations are self-reported.'}</p>
      {!isPlayer&&Boolean(coach?.specialties.length)&&<div className={styles.specialties}>{coach!.specialties.slice(0,3).map(s=><span key={s}>{s}</span>)}</div>}
      {!isPlayer&&coach?.availability==='open_to_opportunities'&&<p className={styles.team}>Open to coaching opportunities</p>}
      <div className={styles.actions}><Link href={`${href}?tab=${isPlayer?'stats':'coach'}`}>{isPlayer?'View stats':'Coaching details'}</Link><Link href={`${href}?tab=${isPlayer?'highlights':'wall'}`}>{isPlayer?'Highlights':'View posts'}</Link>{isPlayer&&<Link href="/runs?view=world">Find a court</Link>}</div>
    </div>
  </section>;
}
