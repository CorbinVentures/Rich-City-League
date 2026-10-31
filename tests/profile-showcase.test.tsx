import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {writeFileSync,readFileSync} from 'node:fs';
vi.mock('@/components/ProfileAvatarMedia',()=>({ProfileAvatarMedia:({alt}:{alt:string})=><div aria-label={alt}/> }));
vi.mock('../src/components/ProfileShowcase.module.css',()=>({default:new Proxy({}, {get:(_,key)=>key})}));
import {ProfileShowcase} from '../src/components/ProfileShowcase';
const props={kind:'player' as const,name:'Test player',avatar:null,location:'Richmond, VA',position:'SG',jersey:'0',player:null,basketball:null,coach:null,href:'/social/profile/test',badges:0};

describe('Profile showcase rendering',()=>{
 it('renders honest unrated/new-player states and real destinations',()=>{
  const html=renderToStaticMarkup(<ProfileShowcase {...props}/>);
  expect(html).toContain('PLAYER CARD');
  expect(html).toContain('#0');
  expect(html).toContain('game records are added');
  expect(html).toContain('/social/profile/test?tab=stats');
  expect(html).not.toContain('>99<');
  if(process.env.PROFILE_VISUAL_FIXTURE)writeFileSync('/tmp/rch-profile-fixture.html',`<html><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:16px;background:#0b0c0e;color:white;font-family:Arial}a{color:inherit;text-decoration:none}p,h2{margin:0}${readFileSync('src/components/ProfileShowcase.module.css','utf8')}</style><main style="max-width:960px;margin:auto">${html}</main></html>`);
 });
 it('does not show a player card for fans',()=>{
  expect(renderToStaticMarkup(<ProfileShowcase {...props} kind="fan"/>)).toBe('');
 });
 it('shows coaching identity and preserves zero years of experience',()=>{
  const html=renderToStaticMarkup(<ProfileShowcase {...props} kind="coach" coach={{profile_id:'test',headline:'Development coach',organization:'Test organization',city:'Richmond',years_experience:0,coaching_level:'Youth / Recreation',specialties:['Shooting'],availability:'open_to_opportunities',published:true}}/>);
  expect(html).toContain('COACH CARD');expect(html).toContain('0 yrs');
  expect(html).toContain('self-reported');expect(html).toContain('Open to coaching opportunities');
  expect(html).not.toContain('RCL RATING');
 });
});
