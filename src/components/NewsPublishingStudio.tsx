'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FaArrowUpRightFromSquare, FaFloppyDisk, FaImage, FaNewspaper, FaPenToSquare, FaPlus, FaTrash } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

type NewsItem = {
  id:string; author_id:string|null; title:string; slug:string; excerpt:string|null; body:string;
  cover_image_url:string|null; status:'draft'|'published'|'archived'; published_at:string|null; created_at:string; updated_at:string;
};

type NewsForm={id:string;title:string;slug:string;excerpt:string;body:string;cover_image_url:string;status:'draft'|'published'|'archived'};
const emptyForm:NewsForm={id:'',title:'',slug:'',excerpt:'',body:'',cover_image_url:'',status:'draft'};

function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);}

export function NewsPublishingStudio({initialNews,userId,onChanged}:{initialNews:NewsItem[];userId:string;onChanged:()=>Promise<void>|void}){
  const supabase=useMemo(()=>getSupabaseClient(),[]);
  const [form,setForm]=useState({...emptyForm});
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');

  const reset=()=>{setForm({...emptyForm});setEditing(false);setNotice('');};
  const edit=(item:NewsItem)=>{setForm({id:item.id,title:item.title,slug:item.slug,excerpt:item.excerpt||'',body:item.body,cover_image_url:item.cover_image_url||'',status:item.status});setEditing(true);window.setTimeout(()=>document.getElementById('rcl-news-editor')?.scrollIntoView({behavior:'smooth',block:'start'}),50);};

  async function uploadCover(file:File){
    if(!supabase||!file.type.startsWith('image/')) return;
    setBusy(true);setNotice('Uploading cover image…');
    const safe=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-');
    const path=`news/${Date.now()}-${safe}`;
    const {data,error}=await supabase.storage.from('media').upload(path,file,{upsert:false,contentType:file.type,cacheControl:'31536000'});
    if(error||!data?.path){setNotice(error?.message||'Cover upload failed.');setBusy(false);return;}
    const {data:pub}=supabase.storage.from('media').getPublicUrl(data.path);
    setForm(v=>({...v,cover_image_url:pub.publicUrl}));setNotice('Cover image ready.');setBusy(false);
  }

  async function save(status:'draft'|'published'){
    if(!supabase||!form.title.trim()||!form.body.trim()){setNotice('Headline and article body are required.');return;}
    const slug=slugify(form.slug||form.title);
    if(!slug){setNotice('A valid article slug is required.');return;}
    setBusy(true);setNotice(status==='published'?'Publishing article…':'Saving draft…');
    const payload={author_id:userId,title:form.title.trim(),slug,excerpt:form.excerpt.trim()||null,body:form.body.trim(),cover_image_url:form.cover_image_url.trim()||null,status,published_at:status==='published'?new Date().toISOString():null,updated_at:new Date().toISOString()};
    const result=editing&&form.id
      ? await supabase.from('news').update(payload as never).eq('id',form.id)
      : await supabase.from('news').insert(payload as never);
    if(result.error){setNotice(result.error.message);setBusy(false);return;}
    setNotice(status==='published'?'Article is live.':'Draft saved.');
    await onChanged();reset();setBusy(false);
  }

  async function archive(id:string){
    if(!supabase||!window.confirm('Archive this article?')) return;
    setBusy(true);const {error}=await supabase.from('news').update({status:'archived',updated_at:new Date().toISOString()} as never).eq('id',id);
    setNotice(error?.message||'Article archived.');await onChanged();setBusy(false);
  }

  return <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-rcl-orange">RCL NEWSROOM</p><h2 className="mt-1 text-xl font-black uppercase">News Publishing</h2><p className="mt-1 text-xs text-gray-500">Write, edit and publish full stories to the public RCL news desk.</p></div>
      <button onClick={reset} className="rounded-xl bg-rcl-orange px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black"><FaPlus className="mr-2 inline"/>New Article</button>
    </div>

    <div id="rcl-news-editor" className="mt-6 rounded-2xl border border-rcl-orange/20 bg-black/35 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2"><FaPenToSquare className="text-rcl-orange"/><h3 className="text-sm font-black uppercase tracking-widest">{editing?'Edit Article':'Create Article'}</h3></div>
      <div className="grid gap-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Headline<input value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value,slug:v.slug||slugify(e.target.value)}))} className="mt-2 w-full rounded-xl border border-white/10 bg-black p-3 text-base font-bold text-white outline-none focus:border-rcl-orange" placeholder="Story headline"/></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">URL Slug<input value={form.slug} onChange={e=>setForm(v=>({...v,slug:slugify(e.target.value)}))} className="mt-2 w-full rounded-xl border border-white/10 bg-black p-3 text-xs text-white" placeholder="story-url"/></label>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cover Image URL<input value={form.cover_image_url} onChange={e=>setForm(v=>({...v,cover_image_url:e.target.value}))} className="mt-2 w-full rounded-xl border border-white/10 bg-black p-3 text-xs text-white" placeholder="https://…"/></label>
        </div>
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest"><FaImage/>Upload Cover<input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void uploadCover(f);e.currentTarget.value='';}}/></label>
        {form.cover_image_url&&<img src={form.cover_image_url} alt="" className="max-h-56 w-full rounded-xl border border-white/10 object-cover"/>}
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Excerpt<textarea value={form.excerpt} onChange={e=>setForm(v=>({...v,excerpt:e.target.value}))} rows={3} maxLength={320} className="mt-2 w-full rounded-xl border border-white/10 bg-black p-3 text-sm leading-6 text-white" placeholder="Short summary used on story cards and previews."/></label>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Article Body<textarea value={form.body} onChange={e=>setForm(v=>({...v,body:e.target.value}))} rows={14} className="mt-2 w-full rounded-xl border border-white/10 bg-black p-4 font-sans text-sm leading-7 text-white" placeholder="Write the full story here. Separate paragraphs with a blank line."/></label>
      </div>
      {notice&&<p className="mt-4 rounded-lg border border-rcl-gold/20 bg-rcl-gold/5 p-3 text-xs text-rcl-gold">{notice}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <button disabled={busy} onClick={()=>void save('draft')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"><FaFloppyDisk className="mr-2 inline"/>Save Draft</button>
        <button disabled={busy} onClick={()=>void save('published')} className="rounded-xl bg-rcl-orange px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-50"><FaNewspaper className="mr-2 inline"/>Publish Now</button>
        {editing&&<button onClick={reset} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Cancel</button>}
      </div>
    </div>

    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-widest text-gray-300">Story Desk</h3><span className="text-[9px] font-black text-gray-600">{initialNews.length} STORIES</span></div>
      <div className="space-y-2">{initialNews.slice(0,30).map(n=><article key={n.id} className="flex flex-col gap-3 rounded-xl border border-white/5 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><div className="flex items-center gap-2"><span className={`text-[9px] font-black uppercase ${n.status==='published'?'text-green-400':n.status==='draft'?'text-rcl-gold':'text-gray-600'}`}>{n.status}</span>{n.published_at&&<span className="text-[9px] text-gray-600">{new Date(n.published_at).toLocaleDateString()}</span>}</div><p className="mt-1 truncate font-bold">{n.title}</p><p className="truncate text-[10px] text-gray-600">/news/{n.slug}</p></div>
        <div className="flex shrink-0 gap-2"><button onClick={()=>edit(n)} className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black uppercase">Edit</button>{n.status==='published'&&<Link href={`/news/${n.slug}`} target="_blank" className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black uppercase"><FaArrowUpRightFromSquare/></Link>}<button onClick={()=>void archive(n.id)} className="rounded-lg bg-rcl-red/10 px-3 py-2 text-[9px] font-black text-rcl-red"><FaTrash/></button></div>
      </article>)}{!initialNews.length&&<div className="rounded-xl border border-dashed border-white/10 p-8 text-center"><FaNewspaper className="mx-auto text-2xl text-white/20"/><p className="mt-3 text-sm text-gray-500">No stories yet. Publish the first RCL article above.</p></div>}</div>
    </div>
  </section>;
}
