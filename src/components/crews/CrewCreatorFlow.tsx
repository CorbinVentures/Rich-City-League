'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaArrowRight, FaBasketball, FaCheck, FaFlag, FaLocationDot, FaPeopleGroup, FaXmark } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { CrewHomeCourtPicker, type CrewHomeCourt } from './CrewHomeCourtPicker';
import { saveCrewLogo } from '@/lib/crew-logo-storage';
import { CrewLogoStudio } from './CrewLogoStudio';

type Props = { onClose: () => void; onCreated: () => void };
const stages = ['Identity', 'Logo', 'Finish'] as const;

/** A three-screen creator; the server RPC remains the source of truth for membership and court rules. */
export function CrewCreatorFlow({ onClose, onCreated }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const db = useMemo(() => getSupabaseClient(true) as any, []);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<CrewHomeCourt | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFile) { setLogoPreview(null); return; }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const validName = name.trim().length >= 3 && name.trim().length <= 36;
  const validCourt = Boolean(selectedCourt?.slug);
  const next = () => {
    if (step === 0 && (!validName || !validCourt)) return;
    setError('');
    setStep(current => Math.min(2, current + 1));
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !db || !user || !validName || !validCourt || step !== 2) return;
    setSaving(true); setError('');
    try {
      const { data: crewId, error: createError } = await db.rpc('commonwealth_found_crew', {
        p_name: name.trim(), p_court_slug: selectedCourt!.slug, p_motto: motto.trim()
      });
      if (createError) throw createError;
      // Never retry the founding RPC after it succeeds, even if logo storage fails.
      if (crewId && logoFile) {
        try { await saveCrewLogo(db, crewId as string, logoFile); }
        catch { /* The owner can upload again from Crew HQ without creating a duplicate. */ }
      }
      onCreated();
      if (crewId) router.replace('/crews?crew=' + encodeURIComponent(crewId as string) + '#rch-crew-hq');
      else router.replace('/crews?intent=mine');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your crew.');
      setSaving(false);
    }
  };

  return <section id="rch-crew-create" aria-label="Create your crew" className="mt-6 scroll-mt-24 overflow-hidden rounded-xl border border-[#4a4e54] bg-[#141618] text-[#f5f5f3]">
    <div className="flex items-center justify-between border-b border-[#44484e] px-4 py-4 sm:px-6">
      <div><p className="text-[11px] font-black uppercase tracking-widest text-[#ff768c]">RCH Crew Creator</p>
        <h2 className="font-display text-2xl font-black uppercase sm:text-3xl">Build your crew</h2></div>
      <button type="button" onClick={onClose} aria-label="Close crew creator" className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-[#555b61] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><FaXmark/></button>
    </div>
    <div className="grid grid-cols-3 gap-2 border-b border-[#34383e] p-3 sm:p-4" aria-label="Creator progress">
      {stages.map((stage, index) => <div key={stage} aria-current={step === index ? 'step' : undefined} className={'flex items-center justify-center gap-2 rounded-lg p-3 text-xs font-black sm:text-sm ' + (step === index ? 'bg-[#c8102e] text-white' : index < step ? 'bg-[#373b40] text-white' : 'bg-[#202326] text-[#bfc1c6]')}>
        {index < step ? <FaCheck/> : <span>{index + 1}</span>}<span>{stage}</span>
      </div>)}
    </div>
    <form onSubmit={create} className="p-4 sm:p-6">
      {step === 0 && <>
        <label className="block text-sm font-black" htmlFor="rch-crew-name">Crew name</label>
        <input id="rch-crew-name" autoFocus required minLength={3} maxLength={36} value={name} onChange={e=>setName(e.target.value)} placeholder="Name your crew" className="mt-2 min-h-12 w-full rounded-lg border border-[#6c7075] bg-[#202326] px-4 text-base text-white placeholder:text-[#a6a8ad] focus:border-[#ff768c] focus:outline-none"/>
        <p className="mb-3 mt-6 text-sm font-black">Claim your home court</p>
        <CrewHomeCourtPicker selected={selectedCourt} onSelect={setSelectedCourt}/>
        <details className="mt-5 rounded-lg border border-[#484d52] bg-[#202326] px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold">Add a motto <span className="font-normal text-[#bfc1c6]">(optional)</span></summary>
          <input aria-label="Crew motto" maxLength={160} value={motto} onChange={e=>setMotto(e.target.value)} placeholder="What do you stand for?" className="mt-3 min-h-11 w-full rounded-lg border border-[#666a70] bg-[#141618] px-3 text-white placeholder:text-[#a6a8ad]"/>
        </details>
      </>}
      {step === 1 && <>
        <h3 className="font-display text-xl font-black uppercase">Choose your look</h3>
        <p className="mt-1 text-sm text-[#d0d1d4]">Pick a style, upload artwork or use AI. A logo is optional.</p>
        <CrewLogoStudio crewName={name.trim()} onChange={setLogoFile}/>
      </>}
      {step === 2 && <>
        <h3 className="font-display text-xl font-black uppercase">Ready to represent?</h3>
        <div className="mt-4 flex flex-col items-center gap-5 rounded-xl border border-[#44484e] bg-[#202326] p-6 sm:flex-row">
          <div className="grid aspect-square w-44 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#6a7076] bg-[#0b0c0e] p-3">
            {logoPreview ? <img src={logoPreview} alt="Selected crew emblem" className="h-full w-full object-contain"/> : <FaBasketball aria-label="Default basketball emblem" className="text-7xl text-[#ff768c]"/>}
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <p className="text-xs font-black uppercase tracking-widest text-[#ff768c]"><FaPeopleGroup className="mr-1 inline"/> Your crew</p>
            <h4 className="mt-2 break-words font-display text-3xl font-black uppercase">{name.trim()}</h4>
            <p className="mt-2 flex items-center justify-center gap-1 text-sm text-[#d0d1d4] sm:justify-start"><FaLocationDot/> {selectedCourt?.name}</p>
            {motto.trim() && <p className="mt-2 text-sm text-[#d0d1d4]">{motto.trim()}</p>}
            <p className="mt-3 text-xs text-[#c1c3c8]">{logoFile ? 'Custom logo selected' : 'You can add your logo later'}</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-[#d0d1d4]">One active crew per player per season. Home court selection does not reserve the court.</p>
      </>}
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/60 bg-red-950/40 p-3 text-sm text-red-100">{error}</p>}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={()=>step ? setStep(current=>current-1) : onClose()} disabled={saving}
          className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#72767c] px-4 text-sm font-bold text-white disabled:opacity-50"><FaArrowLeft/>{step ? 'Back' : 'Cancel'}</button>
        {step < 2 ? <button type="button" onClick={next} disabled={saving || (step === 0 && (!validName || !validCourt))}
          className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#c8102e] px-6 text-sm font-black text-white disabled:opacity-50">Next <FaArrowRight/></button> :
          <button type="submit" disabled={saving || !user || !validName || !validCourt}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#c8102e] px-6 text-sm font-black text-white disabled:opacity-50"><FaFlag/>{saving ? 'Creating…' : 'Create Crew'}</button>}
      </div>
    </form>
  </section>;
}
