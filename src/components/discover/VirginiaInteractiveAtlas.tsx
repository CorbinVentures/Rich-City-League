'use client';

import Link from 'next/link';
import { useCallback,useEffect,useMemo,useRef,useState,type PointerEvent,type WheelEvent } from 'react';
import {
  FaArrowLeft,FaArrowRight,FaBasketball,FaBolt,FaCrown,FaCompress,FaCrosshairs,
  FaLocationDot,FaMinus,FaPlus
} from 'react-icons/fa6';
import { ATLAS_OVERVIEW,atlasCityCamera,atlasVenueCamera,atlasXY,clampAtlasZoom,type AtlasCamera } from '@/lib/virginia-atlas-camera';
import { clusterAtlasPoints } from '@/lib/virginia-atlas-clusters';
import { VIRGINIA_CITIES,milesBetween,virginiaCoordinates,type GeoPosition,type VirginiaCity } from '@/lib/virginia-world';
import './virginia-interactive-atlas.css';
import './virginia-interactive-atlas-v2.css';

export type AtlasPlace={
  id:string;title:string;city:string;kind:'run'|'event'|'court';
  lat:number;lon:number;href:string;precision:'venue'|'city';
  gameState?:'crown'|'battle'|'double-rep';
  indoor?:boolean; // Gym icon only; never implies open pickup or gym availability.
};
type Props={
  city:VirginiaCity|null;
  points:AtlasPlace[];
  selectedId:string|null;
  userLocation:GeoPosition|null;
  mode:'atlas'|'3d';
  streetReady?:boolean;
  searchActive?:boolean;
  onCitySelect:(city:VirginiaCity)=>void;
  onPlaceSelect:(id:string)=>void;
  onOverview:()=>void;
};
type XY={x:number;y:number};
function pointerDistance(a:XY,b:XY){return Math.hypot(a.x-b.x,a.y-b.y);}
function midPoint(a:XY,b:XY):XY{return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
// Major geography anchors only at statewide zoom; individual cities stay searchable.
const GATEWAYS=['bristol','roanoke','richmond','winchester','norfolk'];

export default function VirginiaInteractiveAtlas({
  city,points,selectedId,userLocation,mode,streetReady=false,searchActive=false,onCitySelect,onPlaceSelect,onOverview
}:Props){
  const [camera,setCamera]=useState<AtlasCamera>(ATLAS_OVERVIEW);
  const activePointers=useRef(new Map<number,XY>());
  const pinchRef=useRef<{distance:number;mid:XY}|null>(null);
  const selected=useMemo(()=>points.find(p=>p.id===selectedId)??null,[points,selectedId]);

  const relevant=useMemo(()=>city?points.filter(point=>milesBetween(point,city)<30):points,[city,points]);
  const clusters=useMemo(()=>clusterAtlasPoints(relevant,camera.zoom,selectedId),[relevant,camera.zoom,selectedId]);
  const visibleCities=useMemo(()=>city?[city]:(camera.zoom>2||searchActive)?[]:VIRGINIA_CITIES.filter(c=>GATEWAYS.includes(c.id)),[city,camera.zoom,searchActive]);
  const courtCount=relevant.filter(point=>point.kind==='court').length;
  const activeCount=relevant.filter(point=>point.kind!=='court').length;
  const isStreetLoading=mode==='3d'&&!streetReady;

  useEffect(()=>{setCamera(city?atlasCityCamera(city):ATLAS_OVERVIEW);},[city?.id]);
  useEffect(()=>{
    if(!selectedId)return;
    const point=points.find(p=>p.id===selectedId);
    if(point)setCamera(atlasVenueCamera(point));
  },[selectedId,points]);

  useEffect(()=>{
    // Search should reveal the actual matching court on the map, without
    // requiring a second city selection or assuming an invented GPS position.
    if(city||!searchActive||selectedId)return;
    const match=points.find(point=>point.kind==='court')||points[0];
    if(match)setCamera(atlasVenueCamera(match));
  },[searchActive,city?.id,selectedId,points]);

  const zoomIn=useCallback(()=>setCamera(c=>({...c,zoom:clampAtlasZoom(c.zoom*1.45)})),[]);
  const zoomOut=useCallback(()=>setCamera(c=>({...c,zoom:clampAtlasZoom(c.zoom/1.45)})),[]);
  const reset=()=>{
    activePointers.current.clear();pinchRef.current=null;
    setCamera(ATLAS_OVERVIEW);onOverview();
  };
  const selectCity=(target:VirginiaCity)=>{
    setCamera(atlasCityCamera(target));onCitySelect(target);
  };
  const onPointerDown=(event:PointerEvent<HTMLDivElement>)=>{
    if(streetReady||(event.target as HTMLElement).closest('button,a'))return;
    activePointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    event.currentTarget.setPointerCapture(event.pointerId);
    if(activePointers.current.size===2){
      const [a,b]=[...activePointers.current.values()];
      pinchRef.current={distance:pointerDistance(a,b),mid:midPoint(a,b)};
    }
  };
  const onPointerMove=(event:PointerEvent<HTMLDivElement>)=>{
    const old=activePointers.current.get(event.pointerId);
    if(!old)return;
    activePointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const positions=[...activePointers.current.values()];
    if(positions.length===1){
      const dx=event.clientX-old.x,dy=event.clientY-old.y;
      if(dx||dy)setCamera(c=>({...c,panX:c.panX+dx,panY:c.panY+dy}));
      return;
    }
    if(positions.length===2){
      const newMid=midPoint(positions[0],positions[1]);
      const newDistance=pointerDistance(positions[0],positions[1]);
      const previous=pinchRef.current;
      if(previous?.distance){
        setCamera(c=>({...c,panX:c.panX+newMid.x-previous.mid.x,panY:c.panY+newMid.y-previous.mid.y,
          zoom:clampAtlasZoom(c.zoom*(newDistance/previous.distance))}));
      }
      pinchRef.current={distance:newDistance,mid:newMid};
    }
  };
  const onPointerEnd=(event:PointerEvent<HTMLDivElement>)=>{
    activePointers.current.delete(event.pointerId);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    pinchRef.current=null;
  };
  const onWheel=(event:WheelEvent<HTMLDivElement>)=>{
    event.preventDefault();
    setCamera(c=>({...c,zoom:clampAtlasZoom(c.zoom*(event.deltaY<0?1.18:1/1.18))}));
  };
  const enterCluster=(x:number,y:number)=>{
    setCamera(c=>({focusX:x,focusY:y,panX:0,panY:0,zoom:clampAtlasZoom(Math.max(c.zoom*1.75,4))}));
  };
  const {focusX,focusY,zoom,panX,panY}=camera;
  // The stage is centered on the focus coordinate. Keep the artwork and markers
  // on the exact same transform so that their geographic positions never drift.
  const stageStyle={
    transform:`translate3d(${panX}px,${panY}px,0) translate(-50%,-50%) scale(${zoom}) translate(${(0.5-focusX)*100}%,${(0.5-focusY)*100}%)`,
    ['--rch-counter-zoom' as string]:(1/zoom).toFixed(5)
  };

  return <div className={'rch-live-atlas rch-live-atlas-v2'+(city?' city-mode':'')+(isStreetLoading?' perspective':'')+(streetReady?' street-ready':'')}
    role="region" aria-label="Interactive Virginia basketball atlas, use drag or pinch to explore"
    aria-hidden={streetReady}
    tabIndex={streetReady?-1:0}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove}
    onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
    onWheel={onWheel}
    onDoubleClick={event=>{if(!(event.target as HTMLElement).closest('button,a'))zoomIn();}}
    onKeyDown={event=>{
      if(event.key==='+'||event.key==='='){event.preventDefault();zoomIn();}
      if(event.key==='-'){event.preventDefault();zoomOut();}
      if(event.key==='Escape'){event.preventDefault();reset();}
      if(event.key.startsWith('Arrow')){
        event.preventDefault();
        const delta:{[key:string]:XY}={
          ArrowLeft:{x:60,y:0},ArrowRight:{x:-60,y:0},ArrowUp:{x:0,y:60},ArrowDown:{x:0,y:-60}
        };
        const d=delta[event.key];
        if(d)setCamera(c=>({...c,panX:c.panX+d.x,panY:c.panY+d.y}));
      }
    }}>
    <div className="rch-live-atlas-vignette" aria-hidden="true"/>
    <div className="rch-live-atlas-stage" style={stageStyle}>
      <div className="rch-live-atlas-image" aria-hidden="true"/>
      {visibleCities.map(item=>{
        const xy=atlasXY(item);
        return <button key={item.id} type="button" className={'rch-live-atlas-city'+(city?.id===item.id?' active':'')}
          style={{left:(xy.x*100)+'%',top:(xy.y*100)+'%'}}
          onClick={()=>selectCity(item)}
          data-city={item.id} aria-label={'Explore '+item.name}>
          <span className="rch-live-atlas-city-dot" aria-hidden="true"><FaBasketball/></span>
          <span className="rch-live-atlas-city-label">{item.name}</span>
        </button>;
      })}
      {clusters.map(cluster=>{
        if(cluster.count>1)return <button type="button" key={cluster.key}
          className={'rch-live-atlas-cluster kind-'+cluster.kind}
          style={{left:cluster.x*100+'%',top:cluster.y*100+'%'}}
          onClick={()=>enterCluster(cluster.x,cluster.y)}
          aria-label={'Zoom in to explore '+cluster.count+' loaded basketball places'}
          title={cluster.count+' mapped places · zoom to explore'}>
          <strong>{cluster.count}</strong><span>LOCATIONS</span>
        </button>;
        const point=cluster.point!;
        const xy=atlasXY(point);
        return <button key={point.id} type="button"
          className={'rch-live-atlas-point '+point.kind+(selectedId===point.id?' selected':'')+(point.gameState?' game-'+point.gameState:'')}
          style={{left:xy.x*100+'%',top:xy.y*100+'%'}}
          onClick={()=>onPlaceSelect(point.id)}
          aria-label={'View '+point.title}
          data-label={point.title} title={point.title}>
          {point.gameState==='crown'?<FaCrown aria-hidden="true"/>:point.gameState==='battle'?<FaBolt aria-hidden="true"/>:<FaBasketball aria-hidden="true"/>}
        </button>;
      })}
      {userLocation&&virginiaCoordinates(userLocation.lat,userLocation.lon)&&(()=>{
        const xy=atlasXY(userLocation);
        return <div className="rch-live-atlas-user" style={{left:xy.x*100+'%',top:xy.y*100+'%'}} aria-label="Your approximate location"/>;
      })()}
    </div>

    <div className="rch-live-atlas-tactical-strip" aria-label="Visible map data">
      <span className="rch-live-atlas-tactical-label"><FaCrosshairs/> {city?city.name.toUpperCase():'VIRGINIA ATLAS'}</span>
      <span>{courtCount} <small>LOADED COURTS</small></span>
      <span>{activeCount} <small>ACTIVITIES</small></span>
    </div>
    <div className="rch-live-atlas-toolbar" role="group" aria-label="Map zoom controls">
      <button type="button" onClick={zoomIn} disabled={zoom>=12} aria-label="Zoom in" title="Zoom in"><FaPlus/></button>
      <button type="button" onClick={zoomOut} disabled={zoom<=1} aria-label="Zoom out" title="Zoom out"><FaMinus/></button>
      <button type="button" onClick={reset} aria-label="Show all Virginia" title="Reset map"><FaCompress/></button>
    </div>
    {selected?
      <div className="rch-live-atlas-selection">
        <span className="rch-live-atlas-selection-type"><FaLocationDot/> {selected.kind==='court'?'COURT / VENUE':selected.kind==='event'?'REGISTERED EVENT':'SCHEDULED RUN'} · {selected.city.toUpperCase()}</span>
        <strong>{selected.title}</strong>
        <Link href={selected.href}>View details <FaArrowRight/></Link>
      </div>
      :city?
      <div className="rch-live-atlas-selection city">
        <button type="button" className="rch-live-atlas-back" onClick={reset}><FaArrowLeft/> All Virginia</button>
        <strong>{city.name} basketball</strong>
        <span>{courtCount} loaded court locations · {activeCount} upcoming activities</span>
        <button type="button" onClick={()=>document.getElementById('rch-world-results')?.scrollIntoView({behavior:'smooth',block:'start'})}>
          Explore places nearby <FaArrowRight/>
        </button>
      </div>
      :<div className="rch-live-atlas-hint"><FaLocationDot/> Select a city to reveal its courts and runs</div>}
    <div className="rch-live-atlas-legend" aria-label="Map marker legend"><span><i className="court"/> Courts</span><span><i className="run"/> Runs</span><span><i className="event"/> Events</span></div>
    <div className="rch-live-atlas-scale" aria-label={'Zoom level '+zoom.toFixed(1)}>{zoom.toFixed(1)}×</div>
  </div>;
}
