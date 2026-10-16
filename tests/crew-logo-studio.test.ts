import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createCrewLogoSvg,initialLogoDesign,logoPresets} from '../src/lib/crew-logo-design';
const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');

describe('RCH crew identity studio',()=>{
  it('renders original editable vector artwork without injecting user-provided SVG or markup',()=>{
    const svg=createCrewLogoSvg({...initialLogoDesign(),name:'<script>alert(1)</script>',tagline:'HIFI & FRIENDS'});
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('HIFI &amp; FRIENDS');
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(logoPresets.length).toBeGreaterThanOrEqual(5);
  });
  it('clamps SVG control values and refuses injected CSS colors',()=>{
    const svg=createCrewLogoSvg({...initialLogoDesign(),primary:'red" onload="alert(1)',nameY:10000,symbolY:-100});
    expect(svg).not.toContain('onload=');
    expect(svg).toContain('y="415"');
    expect(svg).toContain('translate(256 140)');
  });
  it('offers builder, uploads and real AI image generation with preview before saving',()=>{
    const studio=read('src/components/crews/CrewLogoStudio.tsx');
    expect(studio).toContain("type Mode='builder'|'upload'|'ai'");
    expect(studio).toContain('createCrewLogoSvg');
    expect(studio).toContain("'/api/crews/generate-logo'");
    expect(studio).toContain('imageToPng');
    expect(studio).toContain('Use custom logo');
    expect(studio).toContain('Generate original logo');
    expect(studio).toContain('image/svg+xml');
    expect(studio).toContain('image/webp');
    expect(studio).toContain('onChange(file)');
    expect(studio).toContain('2*1024*1024');
  });
  it('stores captain logos through the existing crew bucket and verified RPC',()=>{
    const store=read('src/lib/crew-logo-storage.ts');
    const founding=read('src/components/commonwealth/CommonwealthExperience.tsx');
    const crews=read('src/app/crews/page.tsx');
    expect(store).toContain("rch-crew-logos");
    expect(store).toContain("commonwealth_set_crew_logo");
    expect(founding).toContain('<CrewLogoStudio crewName={crewName} onChange={setFoundingLogo}/>');
    expect(founding).toContain("commonwealth_found_crew");
    expect(founding).toContain('saveCrewLogo(db,crewId as string,foundingLogo)');
    expect(crews).toContain('<CrewLogoStudio crewName={myCrew.name}');
    expect(crews).toContain('saveCrewLogo(db,myCrew.id,logoDraft)');
  });
  it('protects AI image credits server-side and never exposes the provider key client-side',()=>{
    const route=read('src/app/api/crews/generate-logo/route.ts');
    const sql=read('supabase/migrations/20261016233000_rch_crew_logo_generation_limits.sql');
    const studio=read('src/components/crews/CrewLogoStudio.tsx');
    expect(route).toContain('getServerSupabaseClient');
    expect(route).toContain('supabase.auth.getUser()');
    expect(route).toContain('rch_claim_crew_logo_generation');
    expect(route).toContain('process.env.OPENAI_API_KEY');
    expect(route).toContain('api.openai.com/v1/images/generations');
    expect(route).toContain('data:image/webp;base64,');
    expect(studio).not.toContain('OPENAI_API_KEY');
    expect(sql).toContain('create table if not exists public.rch_crew_logo_generation_limits');
    expect(sql).toContain('generation_count<3');
    expect(sql).toContain("last_generated_at<now()-interval '60 seconds'");
    expect(sql).toContain('revoke all on public.rch_crew_logo_generation_limits');
  });
});
