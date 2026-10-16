'use client';

import {useMemo,useState} from 'react';
import {FaArrowRotateLeft,FaBasketball,FaCheck,FaCloudArrowUp,FaPaintbrush,FaWandMagicSparkles} from 'react-icons/fa6';
import {createCrewLogoSvg,initialLogoDesign,logoPresets,type CrewLogoDesign,type LogoSymbol} from '@/lib/crew-logo-design';

type Mode='builder'|'upload'|'ai';
type Props={crewName:string;onChange:(file:File|null)=>void;initialLogoUrl?:string|null};
const symbols:LogoSymbol[]=['basketball','crown','star','bolt','flame','wings'];
const styles=['Street','Championship','Minimal','Mascot','Bold'] as const;
const mime=new Set(['image/png','image/jpeg','image/webp']);
const maxSource=10*1024*1024;
const maxLogo=2*1024*1024;

async function imageToPng(blob:Blob):Promise<{file:File;preview:string}>{
  const url=URL.createObjectURL(blob);
  try{
    const img=await new Promise<HTMLImageElement>((resolve,reject)=>{
      const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('This image could not be read.'));image.src=url;
    });
    if(!img.naturalWidth||!img.naturalHeight)throw new Error('The image is empty.');
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not prepare this image.');
    const scale=Math.min(512/img.naturalWidth,512/img.naturalHeight);
    const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    ctx.clearRect(0,0,512,512);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,(512-w)/2,(512-h)/2,w,h);
    const output=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not export your logo.')),'image/png'));
    if(output.size>maxLogo)throw new Error('Your final logo exceeds 2 MB. Try a simpler image.');
    return {file:new File([output],'crew-logo.png',{type:'image/png'}),preview:canvas.toDataURL('image/png')};
  }finally{URL.revokeObjectURL(url);}
}
export function CrewLogoStudio({crewName,onChange,initialLogoUrl}:Props){
 const [mode,setMode]=useState<Mode>('builder');
 const [design,setDesign]=useState<CrewLogoDesign>(()=>initialLogoDesign(crewName||'MY CREW'));
 const [selectedPreview,setSelectedPreview]=useState<string|null>(null);
 const [selectedMethod,setSelectedMethod]=useState('');
 const [aiPrompt,setAiPrompt]=useState('');
 const [aiStyle,setAiStyle]=useState<(typeof styles)[number]>('Street');
 const [generating,setGenerating]=useState(false);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');
 const [status,setStatus]=useState('');
 const [uploadedName,setUploadedName]=useState('');
 const svg=useMemo(()=>createCrewLogoSvg({...design,name:crewName||design.name}),[design,crewName]);
 const builderPreview=useMemo(()=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),[svg]);

 function chooseFile(file:File,preview:string,source:string){
   setSelectedPreview(preview);setSelectedMethod(source);setError('');setStatus(source+' logo selected. Save it when you create or update your crew.');
   onChange(file);
 }
 async function useBuilder(){
   setWorking(true);setError('');
   try{
     const result=await imageToPng(new Blob([svg],{type:'image/svg+xml'}));
     chooseFile(result.file,result.preview,'Custom-built');
   }catch(e){setError(e instanceof Error?e.message:'Could not export this design.');}
   finally{setWorking(false);}
 }
 async function useUpload(file?:File){
   if(!file)return;
   if(!mime.has(file.type)||file.size>maxSource){setError('Select a PNG, JPG or WebP image under 10 MB. SVG uploads are not supported.');return;}
   setWorking(true);setError('');setUploadedName(file.name);
   try{const result=await imageToPng(file);chooseFile(result.file,result.preview,'Uploaded');}
   catch(e){setError(e instanceof Error?e.message:'Image upload preparation failed.');}
   finally{setWorking(false);}
 }
 async function useAI(){
   if(aiPrompt.trim().length<10){setError('Describe the logo in at least 10 characters.');return;}
   setGenerating(true);setError('');setStatus('');
   try{
     const res=await fetch('/api/crews/generate-logo',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({prompt:aiPrompt.trim(),style:aiStyle,crew_name:crewName.trim()})
     });
     const json=await res.json().catch(()=>({}));
     if(!res.ok)throw new Error(json.error||'AI logo generation is currently unavailable.');
     if(typeof json.image!=='string'||!json.image.startsWith('data:image/webp;base64,'))throw new Error('No image returned by the generator.');
     const blob=await (await fetch(json.image)).blob();
     const result=await imageToPng(blob);
     chooseFile(result.file,result.preview,'AI-generated');
   }catch(e){setError(e instanceof Error?e.message:'The generator could not create a logo.');}
   finally{setGenerating(false);}
 }
 function update<K extends keyof CrewLogoDesign>(key:K,value:CrewLogoDesign[K]){
   setDesign(prev=>({...prev,[key]:value}));
   if(selectedMethod==='Custom-built')setStatus('Design edited. Select “Use custom logo” again to apply changes.');
 }
 function reset(){
   setDesign(initialLogoDesign(crewName||'MY CREW'));setSelectedPreview(null);setSelectedMethod('');
   setStatus('Design reset.');setError('');onChange(null);
 }
 const activePreview=selectedPreview|| (mode==='builder'?builderPreview:initialLogoUrl||builderPreview);
 const field='mt-1 w-full rounded-xl border border-[#3f6587] bg-[#06182a] px-3 py-2.5 text-sm text-white';
 const modes:{id:Mode;title:string;detail:string}[]=[
   {id:'builder',title:'Logo Builder',detail:'Create with editable styles and layers'},
   {id:'upload',title:'Upload Logo',detail:'Bring your own original artwork'},
   {id:'ai',title:'AI Create',detail:'Generate an original generic emblem'}
 ];
 return <section aria-label="Crew logo studio" className="mt-5 overflow-hidden rounded-3xl border border-[#35749b] bg-[radial-gradient(ellipse_at_80%_0%,#164363,#071624_55%)] p-4 text-white sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#83d8ff]">RCH Crew Identity Studio</p><h3 className="mt-1 text-xl font-black uppercase sm:text-2xl">Build your crew logo</h3></div>
     {selectedMethod&&<span className="rounded-full border border-emerald-500/50 bg-emerald-900/20 px-3 py-1.5 text-xs font-black text-emerald-300"><FaCheck className="mr-1 inline"/>{selectedMethod} · Ready</span>}
   </div>
   <p className="mt-2 text-sm text-[#b6d2e9]">Make your mark with a custom builder, your own upload, or AI artwork. Your selected logo appears on crew cards, Run entries, and social profiles.</p>
   <div className="mt-5 grid gap-2 sm:grid-cols-3">{modes.map(item=><button type="button" key={item.id} aria-pressed={mode===item.id}
      onClick={()=>{setMode(item.id);setError('');}} className={'min-h-[74px] rounded-xl border p-3 text-left transition '+(mode===item.id?'border-[#24d8e7] bg-[#155070]/70 shadow-[0_0_18px_rgba(17,209,229,.15)]':'border-[#314d67] bg-[#071626]/80 hover:border-[#669bbb]')}>
      <span className="flex items-center gap-2 text-sm font-black">{item.id==='builder'?<FaPaintbrush/>:item.id==='upload'?<FaCloudArrowUp/>:<FaWandMagicSparkles/>}{item.title}</span>
      <span className="mt-1 block text-[11px] text-[#b0c8de]">{item.detail}</span></button>)}</div>
   <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
     <div className="rounded-2xl border border-[#34516b] bg-[#071522]/90 p-4">
       {mode==='builder'&&<>
        <div className="mb-3 flex items-center justify-between"><strong className="text-sm uppercase text-[#83d8ff]">Original logo builder</strong><button type="button" onClick={reset} className="flex items-center gap-2 text-xs font-bold text-[#b9d4e9]"><FaArrowRotateLeft/> Reset</button></div>
        <p className="text-xs font-bold text-[#bddaf0]">Style presets</p>
        <div className="mt-2 grid grid-cols-3 gap-2">{logoPresets.map(p=><button type="button" key={p.name} onClick={()=>{setDesign(d=>({...d,shape:p.shape,symbol:p.symbol,primary:p.primary,secondary:p.secondary,ink:p.ink}));if(selectedMethod==='Custom-built')setStatus('Preset changed. Use custom logo to apply.');}} className={'min-h-12 rounded-xl border px-2 py-2 text-xs font-bold '+(design.shape===p.shape&&design.symbol===p.symbol?'border-[#36e4f5] bg-[#14506c]':'border-[#35526c] bg-[#0b2134]')}>{p.name}</button>)}</div>
        <p className="mt-4 text-xs font-bold text-[#bddaf0]">Emblem layer</p>
        <div className="mt-2 grid grid-cols-3 gap-2">{symbols.map(s=><button type="button" key={s} aria-pressed={design.symbol===s} onClick={()=>update('symbol',s)} className={'min-h-10 rounded-lg border px-2 text-xs font-bold capitalize '+(design.symbol===s?'border-[#35deeb] bg-[#135070]':'border-[#33506a]')}>{s}</button>)}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Main color<input aria-label="Main logo color" type="color" value={design.primary} onChange={e=>update('primary',e.target.value)} className="mt-2 h-10 w-full cursor-pointer rounded-lg bg-transparent"/></label><label className="text-xs font-bold">Background color<input aria-label="Background logo color" type="color" value={design.secondary} onChange={e=>update('secondary',e.target.value)} className="mt-2 h-10 w-full cursor-pointer rounded-lg bg-transparent"/></label><label className="text-xs font-bold">Lettering color<input aria-label="Logo text color" type="color" value={design.ink} onChange={e=>update('ink',e.target.value)} className="mt-2 h-10 w-full cursor-pointer rounded-lg bg-transparent"/></label><label className="text-xs font-bold">Tagline<input maxLength={36} value={design.tagline} onChange={e=>update('tagline',e.target.value)} className={field}/></label></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold">Emblem size <span className="text-[#98bedc]">{Math.round(design.symbolSize*100)}%</span><input type="range" min=".5" max="1.6" step=".1" value={design.symbolSize} onChange={e=>update('symbolSize',Number(e.target.value))} className="mt-2 w-full accent-cyan-400"/></label><label className="text-xs font-bold">Name size<input type="range" min="26" max="64" value={design.nameSize} onChange={e=>update('nameSize',Number(e.target.value))} className="mt-2 w-full accent-cyan-400"/></label><label className="text-xs font-bold">Emblem position<input type="range" min="140" max="285" value={design.symbolY} onChange={e=>update('symbolY',Number(e.target.value))} className="mt-2 w-full accent-cyan-400"/></label><label className="text-xs font-bold">Name position<input type="range" min="290" max="415" value={design.nameY} onChange={e=>update('nameY',Number(e.target.value))} className="mt-2 w-full accent-cyan-400"/></label></div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold"><label className="flex items-center gap-2"><input type="checkbox" checked={design.showSymbol} onChange={e=>update('showSymbol',e.target.checked)}/> Emblem layer</label><label className="flex items-center gap-2"><input type="checkbox" checked={design.showTagline} onChange={e=>update('showTagline',e.target.checked)}/> Tagline layer</label></div>
        <button type="button" disabled={working||generating} onClick={()=>void useBuilder()} className="mt-5 min-h-11 w-full rounded-xl bg-[#34d8ea] px-4 py-3 text-sm font-black text-[#041b28] disabled:opacity-40">{working?'Rendering…':'Use custom logo'}</button>
       </>}
       {mode==='upload'&&<><h4 className="text-base font-black uppercase">Upload your own logo</h4><p className="mt-2 text-xs leading-5 text-[#b9d4e9]">PNG, JPG or WebP up to 10 MB. We automatically fit it into a 512 × 512 square and compress it for RCH. No SVG or animated images.</p>
        <label className="mt-5 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#3c769a] bg-[#0b2740] px-4 py-6 text-center hover:border-[#56ccf2]"><FaCloudArrowUp className="mb-3 text-4xl text-[#5fc7e7]"/><strong className="text-sm">Choose your logo file</strong><span className="mt-2 text-xs text-[#a9cbe1]">{uploadedName||'Choose an image from your device'}</span><input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={working||generating} onChange={e=>{void useUpload(e.target.files?.[0]);e.target.value='';}}/></label>
        <p className="mt-4 text-xs text-[#a9c8e1]">Only use artwork you have permission to display. Crew images are public.</p>
       </>}
       {mode==='ai'&&<><h4 className="flex items-center gap-2 text-base font-black uppercase"><FaWandMagicSparkles className="text-[#d1a1ff]"/> AI Logo Creator</h4>
         <p className="mt-2 text-xs leading-5 text-[#b9d4e9]">Create an original sports-style emblem. Generic designs only—no NBA, NBA 2K, celebrity, copyrighted character, or existing team logo recreations.</p>
         <label className="mt-4 block text-xs font-bold">Describe your design<textarea maxLength={400} rows={4} value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="A fierce teal lightning bolt over a black basketball with championship energy…" className={field+' resize-y'}/></label>
         <p className="mt-4 text-xs font-bold">Select a vibe</p>
         <div className="mt-2 flex flex-wrap gap-2">{styles.map(s=><button key={s} type="button" aria-pressed={aiStyle===s} onClick={()=>setAiStyle(s)} className={'min-h-9 rounded-lg border px-3 text-xs font-bold '+(aiStyle===s?'border-[#daafff] bg-[#522e79]':'border-[#355573]')}>{s}</button>)}</div>
         <button type="button" disabled={generating||working||aiPrompt.trim().length<10} onClick={()=>void useAI()} className="mt-5 min-h-11 w-full rounded-xl bg-gradient-to-r from-[#5d75ff] to-[#bf75ec] px-4 py-3 text-sm font-black text-white disabled:opacity-40">{generating?'Creating your logo…':'Generate original logo'}</button>
         <p className="mt-3 text-xs leading-5 text-[#acbdd7]">Limit: 3 AI generations per account per day, with a short cooldown. Your selected result will be attached when you save your crew.</p>
       </>}
     </div>
     <div className="flex flex-col rounded-2xl border border-[#34516b] bg-[#071321] p-4">
       <div className="flex items-center justify-between"><strong className="text-sm uppercase text-[#8ccdf8]">Live logo preview</strong><span className="text-xs text-[#93b7d6]">512 × 512</span></div>
       <div className="mt-3 flex min-h-64 flex-1 items-center justify-center overflow-hidden rounded-xl border border-[#2d4d68] bg-[radial-gradient(circle,#19334c,#030c18_75%)] p-5">
         <img src={activePreview} alt={'Preview of '+(crewName||'your')+' crew logo'} className="aspect-square w-full max-w-[320px] object-contain"/>
       </div>
       <div className="mt-3 rounded-xl border border-[#31516f] bg-[#0a2137] p-3"><p className="text-xs font-black text-white">{selectedMethod?selectedMethod+' logo selected':'No logo selected yet'}</p><p className="mt-1 text-xs text-[#a9c6dd]">{selectedMethod?'Ready to save. You can always change it later from Crew HQ.':'Preview does not save automatically. Select or generate a logo and apply it.'}</p></div>
       {selectedMethod&&<button type="button" className="mt-3 min-h-10 rounded-lg border border-[#547795] px-3 text-xs font-bold" onClick={()=>{setSelectedMethod('');setSelectedPreview(null);setStatus('Logo selection cleared.');onChange(null);}}>Remove selected logo</button>}
     </div>
   </div>
   {error&&<p role="alert" className="mt-3 rounded-lg border border-red-400/40 bg-red-950/50 p-3 text-sm text-red-100">{error}</p>}
   {status&&<p role="status" className="mt-3 text-xs text-[#abecd7]">{status}</p>}
 </section>;
}
