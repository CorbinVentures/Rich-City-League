'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {FaBasketball,FaCrown,FaBolt,FaCompass,FaArrowRotateRight,FaLocationDot,FaShieldHalved,FaLayerGroup} from 'react-icons/fa6';
import type {AtlasPlace} from '@/components/discover/VirginiaInteractiveAtlas';
import {VIRGINIA_CITIES,type VirginiaCity} from '@/lib/virginia-world';
import {REAL_VIRGINIA_MAP} from '@/lib/runs-geography';
import {countyBounds} from '@/lib/virginia-geographic-bounds';
import './accurate-virginia-map.css';

/* MapLibre loaded as an explicitly pinned, existing UMD bundle. Its WebGL worker
 * is controlled by the app's existing worker-src blob: CSP; stylesheet is pinned
 * to the same exact version. No freehand image projection or invented lat/lon. */
const MAPLIBRE_JS='https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.1/dist/maplibre-gl.js';
const MAPLIBRE_CSS='https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.1/dist/maplibre-gl.css';
export type CommunityCourtLead={slug:string;name:string;locality:string;latitude:number;longitude:number};
type MapMarker={remove:()=>void};
type MapLike={
 on:(event:string,listener:(e?:any)=>void)=>void;
 once:(event:string,listener:()=>void)=>void;
 addSource:(id:string,source:any)=>void;
 addLayer:(layer:any)=>void;
 getSource:(id:string)=>any;
 fitBounds:(bounds:[[number,number],[number,number]],options:any)=>void;
 flyTo:(options:any)=>void;
 easeTo:(options:any)=>void;
 getZoom:()=>number;
 getCenter:()=>{lng:number;lat:number};
 getPitch:()=>number;
 getBearing:()=>number;
 resize:()=>void;
 remove:()=>void;
};
type MapLib={Map:new(options:any)=>MapLike;Marker:new(options?:any)=>{setLngLat:(coord:[number,number])=>{addTo:(map:MapLike)=>MapMarker}};NavigationControl:new(options?:any)=>any};
let loadingMapLibre:Promise<MapLib>|null=null;
function mapLibre(){
 if(typeof window==='undefined')return Promise.reject(new Error('Map unavailable on the server.'));
 const current=(window as any).maplibregl as MapLib|undefined;
 if(current)return Promise.resolve(current);
 if(loadingMapLibre)return loadingMapLibre;
 loadingMapLibre=new Promise<MapLib>((resolve,reject)=>{
  if(!document.querySelector('link[data-rch-maplibre]')){
   const link=document.createElement('link');link.rel='stylesheet';link.href=MAPLIBRE_CSS;
   link.setAttribute('data-rch-maplibre','1');document.head.appendChild(link);
  }
  const loaded=()=>{const lib=(window as any).maplibregl as MapLib|undefined;lib?resolve(lib):reject(new Error('Map engine failed to initialize.'));};
  let script=document.querySelector('script[data-rch-maplibre]') as HTMLScriptElement|null;
  if(script){if((window as any).maplibregl)loaded();else{script.addEventListener('load',loaded,{once:true});script.addEventListener('error',()=>reject(new Error('Map engine unavailable.')),{once:true});}return;}
  script=document.createElement('script');script.src=MAPLIBRE_JS;script.async=true;script.crossOrigin='anonymous';
  script.setAttribute('data-rch-maplibre','1');script.addEventListener('load',loaded,{once:true});
  script.addEventListener('error',()=>reject(new Error('Map engine unavailable. Check your connection.')),{once:true});
  document.head.appendChild(script);
 }).catch(error=>{loadingMapLibre=null;throw error;});
 return loadingMapLibre;
}
type Layer='all'|'courts'|'runs'|'battle'|'crown'|'double-rep';
const MAP_SESSION='rch-runs-world3-view-';
type SavedCamera={center:[number,number];zoom:number;pitch:number;bearing:number;at:number};
function savedCamera(key:string):SavedCamera|null{
 try{
  const raw=window.sessionStorage.getItem(MAP_SESSION+key);
  if(!raw)return null;
  const v=JSON.parse(raw) as SavedCamera;
  if(!Array.isArray(v.center)||v.center.length!==2||!Number.isFinite(v.center[0])||!Number.isFinite(v.center[1])||
    v.center[0]<-83.85||v.center[0]>-74.95||v.center[1]<36.4||v.center[1]>39.65||
    !Number.isFinite(v.zoom)||v.zoom<5.5||v.zoom>18||!Number.isFinite(v.pitch)||v.pitch<0||v.pitch>55||
    !Number.isFinite(v.bearing)||Math.abs(v.bearing)>180||!Number.isFinite(v.at)||Date.now()-v.at>86400000)return null;
  return v;
 }catch{return null;}
}
function saveCamera(map:MapLike,key:string){
 try{
  const position=map.getCenter();
  if(position.lng<-83.85||position.lng>-74.95||position.lat<36.4||position.lat>39.65)return;
  window.sessionStorage.setItem(MAP_SESSION+key,JSON.stringify({
   center:[position.lng,position.lat],zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing(),at:Date.now()
  } satisfies SavedCamera));
 }catch{/* Local session storage is optional. */}
}
const layerOptions:{id:Layer;label:string}[]=[
 {id:'all',label:'All'},{id:'courts',label:'Courts'},{id:'runs',label:'Runs'},
 {id:'battle',label:'Battles'},{id:'crown',label:'Crews'},{id:'double-rep',label:'2× REP'}
];
function pinLabel(point:AtlasPlace){
 if(point.gameState==='battle')return '⚔';
 if(point.gameState==='crown')return '♛';
 if(point.gameState==='double-rep')return '2×';
 return point.indoor?'🏟':'🏀';
}
function filteredPins(points:readonly AtlasPlace[],layer:Layer){
 if(layer==='all')return [...points];
 if(layer==='courts')return points.filter(p=>p.kind==='court');
 if(layer==='runs')return points.filter(p=>p.kind==='run');
 return points.filter(p=>p.gameState===layer);
}
function safeCoordinate(point:AtlasPlace){
 return Number.isFinite(point.lat)&&Number.isFinite(point.lon)&&
  point.lat>=36.4&&point.lat<=39.65&&point.lon>=-83.85&&point.lon<=-74.95;
}
export function AccurateVirginiaMap({city,points,selectedId,leads=[],areaGateways=VIRGINIA_CITIES,onCitySelect,onPlaceSelect,onOverview}:{
 city:VirginiaCity|null;points:AtlasPlace[];selectedId:string|null;leads?:CommunityCourtLead[];areaGateways?:VirginiaCity[];
 onCitySelect:(city:VirginiaCity)=>void;onPlaceSelect:(id:string)=>void;onOverview:()=>void
}){
 const container=useRef<HTMLDivElement|null>(null);
 const mapRef=useRef<MapLike|null>(null);
 const libRef=useRef<MapLib|null>(null);
 const markers=useRef<MapMarker[]>([]);
 const callbacks=useRef({onCitySelect,onPlaceSelect,onOverview});
 callbacks.current={onCitySelect,onPlaceSelect,onOverview};
 const [status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading');
 const [revision,setRevision]=useState(0);
 const [layer,setLayer]=useState<Layer>('all');
 const cityRef=useRef(city?.id||'statewide');
 cityRef.current=city?.id||'statewide';
 useEffect(()=>{
  try{
   const value=window.sessionStorage.getItem('rch-runs-world3-map-layer');
   if(layerOptions.some(l=>l.id===value))setLayer(value as Layer);
  }catch{/* Session storage is optional. */}
 },[]);
 const selectLayer=(next:Layer)=>{
  setLayer(next);
  try{window.sessionStorage.setItem('rch-runs-world3-map-layer',next);}catch{/* Optional. */}
 };
 const mapped=useMemo(()=>filteredPins(points,layer).filter(safeCoordinate),[points,layer]);
 const candidateCollection=useMemo(()=>({type:'FeatureCollection' as const,features:
  (layer==='all'||layer==='courts'?leads:[])
   .filter(l=>Number.isFinite(l.latitude)&&Number.isFinite(l.longitude)&&l.latitude>=36.4&&l.latitude<=39.65&&l.longitude>=-83.85&&l.longitude<=-74.95)
   .map(l=>({type:'Feature' as const,geometry:{type:'Point' as const,coordinates:[l.longitude,l.latitude]},
      properties:{slug:l.slug,name:l.name,locality:l.locality}}))
 }),[leads,layer]);
 const markerItems=useMemo(()=>mapped.map(p=>({p,key:p.id+':'+p.kind})),[mapped]);
 // One map per mount; changing region / markers never destroys the base tiles.
 useEffect(()=>{
  let disposed=false;
  let map:MapLike|null=null;
  setStatus('loading');
  void mapLibre().then(lib=>{
   if(disposed||!container.current)return;
   libRef.current=lib;
   map=new lib.Map({container:container.current,style:REAL_VIRGINIA_MAP.style,
    center:[-78.68,37.6],zoom:6.2,minZoom:5.5,maxZoom:18,pitch:20,maxPitch:55,
    bearing:0,attributionControl:true});
   mapRef.current=map;
   map.on('load',()=>{
    if(disposed||!map)return;
    setStatus('ready');
    // Community tips are a different, non-actionable layer. They are NOT
    // verified courts or precise facility pins.
    try{
     map.addSource('rch-unverified-leads',{type:'geojson',data:{type:'FeatureCollection',features:[]},cluster:true,clusterRadius:40,clusterMaxZoom:13});
     map.addLayer({id:'rch-lead-cluster',type:'circle',source:'rch-unverified-leads',filter:['has','point_count'],
      paint:{'circle-color':'#607b91','circle-opacity':0.53,'circle-stroke-color':'#c2d5de','circle-stroke-width':1,'circle-radius':['step',['get','point_count'],10,25,15,100,20]}});
     map.addLayer({id:'rch-lead-circles',type:'circle',source:'rch-unverified-leads',filter:['!',['has','point_count']],
      paint:{'circle-color':'#7c91a1','circle-opacity':0.48,'circle-radius':['interpolate',['linear'],['zoom'],5,2,13,6],'circle-stroke-color':'#cee1eb','circle-stroke-width':1}});
    }catch{/* Verified court markers still work independently. */}
    // The outline is sourced directly from the official 2026 Census
    // polygon. This must not be replaced with our old fictional SVG outline.
    try{
     map.addSource('rch-vdot-virginia',{type:'geojson',data:REAL_VIRGINIA_MAP.stateOutline});
     map.addLayer({id:'rch-vdot-outline',type:'line',source:'rch-vdot-virginia',
      paint:{'line-color':'#80D4FA','line-width':['interpolate',['linear'],['zoom'],5,1.7,11,3],
       'line-opacity':0.85}});
    }catch{/* Detailed basemap remains available when a GIS overlay is offline. */}
    if(city?.id==='chesterfield')try{
     map.addSource('rch-chesterfield-vgin',{type:'geojson',data:REAL_VIRGINIA_MAP.chesterfieldJurisdiction});
     map.addLayer({id:'rch-chesterfield-fill',type:'fill',source:'rch-chesterfield-vgin',filter:['==',['get','GEOID'],'51041'],
      paint:{'fill-color':'#47A7E8','fill-opacity':0.09}});
     map.addLayer({id:'rch-chesterfield-line',type:'line',source:'rch-chesterfield-vgin',filter:['==',['get','GEOID'],'51041'],
      paint:{'line-color':'#9BDAFF','line-width':2.4,'line-dasharray':[2,2]}});
    }catch{/* Do not claim verified county outline if GIS data is unavailable. */}
    const remembered=savedCamera(cityRef.current);
    if(remembered)map.easeTo({...remembered,center:remembered.center,duration:0});
    else if(city)map.fitBounds([[city.lon-0.16,city.lat-0.12],[city.lon+0.16,city.lat+0.12]],{padding:30,duration:0});
    else map.fitBounds([[-83.75,36.45],[-75.05,39.55]],{padding:22,duration:0});
    map.on('moveend',()=>{if(!disposed&&map)saveCamera(map,cityRef.current);});
   });
   map.on('error',(e:any)=>{if(e?.error?.message&&/style|source|failed to fetch/i.test(e.error.message))setStatus(s=>s==='ready'?s:'unavailable');});
  }).catch(()=>{if(!disposed)setStatus('unavailable');});
  return()=>{disposed=true;if(map)saveCamera(map,cityRef.current);markers.current.forEach(m=>m.remove());markers.current=[];map?.remove();mapRef.current=null;};
 },[revision]);

 useEffect(()=>{
  const map=mapRef.current;if(!map||status!=='ready')return;
  const remembered=savedCamera(city?.id||'statewide');
  const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:650;
  if(city){
   if(remembered)map.easeTo({center:remembered.center,zoom:remembered.zoom,pitch:remembered.pitch,bearing:remembered.bearing,duration});
   else map.fitBounds([[city.lon-0.15,city.lat-0.11],[city.lon+0.15,city.lat+0.11]],{padding:40,duration});
   if(city.id==='chesterfield'&&!map.getSource('rch-chesterfield-vgin'))try{
    map.addSource('rch-chesterfield-vgin',{type:'geojson',data:REAL_VIRGINIA_MAP.chesterfieldJurisdiction});
    map.addLayer({id:'rch-chesterfield-fill',type:'fill',source:'rch-chesterfield-vgin',paint:{'fill-color':'#47A7E8','fill-opacity':0.09}});
    map.addLayer({id:'rch-chesterfield-line',type:'line',source:'rch-chesterfield-vgin',paint:{'line-color':'#9BDAFF','line-width':2.4,'line-dasharray':[2,2]}});
   }catch{/* map still remains geographically referenced */}
  }else if(remembered)map.easeTo({center:remembered.center,zoom:remembered.zoom,pitch:remembered.pitch,bearing:remembered.bearing,duration});
  else map.fitBounds([[-83.75,36.45],[-75.05,39.55]],{padding:24,duration});
 },[city?.id,status]);
 useEffect(()=>{
  if(!city||!['chesterfield','henrico','arlington','prince-william','shenandoah'].includes(city.id)||status!=='ready')return;
  let current=true;
  const map=mapRef.current;
  void fetch('/api/geo/virginia?layer=counties',{cache:'force-cache'})
   .then(r=>{if(!r.ok)throw Error('official counties unavailable');return r.json();})
   .then(data=>{
    if(!current||!map)return;
    const code=({chesterfield:'51041',henrico:'51087',arlington:'51013','prince-william':'51153',shenandoah:'51171'} as Record<string,string>)[city.id];
    const limits=countyBounds(data,code);
    if(limits)map.fitBounds(limits,{padding:45,duration:750});
   }).catch(()=>{/* Retain a navigable center when the official geometry is offline. */});
  return()=>{current=false;};
 },[city?.id,status]);
 useEffect(()=>{
  const map=mapRef.current,lib=libRef.current;
  if(!map||!lib||status!=='ready')return;
  markers.current.forEach(m=>m.remove());markers.current=[];
  // At statewide zoom, city gateways are centered on actual coordinates.
  // Court markers are never moved to a city center as a fallback.
  if(!city){
   const gateways=areaGateways.filter(c=>c.major||['arlington','henrico','prince-william','shenandoah'].includes(c.id));
   for(const point of gateways){
    const btn=document.createElement('button');btn.type='button';btn.className='rwg-real-city';
    btn.textContent=point.name;btn.title='Explore '+point.name;btn.setAttribute('aria-label','Explore '+point.name);
    btn.addEventListener('click',()=>callbacks.current.onCitySelect(point));
    markers.current.push(new lib.Marker({element:btn,anchor:'bottom'}).setLngLat([point.lon,point.lat]).addTo(map));
   }
  }else{
   for(const point of markerItems){
    const p=point.p;
    const btn=document.createElement('button');btn.type='button';
    btn.className='rwg-real-pin'+(p.gameState?' state-'+p.gameState:'')+(p.id===selectedId?' selected':'');
    btn.textContent=pinLabel(p);btn.title=p.title;
    btn.setAttribute('aria-label',p.title+(p.indoor?' indoor basketball gym':' basketball court'))
    btn.setAttribute('aria-pressed',String(p.id===selectedId));
    btn.addEventListener('click',()=>callbacks.current.onPlaceSelect(p.id));
    markers.current.push(new lib.Marker({element:btn,anchor:'bottom'}).setLngLat([p.lon,p.lat]).addTo(map));
   }
  }
 },[city?.id,markerItems,selectedId,status,areaGateways]);
 useEffect(()=>{
  const source=mapRef.current?.getSource('rch-unverified-leads');
  if(status==='ready'&&source?.setData)source.setData(candidateCollection);
 },[candidateCollection,status]);
 useEffect(()=>{
  if(!selectedId||status!=='ready')return;
  const point=points.find(p=>p.id===selectedId);
  if(point&&safeCoordinate(point))mapRef.current?.flyTo({center:[point.lon,point.lat],zoom:Math.max(12,mapRef.current.getZoom()),
   speed:1.2,offset:window.matchMedia('(max-width: 700px)').matches?[0,-150]:[-175,0],
   essential:false,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:650});
 },[selectedId,status]);
 const retry=useCallback(()=>setRevision(v=>v+1),[]);
 return <div className='rwg-real-map-shell' aria-label='Georeferenced Virginia basketball map'>
  <div ref={container} className='rwg-real-map' role='application' aria-label='Interactive Virginia streets, waterways, jurisdictions and court locations'/>
  {status==='loading'&&<div role='status' className='rwg-real-map-cover'><FaCompass/> Loading real Virginia streets and terrain…</div>}
  {status==='unavailable'&&<div role='alert' className='rwg-real-map-cover'><FaLocationDot/>
   <strong>The geographic map is temporarily unavailable.</strong>
   <span>Verified court and event details remain in the searchable lists below. No approximate pins will be invented.</span>
   <button type='button' onClick={retry}><FaArrowRotateRight/> Retry map</button>
  </div>}
  <div className='rwg-real-map-top'>
   <span><FaLocationDot/> {city?city.name:'Commonwealth of Virginia'}</span>
   {city&&<button type='button' onClick={onOverview}>View Virginia</button>}
  </div>
  <div className='rwg-real-map-layers' role='group' aria-label='Basketball map layers'>
   <FaLayerGroup aria-hidden='true'/>
   {layerOptions.map(option=><button key={option.id} type='button' aria-pressed={layer===option.id} onClick={()=>selectLayer(option.id)}>{option.label}</button>)}
  </div>
  {status==='ready'&&city&&points.length===0&&<div className='rwg-map-zero' role='status'>No precision-verified court pins in this area yet. See court records below for facilities awaiting coordinates.</div>}
  <div className='rwg-real-map-lead-key'>● Gray = community tip, <strong>not a verified court</strong> ({leads.length.toLocaleString()} mapped leads)</div>
  <div className='rwg-real-map-credit'>Live georeferenced map · OpenFreeMap / OpenStreetMap · 2026 U.S. Census state and county borders</div>
 </div>;
}
