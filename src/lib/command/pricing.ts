// Public supplier-page price adapter. Never infer prices from unrelated sponsored
// items, hidden checkout amounts, or generic search snippets.
type Offer={price?:number|string;priceCurrency?:string;lowPrice?:number|string;url?:string};
type StructuredProduct={['@type']?:string|string[];name?:string;offers?:Offer|Offer[]};
function flat(v:unknown):Record<string,unknown>[]{
 if(Array.isArray(v))return v.flatMap(flat);
 if(!v||typeof v!=='object')return [];
 const a=v as Record<string,unknown>;
 return [...(a['@graph']?flat(a['@graph']):[]),a];
}
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(v=>v.length>2&&!['pack','bottles','full','size','variety','sams','club','original','snack','bags','with','case','soft','drink'].includes(v));
function matchesProduct(label:string,source:string):boolean{
 const a=new Set(norm(label)),b=new Set(norm(source));
 let overlap=0;for(const word of a)if(b.has(word))overlap++;
 return overlap>=2 || (overlap===1 && a.size===1);
}
export function verifiedPublicProductPrice(html:string,expectedName:string,expectedPackQuantity?:number):number|null{
 const matches=[...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
 for(const raw of matches){
  try{
   const parsed=JSON.parse(raw[1]);
   for(const obj of flat(parsed)){
    const kind=obj['@type'];
    const isProduct=typeof kind==='string'?kind.toLowerCase().includes('product'):Array.isArray(kind)&&kind.some(x=>String(x).toLowerCase().includes('product'));
    if(!isProduct)continue;
    const item=obj as StructuredProduct;
    if(!item.name||!matchesProduct(expectedName,item.name))continue;
    if(expectedPackQuantity && !new RegExp('\\b'+expectedPackQuantity+'\\b').test(item.name))continue;
    const offers=Array.isArray(item.offers)?item.offers:[item.offers];
    for(const offer of offers){
     if(!offer||typeof offer!=='object')continue;
     if(offer.priceCurrency && String(offer.priceCurrency).toUpperCase()!=='USD')continue;
     const value=Number(offer.price);
     if(Number.isFinite(value)&&value>=0.10&&value<=10000)return Math.round(value*100)/100;
    }
   }
  }catch{continue}
 }
 return null;
}
export function allowedSupplierUrl(value:string,supplier:string):URL|null{
 if(supplier!=="Sam's Club")return null;
 try{
  const u=new URL(value);
  if(u.protocol!=='https:'||!['www.samsclub.com','samsclub.com'].includes(u.hostname)||!u.pathname.startsWith('/ip/'))return null;
  return u;
 }catch{return null}
}
export async function observeSupplierPrice(sourceUrl:string,productName:string,supplier:string,packQuantity?:number):
 Promise<{price:number|null;status:'found'|'unavailable'}>{
 const url=allowedSupplierUrl(sourceUrl,supplier);
 if(!url)return {price:null,status:'unavailable'};
 try{
  const response=await fetch(url,{cache:'no-store',redirect:'follow',signal:AbortSignal.timeout(6500),headers:{'Accept':'text/html','User-Agent':'Mozilla/5.0 (compatible; RCLPriceVerifier/1.0; official product-price lookup)'}});
  if(!response.ok)return {price:null,status:'unavailable'};
  const final=new URL(response.url);
  if(!['www.samsclub.com','samsclub.com'].includes(final.hostname))return {price:null,status:'unavailable'};
  const contentType=response.headers.get('content-type')||'';
  if(!contentType.includes('text/html'))return {price:null,status:'unavailable'};
  const html=(await response.text()).slice(0,2500000);
  const price=verifiedPublicProductPrice(html,productName,packQuantity);
  return {price,status:price===null?'unavailable':'found'};
 }catch{return {price:null,status:'unavailable'}}
}
