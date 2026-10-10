'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { VIRGINIA_CITIES, cityForText, milesBetween, virginiaCoordinates, type GeoPosition, type VirginiaCity } from '@/lib/virginia-world';
import {
  FaArrowLeft, FaArrowRight, FaCalendarDays, FaCompass,
  FaCrosshairs, FaFilter, FaLayerGroup, FaLocationDot, FaMagnifyingGlass,
  FaRotate, FaXmark
} from 'react-icons/fa6';
import './virginia-world.css';

type Kind = 'run'|'event'|'court';
type Filter = 'all'|'events'|'runs'|'training'|'courts';
type WorldPoint = {
  id:string; kind:Kind; title:string; detail:string; city:string;
  lat:number; lon:number; precision:'venue'|'city'; href:string;
  startsAt?:string; access?:string; verified?:string; description?:string;
  type?:string; slug?:string;
};
type CourtRow = {
  slug:string; name:string; address:string; locality:string; area:string;
  latitude:number|null; longitude:number|null; venue_type:string;
  verification_status:string; access_type:string; notes:string|null;
};
type View = {lat:number; lon:number; zoom:number};
type MapInstance = any;
const MAPLIBRE_JS='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
const MAPLIBRE_CSS='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';
const WORLD_STYLE='https://tiles.openfreemap.org/styles/dark';
const atlasPosition=(lat:number,lon:number)=>({left:((lon+84.15)/9.7*100).toFixed(2)+'%',top:((39.75-lat)/3.6*100).toFixed(2)+'%'});
const INITIAL:View={lat:37.55,lon:-79.35,zoom:6.7};
const FILTERS:{id:Filter;label:string}[]=[
  {id:'all',label:'Everything'},{id:'events',label:'Events'},
  {id:'runs',label:'Open runs'},{id:'training',label:'Training'},{id:'courts',label:'Courts & parks'}
];
let libraryPromise:Promise<any>|null=null;

function loadMapLibrary():Promise<any> {
  if(typeof window==='undefined') return Promise.reject(new Error('Browser required'));
  const w=window as Window & {maplibregl?:any};
  if(w.maplibregl) return Promise.resolve(w.maplibregl);
  if(libraryPromise) return libraryPromise;
  libraryPromise=new Promise((resolve,reject)=>{
    if(!document.querySelector('link[data-rch-world-css]')) {
      const link=document.createElement('link'); link.rel='stylesheet'; link.href=MAPLIBRE_CSS;
      link.dataset.rchWorldCss='true'; document.head.appendChild(link);
    }
    const script=document.createElement('script');
    script.src=MAPLIBRE_JS; script.async=true; script.crossOrigin='anonymous';
    script.onload=()=>w.maplibregl ? resolve(w.maplibregl) : reject(new Error('The 3D map engine did not initialize'));
    script.onerror=()=>reject(new Error('The map engine could not be loaded'));
    document.head.appendChild(script);
  }).catch(error=>{libraryPromise=null;throw error});
  return libraryPromise;
}

function formatWhen(iso?:string) {
  if(!iso) return '';
  const d=new Date(iso);
  return Number.isNaN(d.getTime())?'':d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}
function safeMapUrl(point:WorldPoint) {
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(point.lat+','+point.lon);
}
function pointMatchesFilter(p:WorldPoint,filter:Filter) {
  if(filter==='all') return true;
  if(filter==='events') return p.kind==='event';
  if(filter==='runs') return p.kind==='run' && p.type!=='training';
  if(filter==='training') return p.kind==='run' && p.type==='training';
  return p.kind==='court';
}
function featureCollection(points:WorldPoint[]) {
  return {type:'FeatureCollection',features:points.map(p=>({
    type:'Feature',geometry:{type:'Point',coordinates:[p.lon,p.lat]},
    properties:{id:p.id,kind:p.kind,precision:p.precision}
  }))};
}
function cityMarker(city:VirginiaCity,onOpen:()=>void) {
  const el=document.createElement('button');
  el.type='button';
  el.className='rch-world-city '+(city.major?'rch-world-city-major':'rch-world-city-minor');
  el.setAttribute('aria-label','Explore '+city.name+', Virginia');
  const icon=document.createElement('span');icon.className='rch-world-city-landmark';
  icon.textContent=city.symbol;icon.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.className='rch-world-city-name';label.textContent=city.name;
  el.append(icon,label);el.onclick=onOpen;
  return el;
}
function tintMap(map:MapInstance) {
  const layers=map.getStyle()?.layers ?? [];
  for(const layer of layers) {
    try {
      const id=layer.id.toLowerCase();
      if(layer.type==='background') map.setPaintProperty(layer.id,'background-color','#07111d');
      if(layer.type==='fill'&&/water|ocean|sea|lake/.test(id)) map.setPaintProperty(layer.id,'fill-color','#0b2846');
      if(layer.type==='fill'&&/park|landcover|landuse|forest|grass/.test(id)) map.setPaintProperty(layer.id,'fill-color','#102c25');
      if(layer.type==='line'&&/road|highway|motorway/.test(id)) {
        map.setPaintProperty(layer.id,'line-color','#d69a5f');
        map.setPaintProperty(layer.id,'line-opacity',0.55);
      }
      if(layer.type==='symbol'&&/label|place|poi/.test(id)) map.setPaintProperty(layer.id,'text-color','#b9d2ea');
    } catch { /* Some third-party style expressions are immutable. */ }
  }
  // Real 3D building extrusions appear only when the style supplies building polygons and heights.
  const buildings=layers.find((layer:any)=>layer['source-layer']==='building' && layer.source);
  if(buildings && !map.getLayer('rch-world-3d-buildings')) {
    try {
      map.addLayer({
        id:'rch-world-3d-buildings',type:'fill-extrusion',source:buildings.source,
        'source-layer':'building',minzoom:13,
        paint:{
          'fill-extrusion-color':'#3e6888',
          'fill-extrusion-height':['interpolate',['linear'],['zoom'],13,0,15,
            ['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],12]],
          'fill-extrusion-base':['coalesce',['to-number',['get','render_min_height']],0],
          'fill-extrusion-opacity':0.72
        }
      });
    } catch { /* City navigation remains available without building heights. */ }
  }
}
function addLayers(map:MapInstance) {
  if(map.getSource('rch-world-points')) return;
  map.addSource('rch-world-points',{type:'geojson',data:featureCollection([]),cluster:true,clusterMaxZoom:14,clusterRadius:44});
  map.addLayer({id:'rch-world-cluster-glow',type:'circle',source:'rch-world-points',filter:['has','point_count'],
    paint:{'circle-color':'#3174eb','circle-radius':['step',['get','point_count'],23,15,29,80,35],'circle-opacity':0.25,'circle-blur':0.35}});
  map.addLayer({id:'rch-world-clusters',type:'circle',source:'rch-world-points',filter:['has','point_count'],
    paint:{'circle-color':'#1d63c9','circle-stroke-color':'#9ed9ff','circle-stroke-width':2,
      'circle-radius':['step',['get','point_count'],15,15,20,80,26]}});
  map.addLayer({id:'rch-world-cluster-count',type:'symbol',source:'rch-world-points',filter:['has','point_count'],
    layout:{'text-field':['get','point_count_abbreviated'],'text-size':12},
    paint:{'text-color':'#ffffff'}});
  map.addLayer({id:'rch-world-pin-halo',type:'circle',source:'rch-world-points',filter:['!',['has','point_count']],
    paint:{'circle-color':['match',['get','kind'],'run','#ffb84d','event','#ff784e','#64a9ff'],
      'circle-radius':15,'circle-opacity':0.18,'circle-blur':0.4}});
  map.addLayer({id:'rch-world-pins',type:'circle',source:'rch-world-points',filter:['!',['has','point_count']],
    paint:{'circle-color':['match',['get','kind'],'run','#ffb84d','event','#ff784e','#4b9dff'],
      'circle-radius':['interpolate',['linear'],['zoom'],6,5,12,9,16,11],
      'circle-stroke-width':2,'circle-stroke-color':'#ffffff'}});
}
async function readAllUpcoming(db:any,table:'runs'|'network_events',now:string) {
  const all:any[]=[];
  for(let from=0;from<2000;from+=250) {
    const query=table==='runs'
      ? db.from('runs').select('id,title,location,location_slug,starts_at,run_type,status').in('status',['open','full']).gt('starts_at',now)
      : db.from('network_events').select('id,slug,title,event_type,city,state,venue_name,starts_at,description').eq('status','published').gte('starts_at',now).eq('state','VA');
    const {data,error}=await query.order('starts_at',{ascending:true}).range(from,from+249);
    if(error) throw error;
    all.push(...(data??[]));
    if((data??[]).length<250) break;
  }
  return all;
}

export default function VirginiaWorld() {
  const hostRef=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<MapInstance|null>(null);
  const cityPinsRef=useRef<Array<{remove:()=>void;getElement:()=>HTMLElement}>>([]);
  const userPinRef=useRef<{remove:()=>void}|null>(null);
  const positionWatchRef=useRef<number|null>(null);
  const [mapReady,setMapReady]=useState(false);
  const [tilesReady,setTilesReady]=useState(false);
  const [mapMode,setMapMode]=useState<'atlas'|'3d'>('atlas');
  const [mapFailure,setMapFailure]=useState(false);
  const [mapError,setMapError]=useState('');
  const [dataError,setDataError]=useState('');
  const [filter,setFilter]=useState<Filter>('all');
  const [query,setQuery]=useState('');
  const [cityId,setCityId]=useState<string|null>(null);
  const [view,setView]=useState<View>(INITIAL);
  const [activities,setActivities]=useState<WorldPoint[]>([]);
  const [courts,setCourts]=useState<WorldPoint[]>([]);
  const [searchCourts,setSearchCourts]=useState<WorldPoint[]>([]);
  const [starterCourts,setStarterCourts]=useState<WorldPoint[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [userLocation,setUserLocation]=useState<GeoPosition|null>(null);
  const [locationError,setLocationError]=useState('');
  const [loadingCourts,setLoadingCourts]=useState(false);
  const [moreCourts,setMoreCourts]=useState(false);
  const [courtLimit,setCourtLimit]=useState(300);
  const [loadingData,setLoadingData]=useState(true);
  const allPoints=useMemo(()=>{
    const unique=new Map<string,WorldPoint>();
    for(const point of [...activities,...courts,...searchCourts,...starterCourts])unique.set(point.id,point);
    return [...unique.values()];
  },[activities,courts,searchCourts,starterCourts]);
  const selected=allPoints.find(p=>p.id===selectedId)??null;
  const fallbackCities=useMemo(()=>VIRGINIA_CITIES.filter(c=>['richmond','roanoke','bristol','charlottesville','fredericksburg','alexandria','norfolk','virginia-beach'].includes(c.id)),[]);
  const mapShown=mapMode==='3d'&&mapReady&&tilesReady&&!mapFailure;
  const cityMapPoints=useMemo(()=>allPoints.filter(p=>p.kind!=='court'||Boolean(cityId)).filter(p=>!cityId || milesBetween(p,VIRGINIA_CITIES.find(c=>c.id===cityId)!)<32).slice(0,36),[allPoints,cityId]);
  const shown=useMemo(()=>allPoints.filter(p=>pointMatchesFilter(p,filter) &&
    (!query.trim() || (p.title+' '+p.city+' '+p.detail).toLowerCase().includes(query.trim().toLowerCase()))
  ),[allPoints,filter,query]);
  const city=VIRGINIA_CITIES.find(c=>c.id===cityId)??null;
  const displayed=useMemo(()=>shown
    .filter(p=>!city || milesBetween(p,city)<32)
    .filter(p=>p.kind!=='court'||!(/\bOSM\b|^Basketball Court ·|^Fairfax County Basketball Court #/i.test(p.title)))
    .sort((a,b)=>userLocation
      ? milesBetween(a,userLocation)-milesBetween(b,userLocation)
      : a.startsAt && b.startsAt ? a.startsAt.localeCompare(b.startsAt) : a.kind==='court'?1:-1)
    .slice(0,18),[shown,userLocation,city]);

  const moveCity=useCallback((target:VirginiaCity)=>{
    const map=mapRef.current;
    setCityId(target.id);setSelectedId(null);setCourtLimit(300);
    if(map) map.flyTo({center:[target.lon,target.lat],zoom:12.2,pitch:63,bearing:-22,duration:1250});
  },[]);
  const overview=useCallback(()=>{
    setCityId(null);setSelectedId(null);setCourtLimit(300);
    mapRef.current?.flyTo({center:[INITIAL.lon,INITIAL.lat],zoom:INITIAL.zoom,pitch:43,bearing:-10,duration:1300});
  },[]);
  const startLocation=useCallback((fly:boolean)=>{
    if(!('geolocation' in navigator)){setLocationError('Location services are not available on this device.');return;}
    if(positionWatchRef.current!==null) navigator.geolocation.clearWatch(positionWatchRef.current);
    setLocationError('');
    positionWatchRef.current=navigator.geolocation.watchPosition(
      position=>{
        const lat=position.coords.latitude,lon=position.coords.longitude;
        setUserLocation({lat,lon});
        if(mapRef.current){
          userPinRef.current?.remove();
          const dot=document.createElement('span');dot.className='rch-world-you';dot.title='Your approximate location';
          const lib=(window as Window & {maplibregl?:any}).maplibregl;
          if(lib) userPinRef.current=new lib.Marker({element:dot}).setLngLat([lon,lat]).addTo(mapRef.current);
          if(fly) mapRef.current.flyTo({center:[lon,lat],zoom:12.4,pitch:56,duration:1100});
        }
      },()=>setLocationError('Location access is unavailable or was declined. Choose a city to explore.'),
      {enableHighAccuracy:false,maximumAge:60000,timeout:12000});
  },[]);

  useEffect(()=>{
    let active=true;let map:MapInstance|null=null;
    loadMapLibrary().then(lib=>{
      if(!active||!hostRef.current)return;
      map=new lib.Map({container:hostRef.current,style:WORLD_STYLE,center:[INITIAL.lon,INITIAL.lat],
        zoom:INITIAL.zoom,minZoom:5,maxZoom:18,pitch:43,bearing:-10,maxPitch:75,antialias:true,
        attributionControl:true});
      mapRef.current=map;
      map.addControl(new lib.NavigationControl({showCompass:true}),'top-right');
      map.on('sourcedata',(event:any)=>{
        if(!active)return;
        if(event.sourceId==='openmaptiles' && event.sourceDataType==='content')setTilesReady(true);
      });
      map.on('load',()=>{
        if(!active)return;
        tintMap(map);addLayers(map);
        cityPinsRef.current=VIRGINIA_CITIES.map(c=>new lib.Marker({
          element:cityMarker(c,()=>moveCity(c)),anchor:'bottom'
        }).setLngLat([c.lon,c.lat]).addTo(map));
        const toggleCityLabels=()=>{
          const zoom=map.getZoom();
          cityPinsRef.current.forEach((marker,index)=>{
            const c=VIRGINIA_CITIES[index];
            marker.getElement().style.display=(zoom<10 && (c.major||zoom>=8))?'':'none';
          });
        };
        toggleCityLabels();map.on('zoom',toggleCityLabels);
        map.on('moveend',()=>{
          const center=map.getCenter();
          setView({lat:center.lat,lon:center.lng,zoom:map.getZoom()});
        });
        map.on('click','rch-world-clusters',(event:any)=>{
          const f=event.features?.[0],source=map.getSource('rch-world-points');
          if(f&&source?.getClusterExpansionZoom) {
            source.getClusterExpansionZoom(f.properties.cluster_id)
              .then((zoom:number)=>map.easeTo({center:f.geometry.coordinates,zoom,duration:700}))
              .catch(()=>map.easeTo({center:f.geometry.coordinates,zoom:map.getZoom()+2,duration:700}));
          }
        });
        map.on('click','rch-world-pins',(event:any)=>{
          const f=event.features?.[0];
          if(f) setSelectedId(f.properties.id);
        });
        for(const layer of ['rch-world-clusters','rch-world-pins']) {
          map.on('mouseenter',layer,()=>{map.getCanvas().style.cursor='pointer';});
          map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor='';});
        }
        setMapReady(true);
      });
      map.on('error',(event:any)=>{
        if(!active)return;
        if(event?.error) {
          setMapFailure(true);
          setMapMode('atlas');
          setMapError('3D map tiles could not load. Virginia Atlas remains available.');
        }
      });
    }).catch(()=>{if(active){setMapFailure(true);setMapError('3D mode is unavailable here. The Virginia Atlas is still interactive.');}});
    if(navigator.permissions?.query) {
      navigator.permissions.query({name:'geolocation'}).then(status=>{
        if(active&&status.state==='granted') startLocation(false);
      }).catch(()=>{});
    }
    return ()=>{
      active=false;
      if(positionWatchRef.current!==null) navigator.geolocation.clearWatch(positionWatchRef.current);
      userPinRef.current?.remove();
      cityPinsRef.current.forEach(marker=>marker.remove());
      cityPinsRef.current=[];
      map?.remove();
      mapRef.current=null;
    };
  },[moveCity,startLocation]);

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      const db=getSupabaseClient() as any;
      if(!db){if(!cancelled){setDataError('Discovery data is unavailable.');setLoadingData(false);}return;}
      try{
        const now=new Date().toISOString();
        const [runs,events]=await Promise.all([
          readAllUpcoming(db,'runs',now),readAllUpcoming(db,'network_events',now)
        ]);
        const slugs=[...new Set(runs.map((r:any)=>r.location_slug).filter(Boolean))].slice(0,500);
        const linked:any[]=[];
        for(let i=0;i<slugs.length;i+=100){
          const {data}=await db.from('basketball_locations')
            .select('slug,name,locality,latitude,longitude').in('slug',slugs.slice(i,i+100));
          linked.push(...(data??[]));
        }
        const bySlug=new Map(linked.map((r:any)=>[r.slug,r]));
        const next:WorldPoint[]=[];
        for(const r of runs){
          const site:any=bySlug.get(r.location_slug),place=cityForText(site?.locality||r.location);
          const exact=virginiaCoordinates(site?.latitude,site?.longitude);
          if(!exact&&!place)continue;
          next.push({
            id:'run:'+r.id,kind:'run',title:r.title,detail:site?.name||r.location,
            city:site?.locality||place?.name||'Virginia',lat:exact?site.latitude:place!.lat,
            lon:exact?site.longitude:place!.lon,precision:exact?'venue':'city',
            href:'/runs/'+encodeURIComponent(r.id),startsAt:r.starts_at,
            type:r.run_type,description:r.run_type==='training'?'Training session':'Open basketball run'
          });
        }
        for(const e of events){
          const place=cityForText(e.city);
          if(!place)continue; // Do not invent coordinates for unknown locations.
          next.push({
            id:'event:'+e.id,kind:'event',title:e.title,
            detail:e.venue_name||'Venue information in event details',city:place.name,
            lat:place.lat,lon:place.lon,precision:'city',
            href:['/network','events',encodeURIComponent(e.slug)].join('/'),
            startsAt:e.starts_at,type:e.event_type,description:e.description
          });
        }
        if(!cancelled)setActivities(next);
      }catch{
        if(!cancelled)setDataError('Upcoming activity could not be loaded. Please try again later.');
      }finally{if(!cancelled)setLoadingData(false);}
    }
    load();
    return()=>{cancelled=true;};
  },[]);

  useEffect(()=>{
    if(!mapReady)return;
    const source=mapRef.current?.getSource('rch-world-points');
    const searchIds=new Set(searchCourts.map(p=>p.id));
    if(source?.setData)source.setData(featureCollection(shown.filter(p=>view.zoom>=9.2 || p.kind!=='court' || searchIds.has(p.id))));
  },[mapReady,shown,searchCourts,view.zoom]);

  // Show named, usable locations immediately, without depending on GPS or a 3D map.
  useEffect(()=>{
    let cancelled=false;
    async function loadStarterCourts(){
      const db=getSupabaseClient() as any;
      if(!db)return;
      const {data,error}=await db.rpc('search_run_venues',{p_search:'',p_limit:40});
      if(cancelled||error)return;
      setStarterCourts(((data??[]) as CourtRow[]).filter(row=>virginiaCoordinates(row.latitude,row.longitude))
        .map(row=>({
          id:'court:'+row.slug,kind:'court' as const,title:row.name,detail:row.address,
          city:row.locality,lat:row.latitude!,lon:row.longitude!,precision:'venue' as const,
          href:'/runs?court='+encodeURIComponent(row.slug),access:row.access_type,
          verified:row.verification_status,type:row.venue_type,slug:row.slug
        })));
    }
    loadStarterCourts();
    return()=>{cancelled=true;};
  },[]);

  // Statewide court search works even before a user flies into a city.
  useEffect(()=>{
    const search=query.trim();
    if(search.length<3){setSearchCourts([]);return;}
    let cancelled=false;
    const timer=window.setTimeout(async()=>{
      const db=getSupabaseClient() as any;
      if(!db)return;
      const {data,error}=await db.rpc('search_basketball_locations',{
        p_lat:null,p_lon:null,p_radius_miles:15,p_search:search,p_limit:100,p_offset:0
      });
      if(cancelled||error)return;
      setSearchCourts(((data??[]) as CourtRow[]).filter(row=>virginiaCoordinates(row.latitude,row.longitude))
        .map(row=>({
          id:'court:'+row.slug,kind:'court' as const,title:row.name,detail:row.address,
          city:row.locality,lat:row.latitude!,lon:row.longitude!,precision:'venue' as const,
          href:'/runs?court='+encodeURIComponent(row.slug),access:row.access_type,
          verified:row.verification_status,type:row.venue_type,slug:row.slug
        })));
    },280);
    return()=>{cancelled=true;window.clearTimeout(timer);};
  },[query]);

  useEffect(()=>{
    if(!cityId && (!mapReady || view.zoom<9.2)){setCourts([]);setMoreCourts(false);setLoadingCourts(false);return;}
    let cancelled=false;
    const timer=window.setTimeout(async()=>{
      const db=getSupabaseClient() as any;if(!db)return;
      setLoadingCourts(true);
      try{
        const map=mapRef.current;
        const selectedCity=VIRGINIA_CITIES.find(item=>item.id===cityId);
        if(!map && !selectedCity)return;
        const center=selectedCity?{lat:selectedCity.lat,lng:selectedCity.lon}:map.getCenter();
        const bounds=map?.getBounds();
        const radius=selectedCity?26:Math.min(140,Math.max(2,Math.ceil(milesBetween(
          {lat:center.lat,lon:center.lng},{lat:bounds.getNorthEast().lat,lon:bounds.getNorthEast().lng}))));
        const result:CourtRow[]=[];
        let full=false;
        for(let offset=0;offset<courtLimit;offset+=100){
          const {data,error}=await db.rpc('search_basketball_locations',{
            p_lat:center.lat,p_lon:center.lng,p_radius_miles:radius,
            p_search:'',p_limit:100,p_offset:offset
          });
          if(error)throw error;
          const page=(data??[]) as CourtRow[];result.push(...page);
          if(page.length<100){full=false;break;}
          full=true;
        }
        if(cancelled)return;
        setMoreCourts(full);
        setCourts(result.filter(row=>virginiaCoordinates(row.latitude,row.longitude))
          .map(row=>({
            id:'court:'+row.slug,kind:'court' as const,title:row.name,
            detail:row.address,city:row.locality,lat:row.latitude!,lon:row.longitude!,
            precision:'venue' as const,href:'/runs?court='+encodeURIComponent(row.slug),
            access:row.access_type,verified:row.verification_status,
            type:row.venue_type,slug:row.slug,description:row.notes??undefined
          })));
      }catch{if(!cancelled)setDataError('Some court locations could not be loaded. Try zooming in again.');}
      finally{if(!cancelled)setLoadingCourts(false);}
    },260);
    return()=>{cancelled=true;window.clearTimeout(timer);};
  },[mapReady,view.lat,view.lon,view.zoom,courtLimit,cityId]);

  const toggle3d=()=>{
    if(mapShown){setMapMode('atlas');return;}
    if(mapFailure){setMapError('3D tiles are unavailable on this connection. Continue exploring the Virginia Atlas.');return;}
    setMapMode('3d');
    window.setTimeout(()=>mapRef.current?.resize(),100);
    window.setTimeout(()=>{
      if(!tilesReady && !mapFailure){setMapMode('atlas');setMapError('3D tiles timed out. Virginia Atlas is ready to explore.');}
    },9000);
  };
  const openPoint=(point:WorldPoint)=>{
    setSelectedId(point.id);
    mapRef.current?.easeTo({center:[point.lon,point.lat],zoom:Math.max(view.zoom,point.precision==='venue'?13:10.5),duration:700});
  };
  const cityResults=useMemo(()=>query.trim().length>1?VIRGINIA_CITIES.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())).slice(0,6):[],[query]);
  const selectedCityApprox=selected?.precision==='city';

  return <main className="rch-world-page">
    <div className="rch-world-head">
      <div>
        <Link href="/" className="rch-world-back"><FaArrowLeft/> Home</Link>
        <p className="rch-world-eyebrow">RICH CITY HOOPS / VIRGINIA WORLD</p>
        <h1><FaCompass/> Discover Basketball</h1>
        <p className="rch-world-subtitle">Your statewide basketball world. Explore cities, discover places, and find real activity.</p>
      </div>
      <button className="rch-world-overview" type="button" onClick={overview}><FaRotate/> Virginia overview</button>
    </div>

    <div className="rch-world-tools">
      <label className="rch-world-search"><FaMagnifyingGlass/><span className="sr-only">Search basketball locations and events</span>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search city, court, run or event…" type="search"/>
        {query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery('')}><FaXmark/></button>}
      </label>
      <button type="button" className="rch-world-locate" onClick={()=>startLocation(true)}><FaCrosshairs/> <span>Find me</span></button>
    </div>
    {cityResults.length>0&&<div className="rch-world-suggestions">{cityResults.map(c=><button type="button" key={c.id} onClick={()=>{moveCity(c);setQuery('');}}>{c.symbol} {c.name}<FaArrowRight/></button>)}</div>}
    <div className="rch-world-filters" role="group" aria-label="Filter map locations">
      <FaFilter className="rch-world-filter-icon"/>
      {FILTERS.map(opt=><button type="button" key={opt.id} aria-pressed={filter===opt.id}
        className={filter===opt.id?'active':''} onClick={()=>setFilter(opt.id)}>{opt.label}</button>)}
    </div>

    <div className="rch-world-layout">
      <div className="rch-world-map-shell">
        <div className="rch-world-map" ref={hostRef} role="region" aria-label="Interactive 3D map of Virginia basketball locations"/>
        {!mapReady&&<div className="rch-world-loading" aria-live="polite">
          <div className="rch-world-loading-symbol">VA</div>
          <b>{mapError?'Map unavailable':'Building your Virginia basketball world…'}</b>
          <span>{mapError||'Loading terrain, cities and courts'}</span>
        </div>}
        {mapReady&&<div className="rch-world-map-hud"><span className="rch-world-online-dot"/> {city?.name||'Virginia'} <span>·</span> {view.zoom>=9.2?'City explorer':'Statewide explorer'}</div>}
        {mapReady&&<div className="rch-world-layer-note"><FaLayerGroup/> Tilt, rotate and zoom to enter a city</div>}
        <div className="rch-world-map-credit">Court data © OpenStreetMap contributors · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">ODbL</a></div>
      </div>

      <aside className="rch-world-panel">
        <div className="rch-world-panel-top">
          <span>{selected?'SELECTED DESTINATION':city?'EXPLORING CITY':'WHERE WILL YOU HOOP?'}</span>
          {selected&&<button type="button" aria-label="Close destination" onClick={()=>setSelectedId(null)}><FaXmark/></button>}
        </div>
        {selected?<div className="rch-world-detail">
          <div className="rch-world-destination-icon">{selected.kind==='court'?'🏀':selected.kind==='event'?'🎟️':'🔥'}</div>
          <span className="rch-world-detail-type">{selected.kind==='court'?'Court / venue':selected.kind==='event'?'Registered event':'Open run / session'}</span>
          <h2>{selected.title}</h2>
          <p className="rch-world-address"><FaLocationDot/> {selected.detail} · {selected.city}, Virginia</p>
          {selected.startsAt&&<p className="rch-world-when"><FaCalendarDays/> {formatWhen(selected.startsAt)}</p>}
          {selectedCityApprox&&<p className="rch-world-caution">City-level marker only. Open details to confirm the exact venue before traveling.</p>}
          {selected.kind==='court'&&<p className="rch-world-caution">{selected.verified==='community'||selected.access==='varies'
            ? 'Mapped location · Public access and playability are not verified.'
            : 'Check the facility’s current hours and access rules before visiting.'}</p>}
          {selected.description&&<p className="rch-world-description">{selected.description}</p>}
          <div className="rch-world-actions">
            <Link href={selected.href} className="primary">{selected.kind==='court'?'Create a run here':'Open details'} <FaArrowRight/></Link>
            {selected.precision==='venue'&&<a href={safeMapUrl(selected)} target="_blank" rel="noopener noreferrer">Directions</a>}
          </div>
        </div>:<div className="rch-world-intro">
          <div className="rch-world-destination-icon">{city?.symbol||'🏀'}</div>
          <h2>{city?.name||'The whole state. One basketball community.'}</h2>
          <p>{city?city.landmark+' · Explore courts, runs and events around '+city.name+'.':'Tap a 3D city landmark to fly in, or search a city and explore its courts.'}</p>
          {city&&<button type="button" className="rch-world-text-button" onClick={overview}>← Return to Virginia</button>}
        </div>}
        <div className="rch-world-panel-divider"/>
        <div className="rch-world-panel-list-head">
          <h3>{city?'Around '+city.name:userLocation?'Near your location':'Upcoming & mapped'}</h3>
          <small>{loadingData||loadingCourts?'Updating…':shown.length+' on map'}</small>
        </div>
        {dataError&&<p className="rch-world-warning" role="status">{dataError}</p>}
        {locationError&&<p className="rch-world-warning" role="status">{locationError}</p>}
        <div className="rch-world-list">
          {displayed.map(item=><button type="button" key={item.id} onClick={()=>openPoint(item)}
            className={selectedId===item.id?'selected':''}>
            <span className="rch-world-list-icon">{item.kind==='court'?'🏀':item.kind==='event'?'🎟️':'🔥'}</span>
            <span className="rch-world-list-copy"><strong>{item.title}</strong><small>{item.city} · {item.startsAt?formatWhen(item.startsAt):item.kind==='court'?'Basketball location':'Upcoming'}</small></span>
            <FaArrowRight/>
          </button>)}
          {!displayed.length&&<div className="rch-world-empty">{loadingData?'Finding registered activity…':
            view.zoom<9.2?'Choose a city to explore its mapped venues and basketball activity.':
            'No matching locations are displayed here yet. Try another filter or move the map.'}</div>}
        </div>
        {moreCourts&&view.zoom>=9.2&&<button type="button" className="rch-world-more" disabled={loadingCourts}
          onClick={()=>setCourtLimit(v=>v+300)}>Load more mapped courts</button>}
        <p className="rch-world-data-note">Only published events and upcoming runs are displayed. Unverified court listings do not guarantee public access.</p>
        <div className="rch-world-shortcuts"><Link href="/runs">Open Runs <FaArrowRight/></Link><Link href="/network">VA Network <FaArrowRight/></Link><Link href="/discover/community">People & REP <FaArrowRight/></Link></div>
      </aside>
    </div>

    <section className="rch-world-city-section" aria-labelledby="rch-world-cities-title">
      <div className="rch-world-city-head"><div><p className="rch-world-eyebrow">CHOOSE YOUR DESTINATION</p><h2 id="rch-world-cities-title">Explore Virginia by city</h2></div><span>{VIRGINIA_CITIES.length} city gateways</span></div>
      <div className="rch-world-city-scroll">
        {VIRGINIA_CITIES.filter(c=>c.major).map(c=><button type="button" key={c.id} onClick={()=>moveCity(c)} aria-pressed={cityId===c.id}>
          <span>{c.symbol}</span><strong>{c.name}</strong><small>{c.landmark}</small><FaArrowRight/>
        </button>)}
      </div>
    </section>
  </main>;
}
