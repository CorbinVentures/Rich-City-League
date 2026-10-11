import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('RCH TV — four editorial destinations', () => {
  const hub = read('src/app/media/page.tsx');
  const studio = read('src/app/admin/rch-tv/page.tsx');
  const migration = read('supabase/migrations/20261010233000_rch_tv_four_channel_categories.sql');

  it('has exactly the four specified channel destinations', () => {
    for (const id of ['live-games','the-pulse','movies','original-content']) {
      expect(hub).toContain(`href="#${id}"`);
      expect(hub).toContain(`id="${id}"`);
    }
    expect(hub).toContain('The <span className="text-rcl-orange">Pulse</span>');
    expect(hub).toContain('RCH TV weekly show + podcast');
  });

  it('separates curated titles without silently including general uploads', () => {
    expect(hub).toContain("item.category==='live_games'");
    expect(hub).toContain("item.category==='the_pulse'");
    expect(hub).toContain("item.category==='movies'");
    expect(hub).toContain("item.category==='original_content'");
    expect(migration).toContain("DEFAULT 'general'");
    expect(migration).toContain("rch_tv_category = 'general' OR public.is_admin()");
    expect(migration).toContain("status='published'");
  });

  it('keeps the archive free of fictitious movies or fabricated premiere dates', () => {
    expect(hub).toContain('No films are available yet.');
    expect(hub).toContain('Premiere to be announced');
    expect(hub).toContain('Episodes will appear here when published.');
    expect(hub).toContain('Every movie needs distribution rights cleared');
  });

  it('publishes selected admin media to the matching channel', () => {
    for (const category of ['live_games','the_pulse','movies','original_content']) {
      expect(studio).toContain(`value:'${category}'`);
    }
    expect(studio).toContain('rch_tv_category:category');
    expect(studio).toContain("update({rch_tv_category:category})");
    expect(studio).toContain('rightsConfirmed');
    expect(studio).toContain('have permission to distribute this content');
  });
});
