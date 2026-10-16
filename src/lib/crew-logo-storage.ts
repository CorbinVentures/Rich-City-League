export const CREW_LOGO_BUCKET='rch-crew-logos';
const LOGO_SIZE_LIMIT=2*1024*1024;

/** Crew branding is stored only in the existing public captain-scoped logo bucket. */
export async function saveCrewLogo(db:any,crewId:string,file:File):Promise<void>{
  if(!/^[0-9a-f-]{36}$/i.test(crewId))throw new Error('Select a valid crew.');
  if(!file||file.type!=='image/png'||file.size>LOGO_SIZE_LIMIT||file.size===0) {
    throw new Error('Create or select a PNG logo under 2 MB first.');
  }
  const path=crewId+'/logo-'+Date.now()+Math.floor(Math.random()*100000).toString().padStart(5,'0')+'.png';
  const uploaded=await db.storage.from(CREW_LOGO_BUCKET).upload(path,file,{upsert:false,contentType:'image/png',cacheControl:'3600'});
  if(uploaded.error)throw new Error(uploaded.error.message);
  const result=await db.rpc('commonwealth_set_crew_logo',{p_crew:crewId,p_path:path});
  if(result.error)throw new Error(result.error.message);
}
