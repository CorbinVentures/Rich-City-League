import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {getServerSupabaseClient} from '@/lib/supabase-server';

export const runtime='nodejs';
export const maxDuration=60;
const allowedStyles=new Set(['Street','Championship','Minimal','Mascot','Bold']);
const respond=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});

export async function POST(request:Request){
  const origin=request.headers.get('origin');
  const host=request.headers.get('host');
  // Browser requests must originate from the same host; prevent cookie-backed cross-site use.
  if(origin&&host){
    try{if(new URL(origin).host!==host)return respond('Invalid request origin.',403);}
    catch{return respond('Invalid request origin.',403);}
  }
  const supabase=await getServerSupabaseClient();
  if(!supabase)return respond('Logo generation is not configured.',503);
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return respond('Sign in to generate a crew logo.',401);
  const length=Number(request.headers.get('content-length')||0);
  if(length>2048)return respond('Logo description is too long.',413);
  const body=await request.json().catch(()=>null);
  const prompt=typeof body?.prompt==='string'?body.prompt.trim():'';
  const crewName=typeof body?.crew_name==='string'?body.crew_name.trim():'';
  const style=typeof body?.style==='string'?body.style:'Street';
  if(prompt.length<10||prompt.length>400||crewName.length>36||!allowedStyles.has(style)){
    return respond('Add a short original logo description, crew name and an available style.',400);
  }
  const apiKey=process.env.OPENAI_API_KEY?.trim();
  if(!apiKey)return respond('AI creation is not configured. Use the free Logo Builder or upload option.',503);

  // Claim an atomic daily credit BEFORE incurring API charges. This RPC checks user eligibility.
  const claim=await supabase.rpc('rch_claim_crew_logo_generation' as never);
  if(claim.error)return respond('AI credits are temporarily unavailable. Try Logo Builder instead.',503);
  if(claim.data!==true)return respond('AI logo limit reached or cooldown active. You can generate three logos per day, at least one minute apart.',429);

  const safeCrew=crewName.replace(/[\r\n]/g,' ').slice(0,36);
  const safePrompt=prompt.replace(/[\r\n]/g,' ').slice(0,400);
  const instruction=[
    'Design ONE original square 1:1 esports-style street basketball CREW EMBLEM.',
    'This is a new independent community basketball team identity, never a licensed game or professional franchise.',
    'Use generic original styling, powerful silhouette, clean readable forms, bold contrast, suitable for a 128px circular avatar.',
    'Style: '+style+'. Crew concept: '+safeCrew+'. Visual request: '+safePrompt+'.',
    'Avoid ALL existing brand marks, team crests, copyrighted characters, NBA/NBA 2K logos, corporate trademarks, celebrity likenesses, and copied logos.',
    'Do not reference protected brands even when requested. Do not include mockups, jerseys, screenshots, watermarks or frame borders.',
    'No typography or text—focus on the emblem artwork; the crew name is displayed separately in the platform.',
    'Centered isolated single emblem with transparent surrounding background, no extra concepts or variations.'
  ].join('\n');
  try{
    const ai=await fetch('https://api.openai.com/v1/images/generations',{
      method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:process.env.OPENAI_CREW_LOGO_MODEL||'gpt-image-1-mini',
        prompt:instruction,n:1,size:'1024x1024',quality:'low',
        background:'transparent',output_format:'webp',output_compression:70,
        moderation:'auto',user:createHash('sha256').update(user.id).digest('hex').slice(0,32)
      }),
      signal:AbortSignal.timeout(55000)
    });
    if(!ai.ok){
      console.error('Crew logo generation provider status',ai.status);
      return respond(ai.status===429?'AI generation is busy. Please try again later.':'The AI provider could not create this logo. Try another description.',502);
    }
    const payload=await ai.json().catch(()=>null);
    const image=payload?.data?.[0]?.b64_json;
    if(typeof image!=='string'||!image.length||image.length>5_000_000)return respond('AI returned an unsupported logo. Try another description.',502);
    return NextResponse.json({image:'data:image/webp;base64,'+image},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch{
    return respond('AI generation timed out. Try again or use the Logo Builder.',504);
  }
}
