'use client';

import {useEffect,useRef,useState} from 'react';
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
 shareCardVersion?:string;
 className?:string;
 label?:string;
 icon?:'arrow'|'nodes';
};

export function ShareRunButton({id,title,location,startsAt,format,shareCardVersion,className='rch-run-share-button',label='Share',icon='arrow'}:Props){
 const [state,setState]=useState<ShareState>('idle');
 const imageFile=useRef<{file:File;version:string;createdAt:number}|null>(null);
 const imageRequest=useRef<{version:string;promise:Promise<File>}|null>(null);
 const currentVersion=shareCardVersion??JSON.stringify([id,title,location,startsAt,format]);
 currentVersionRef.current=currentVersion;

 function clearPreparedImage(version:string){
  if(imageFile.current?.version===version)imageFile.current=null;
  if(imageRequest.current?.version===version)imageRequest.current=null;
 }

 function captionAndLink(){
  const url=runInviteUrl(window.location.origin,id);
  const caption=location&&startsAt&&format
   ?runShareText({title,location,starts_at:startsAt,game_format:format})
   :'Pull up to this basketball Run on Rich City Hoops.';
  return caption+'\n\n'+url;
 }

 function getImageFile(version:string){
  if(imageFile.current?.version===version)return Promise.resolve(imageFile.current.file);
  if(imageRequest.current?.version===version)return imageRequest.current.promise;
  const imageUrl=new URL('/runs/'+encodeURIComponent(id)+'/opengraph-image?v=run-card-v3&share='+Date.now(),window.location.origin);
  const request=fetch(imageUrl.toString(),{cache:'no-store',credentials:'same-origin'})
   .then(async response=>{
    if(!response.ok)throw new Error('Run image could not be loaded.');
    const blob=await response.blob();
    if(!blob.size||(blob.type&&!blob.type.startsWith('image/')))throw new Error('Run image is unavailable.');
    const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||id.slice(0,12);
    const file=new File([blob],'rch-run-'+slug+'.png',{type:blob.type||'image/png'});
    if(currentVersionRef.current===version)imageFile.current={file,version,createdAt:Date.now()};
    return file;
   });
  imageRequest.current={version,promise:request};
  void request.then(
   ()=>{if(imageRequest.current?.promise===request)imageRequest.current=null;},
   ()=>{if(imageRequest.current?.promise===request)imageRequest.current=null;},
  );
  return request;
 }

 function supportsImageShare(file:File){
  if(typeof navigator.share!=='function')return false;
  if(typeof navigator.canShare==='function'&&!navigator.canShare({files:[file]}))return false;
  return true;
 }

 async function downloadAndCopy(file:File,caption:string,version:string){
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
  clearPreparedImage(version);
 }

 function handleNativeShareError(error:unknown,file:File,caption:string,version:string){
  const name=error instanceof Error?error.name:'';
  if(name==='AbortError'){
   clearPreparedImage(version);
   setState('idle');
   return;
  }
  if(name==='NotAllowedError'){
   // Keep the freshly generated card available for a direct second tap when a
   // browser expires transient activation during the image fetch.
   setState('ready');
   return;
  }
  void downloadAndCopy(file,caption,version);
 }

 function openNativeShare(file:File,caption:string,version:string){
  try{
   const result=navigator.share({files:[file],title,text:caption});
   void result.then(
    ()=>{clearPreparedImage(version);setState('idle');},
    error=>handleNativeShareError(error,file,caption,version),
   );
  }catch(error){
   handleNativeShareError(error,file,caption,version);
  }
 }

 async function share(){
  if(state==='preparing')return;
  const version=currentVersion;
  const caption=captionAndLink();
  const ready=imageFile.current;
  if(ready&&ready.version===version&&state==='ready'&&Date.now()-ready.createdAt<10000){
   openNativeShare(ready.file,caption,version);
   return;
  }
  if(ready&&ready.version===version)imageFile.current=null;

  setState('preparing');
  try{
   const file=await getImageFile(version);
   if(currentVersionRef.current!==version){
    clearPreparedImage(version);
    setState('idle');
    return;
   }
   if(supportsImageShare(file))openNativeShare(file,caption,version);
   else await downloadAndCopy(file,caption,version);
  }catch{
   try{
    await navigator.clipboard.writeText(caption);
    setState('error');
   }catch{
    setState('error');
   }
  }
 }

 useEffect(()=>{
  if(imageFile.current?.version!==currentVersion)imageFile.current=null;
  if(imageRequest.current&&imageRequest.current.version!==currentVersion)imageRequest.current=null;
  setState('idle');
 },[currentVersion]);

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
