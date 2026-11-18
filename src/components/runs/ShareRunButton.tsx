'use client';

import {useRef,useState} from 'react';
import {FaArrowUpRightFromSquare,FaShareNodes} from 'react-icons/fa6';
import {runInviteUrl} from '@/lib/run-activation';
import {runShareText} from '@/lib/runs-social-discovery';

type ShareState='idle'|'preparing'|'ready'|'copied'|'downloaded'|'error';
type Props={
 id:string;
 title:string;
 location?:string;
 startsAt?:string;
 format?:string|null;
 className?:string;
 label?:string;
 icon?:'arrow'|'nodes';
};

export function ShareRunButton({id,title,location,startsAt,format,className='rch-run-share-button',label='Share',icon='arrow'}:Props){
 const [state,setState]=useState<ShareState>('idle');
 const imageFile=useRef<File|null>(null);
 const imageRequest=useRef<Promise<File>|null>(null);

 function captionAndLink(){
  const url=runInviteUrl(window.location.origin,id);
  const caption=location&&startsAt&&format
   ?runShareText({title,location,starts_at:startsAt,game_format:format})
   :'Pull up to this basketball Run on Rich City Hoops.';
  return caption+'\n\n'+url;
 }

 function getImageFile(){
  if(imageFile.current)return Promise.resolve(imageFile.current);
  if(imageRequest.current)return imageRequest.current;
  const imageUrl=new URL('/runs/'+encodeURIComponent(id)+'/opengraph-image?v=run-card-v3',window.location.origin);
  const request=fetch(imageUrl.toString(),{cache:'no-store',credentials:'same-origin'})
   .then(async response=>{
    if(!response.ok)throw new Error('Run image could not be loaded.');
    const blob=await response.blob();
    if(!blob.size||blob.type&&!blob.type.startsWith('image/'))throw new Error('Run image is unavailable.');
    const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||id.slice(0,12);
    const file=new File([blob],'rch-run-'+slug+'.png',{type:blob.type||'image/png'});
    imageFile.current=file;
    return file;
   });
  imageRequest.current=request;
  void request.then(
   ()=>{if(imageRequest.current===request)imageRequest.current=null;},
   ()=>{if(imageRequest.current===request)imageRequest.current=null;},
  );
  return request;
 }

 function supportsImageShare(file:File){
  if(typeof navigator.share!=='function')return false;
  if(typeof navigator.canShare==='function'&&!navigator.canShare({files:[file]}))return false;
  return true;
 }

 async function downloadAndCopy(file:File,caption:string){
  const objectUrl=URL.createObjectURL(file);
  const link=document.createElement('a');
  link.href=objectUrl;
  link.download=file.name;
  link.style.display='none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
  try{
   await navigator.clipboard.writeText(caption);
   setState('copied');
  }catch{
   setState('downloaded');
  }
 }

 function handleNativeShareError(error:unknown,file:File,caption:string){
  const name=error instanceof Error?error.name:'';
  if(name==='AbortError'){
   setState('idle');
   return;
  }
  if(name==='NotAllowedError'){
   // Some browsers require the share call itself to happen directly inside a
   // user gesture. Keep the image ready so a second tap can open the share sheet.
   setState('ready');
   return;
  }
  void downloadAndCopy(file,caption);
 }

 function openNativeShare(file:File,caption:string){
  try{
   const result=navigator.share({files:[file],title,text:caption});
   void result.then(
    ()=>setState('idle'),
    error=>handleNativeShareError(error,file,caption),
   );
  }catch(error){
   handleNativeShareError(error,file,caption);
  }
 }

 function warmImage(){
  void getImageFile().catch(()=>undefined);
 }

 async function share(){
  if(state==='preparing')return;
  const caption=captionAndLink();
  const readyFile=imageFile.current;
  if(readyFile){
   if(supportsImageShare(readyFile))openNativeShare(readyFile,caption);
   else void downloadAndCopy(readyFile,caption);
   return;
  }

  setState('preparing');
  try{
   const file=await getImageFile();
   if(supportsImageShare(file))openNativeShare(file,caption);
   else await downloadAndCopy(file,caption);
  }catch{
   try{
    await navigator.clipboard.writeText(caption);
    setState('error');
   }catch{
    setState('error');
   }
  }
 }

 const iconElement=icon==='nodes'
  ?<FaShareNodes aria-hidden="true"/>
  :<FaArrowUpRightFromSquare aria-hidden="true"/>;
 const buttonText=state==='preparing'?'Preparing image…'
  :state==='ready'?'Image ready · tap to share'
  :state==='copied'?'Image saved · link copied ✓'
  :state==='downloaded'?'Image downloaded ✓'
  :state==='error'?'Retry share':label;

 return <button
  type="button"
  onPointerEnter={warmImage}
  onPointerDown={warmImage}
  onFocus={warmImage}
  onClick={()=>void share()}
  aria-label={'Share '+title+' as an image'}
  aria-live="polite"
  disabled={state==='preparing'}
  className={className}
 >
  {state==='idle'&&iconElement}
  {buttonText}
 </button>;
}
