'use client';

import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseClient} from '@/lib/supabase';
import {FaArrowUpRightFromSquare,FaBoxOpen,FaCartShopping,FaCircleCheck,FaCircleExclamation,FaClockRotateLeft,FaMagnifyingGlass,FaPen,FaTags,FaXmark} from 'react-icons/fa6';

type Catalog={
 id:string;sku:string;name:string;category:string;supplier:string;supplier_product_url:string|null;
 pack_quantity:number;pack_price:number|null;suggested_sale_price:number;source_status:string;
 price_observed_at:string|null;refresh_attempted_at:string|null;refresh_status:string;
 supplier_notes:string;retailer_location:string;
};
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const readable=(s:string)=>s.replaceAll('_',' ');
const days=(date:string|null)=>date?Math.floor((Date.now()-new Date(date).getTime())/86400000):null;
const url=(raw:string|null)=>{if(!raw)return null;try{const u=new URL(raw);return u.protocol==='https:'?u.toString():null}catch{return null}};
const filters=['All','water','sports_drinks','soda','chips','candy','snack_bars','hot_food','nachos','popcorn'];
export function CommandConcessionCatalog({onActivated}:{onActivated?:()=>Promise<void>}){
 const db=useMemo(()=>getSupabaseClient() as unknown as SupabaseClient<any>|null,[]);
 const [products,setProducts]=useState<Catalog[]>([]);
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [term,setTerm]=useState('');
 const [group,setGroup]=useState('All');
 const [selected,setSelected]=useState<Catalog|null>(null);
 const [mode,setMode]=useState<'stock'|'quote'>('stock');
 const [units,setUnits]=useState('0');
 const [cost,setCost]=useState('');
 const [sell,setSell]=useState('');
 const [quotePack,setQuotePack]=useState('');
 const [quoteQty,setQuoteQty]=useState('');
 const [quoteSource,setQuoteSource]=useState('');
 const load=useCallback(async()=>{
  if(!db){setError('Secure catalog unavailable.');setLoading(false);return}
  setLoading(true);
  const {data,error:e}=await db.from('rcl_command_concession_catalog').select('*').order('supplier').order('name').limit(200);
  if(e)setError(e.message);else{setProducts(data||[]);setError('')}
  setLoading(false);
 },[db]);
 useEffect(()=>{void load()},[load]);
 const filtered=products.filter(p=>(group==='All'||p.category===group)&&
  (!term||[p.name,p.supplier,p.category].join(' ').toLowerCase().includes(term.trim().toLowerCase())));
 const known=products.filter(p=>p.pack_price!==null).length;
 const outdated=products.filter(p=>p.pack_price!==null&&(days(p.price_observed_at)??999)>7).length;
 function open(p:Catalog,m:'stock'|'quote'){
  setSelected(p);setMode(m);setError('');setSuccess('');
  setUnits('0');setCost('');setSell(String(p.suggested_sale_price));
  setQuotePack('');setQuoteQty(String(p.pack_quantity||1));setQuoteSource('');
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!db||!selected||working)return;
  setError('');setSuccess('');setWorking(true);
  if(mode==='stock'){
   const count=Number(units),buy=Number(cost),sale=Number(sell);
   if(!Number.isSafeInteger(count)||count<0||!Number.isFinite(buy)||buy<0||!Number.isFinite(sale)||sale<=0){setError('Enter a nonnegative whole-unit quantity, a confirmed unit cost and a positive selling price.');setWorking(false);return}
   const result=await db.from('rcl_command_inventory').insert({
    name:selected.name.slice(0,120),unit_cost:Math.round(buy*100)/100,
    sale_price:Math.round(sale*100)/100,stock_count:count,reorder_at:Math.max(5,Math.min(30,Math.floor(count/3))),
   });
   if(result.error){setError(result.error.message);setWorking(false);return}
   setSuccess('Item added to the POS. Your entered cost is the purchasing cost; research prices never overwrite it.');
   if(onActivated)await onActivated();
  }else{
   const pack=Number(quotePack),qty=Number(quoteQty);
   if(!Number.isFinite(pack)||pack<=0||!Number.isSafeInteger(qty)||qty<1||!quoteSource.trim()){
    setError('Enter the actual quoted pack price, case quantity, and invoice or supplier quote reference.');setWorking(false);return;
   }
   const result=await db.from('rcl_command_concession_catalog').update({
    pack_price:Math.round(pack*100)/100,pack_quantity:qty,
    source_status:'operator_verified',price_observed_at:new Date().toISOString(),
    refresh_status:'needs_review',
    supplier_notes:(selected.supplier_notes||'').slice(0,1200)+' | Staff quote: '+quoteSource.trim().slice(0,190),
   }).eq('id',selected.id);
   if(result.error){setError(result.error.message);setWorking(false);return}
   setSuccess('Supplier quote recorded. The price history preserves the previous pack cost.');
   await load();
  }
  setWorking(false);
 }
 return <section className="cmd-panel cmd-purchase-panel">
  <header className="cmd-panel-heading"><div><p className="cmd-eyebrow">SOURCING DESK · WHOLESALE TO COUNTER</p><h3>Concession Playbook <span className="cmd-count">{products.length}</span></h3></div>
   <button className="cmd-add" type="button" onClick={()=>void load()} disabled={loading}>Refresh saved prices</button></header>
  <div className="cmd-wholesale-summary">
   <span><b>{known}</b> sourced pack-price references</span>
   <span><b>{products.length-known}</b> supplier quotes needed</span>
   <span><b>{outdated}</b> price references older than 7 days</span>
  </div>
  <div className="cmd-info cmd-sourcing-disclaimer"><b>How purchasing works:</b> Sam’s Club numbers are public online pack-price snapshots, not guaranteed Virginia checkout prices. A nightly price monitor only changes prices when a valid supplier product price is machine-verifiable. Restaurant Depot and US Foods CHEF’STORE (Cash & Carry) require a quotation or invoice. Actual POS unit costs are entered when staff receives inventory.</div>
  <div className="cmd-supplier-filter"><label><FaMagnifyingGlass size={13}/><input aria-label="Search concession item or supplier" placeholder="Search water, chips, hot dogs…" value={term} onChange={e=>setTerm(e.target.value)}/></label><select aria-label="Concession category" value={group} onChange={e=>setGroup(e.target.value)}>{filters.map(c=><option key={c} value={c}>{c==='All'?'All product categories':readable(c)}</option>)}</select></div>
  {loading?<div className="cmd-empty">Loading wholesale market snapshots…</div>:<div className="cmd-wholesale-grid">{filtered.map(p=>{
   const unit=p.pack_price===null?null:p.pack_price/p.pack_quantity;
   const gross=unit!==null?p.suggested_sale_price-unit:null;
   const age=days(p.price_observed_at);
   const source=url(p.supplier_product_url);
   return <article className="cmd-wholesale-card" key={p.id}>
    <div className="cmd-wholesale-top"><span>{readable(p.category).toUpperCase()}</span><span className={'cmd-wholesale-tag '+(unit===null?'need':'')}>{unit===null?'QUOTE REQUIRED':age!==null&&age>7?'RECHECK PRICE':'WEB REFERENCE'}</span></div>
    <h4>{p.name}</h4><p className="cmd-wholesale-supplier"><FaCartShopping size={11}/> {p.supplier}</p>
    <div className="cmd-wholesale-numbers">
      <div><small>CASE/PACK</small><strong>{unit===null?'Quote':money(p.pack_price!)} <span>{unit===null?'':'/'+p.pack_quantity+' units'}</span></strong></div>
      <div><small>UNIT COST REFERENCE</small><strong>{unit===null?'—':money(unit)}</strong></div>
      <div><small>SUGGESTED SELL</small><strong>{money(p.suggested_sale_price)}</strong></div>
      <div><small>POTENTIAL GROSS MARGIN</small><strong className="cmd-positive">{gross===null?'Unknown':Math.round(100*gross/p.suggested_sale_price)+'%'}</strong></div>
    </div>
    <small className="cmd-wholesale-fresh"><FaClockRotateLeft/> {age===null?'No wholesale price verified':age+' days since referenced price'} · {p.refresh_status.replaceAll('_',' ')}</small>
    <p className="cmd-wholesale-notes">{p.supplier_notes}</p>
    <div className="cmd-wholesale-actions">{source&&<a href={source} target="_blank" rel="noopener noreferrer">Supplier listing <FaArrowUpRightFromSquare size={10}/></a>}<button type="button" onClick={()=>open(p,'quote')}><FaPen size={10}/> Log price</button><button type="button" onClick={()=>open(p,'stock')}><FaBoxOpen size={10}/> Stock POS</button></div>
   </article>
  })}</div>}
  {!loading&&!filtered.length&&<div className="cmd-empty">No concession items match your search.</div>}
  {success&&<div className="cmd-notice" role="status">{success}</div>}
  {selected&&<div role="presentation" className="cmd-catalog-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setSelected(null)}}><section role="dialog" aria-modal="true" aria-label={mode==='stock'?'Add purchased inventory':'Record vendor price quote'} className="cmd-catalog-dialog">
    <div className="cmd-form-head"><div><p className="cmd-eyebrow">{mode==='stock'?'RECEIVED INVENTORY':'SUPPLIER PRICE EVIDENCE'}</p><h3>{selected.name}</h3></div><button type="button" className="cmd-close" onClick={()=>setSelected(null)} aria-label="Close">×</button></div>
    {error&&<p className="cmd-directory-error" role="alert"><FaCircleExclamation/>{error}</p>}
    {success&&<p className="cmd-notice"><FaCircleCheck/> {success}</p>}
    <form className="cmd-form-grid" onSubmit={e=>void submit(e)}>
    {mode==='stock'?<>
      <p className="cmd-fine cmd-wide">Enter the actual invoice unit cost paid for these individual items. The published reference is {selected.pack_price===null?'unknown':money(selected.pack_price/selected.pack_quantity)} per unit, excluding freight, spoilage and taxes. This form does not create a purchase or expense ledger entry.</p>
      <label className="cmd-field"><span>Units received</span><input type="number" min="0" step="1" value={units} onChange={e=>setUnits(e.target.value)} required/></label>
      <label className="cmd-field"><span>Actual invoice cost PER UNIT ($)</span><input type="number" min="0" step=".01" value={cost} onChange={e=>setCost(e.target.value)} required/></label>
      <label className="cmd-field"><span>Counter selling price per unit ($)</span><input type="number" min=".01" step=".01" value={sell} onChange={e=>setSell(e.target.value)} required/></label>
    </>:<>
      <p className="cmd-fine cmd-wide">Only record a quote or purchased pack price you directly verified from the listed supplier. This will update the research reference and add a price-history entry—not alter past sales or bought inventory.</p>
      <label className="cmd-field"><span>Supplier pack price ($)</span><input type="number" min=".01" step=".01" value={quotePack} onChange={e=>setQuotePack(e.target.value)} required/></label>
      <label className="cmd-field"><span>Units in pack</span><input type="number" min="1" step="1" value={quoteQty} onChange={e=>setQuoteQty(e.target.value)} required/></label>
      <label className="cmd-field cmd-wide"><span>Invoice, staff reference or quotation number</span><input maxLength={190} value={quoteSource} onChange={e=>setQuoteSource(e.target.value)} placeholder="Supplier receipt # or person + date" required/></label>
    </>}
    <div className="cmd-form-actions"><button className="cmd-button" disabled={working} type="submit">{working?'Saving…':mode==='stock'?'Add received inventory':'Save verified price'}</button><button type="button" className="cmd-text-button" onClick={()=>setSelected(null)}>Cancel</button></div>
    </form>
   </section></div>}
 </section>;
}
