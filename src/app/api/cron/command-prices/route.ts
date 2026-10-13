import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {observeSupplierPrice} from '@/lib/command/pricing';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

// Daily supplier-price monitor. No price is changed without an exact-source,
// machine-readable product offer. Private club quotes are never scraped.
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET?.trim();
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`){
  return NextResponse.json({error:'Unauthorized'},{status:401});
 }
 const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
 const key=(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY)?.trim();
 if(!supabaseUrl||!key)return NextResponse.json({error:'Supplier monitoring not configured'},{status:503});
 const db=createClient(supabaseUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:products,error}=await db.from('rcl_command_concession_catalog')
  .select('id,name,supplier,supplier_product_url,pack_price,pack_quantity,source_status')
  .eq('source_status','published_reference').eq('supplier',"Sam's Club").order('name').limit(50);
 if(error)return NextResponse.json({error:'Catalog read failed'},{status:500});
 let verified=0,updated=0,review=0,errors=0;
 const entries=products||[];
 for(let i=0;i<entries.length;i+=3){
  await Promise.all(entries.slice(i,i+3).map(async p=>{
   const now=new Date().toISOString();
   const sampled=await observeSupplierPrice(p.supplier_product_url||'',p.name,p.supplier,p.pack_quantity);
   if(sampled.price===null){
    const result=await db.from('rcl_command_concession_catalog').update({
     refresh_attempted_at:now,refresh_status:'needs_review',
    }).eq('id',p.id).eq('source_status','published_reference');
    if(result.error)errors++;else review++;
    return;
   }
   const previous=Number(p.pack_price);
   if(Number.isFinite(previous)&&previous>0&&Math.abs(sampled.price-previous)/previous>0.4){
    // Extreme price changes are more likely to represent an offer mismatch,
    // case-size switch, or source error; preserve the last verified reference.
    const reviewed=await db.from('rcl_command_concession_catalog').update({
     refresh_attempted_at:now,refresh_status:'needs_review',
    }).eq('id',p.id);
    if(reviewed.error)errors++;else review++;
    return;
   }
   verified++;
   const changed=p.pack_price===null||Math.abs(Number(p.pack_price)-sampled.price)>=0.01;
   const result=await db.from('rcl_command_concession_catalog').update({
    pack_price:sampled.price,price_observed_at:now,refresh_attempted_at:now,
    refresh_status:changed?'verified_updated':'verified_unchanged',
   }).eq('id',p.id).eq('source_status','published_reference');
   if(result.error)errors++;else if(changed)updated++;
  }));
 }
 return NextResponse.json({ok:true,checked:entries.length,verified,updated,needs_review:review,errors,
  note:'Only exact primary product JSON-LD prices can update automatically; other supplier cases require an actual quote.'},
  {status:errors?207:200});
}
