'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { FaArrowLeft, FaArrowRight, FaBasketball, FaLocationDot, FaMinus, FaPlus } from 'react-icons/fa6';
import { ATLAS_OVERVIEW, atlasCityCamera, atlasVenueCamera, atlasXY, clampAtlasZoom, type AtlasCamera } from '@/lib/virginia-atlas-camera';
import { VIRGINIA_CITIES, milesBetween, virginiaCoordinates, type GeoPosition, type VirginiaCity } from '@/lib/virginia-world';
import './virginia-interactive-atlas.css';

export type AtlasPlace = {
  id:string; title:string; city:string; kind:'run'|'event'|'court';
  lat:number; lon:number; href:string; precision:'venue'|'city';
};
type Props = {
  city:VirginiaCity|null;
  points:AtlasPlace[];
  selectedId:string|null;
  userLocation:GeoPosition|null;
  mode:'atlas'|'3d';
  onCitySelect:(city:VirginiaCity)=>void;
  onPlaceSelect:(id:string)=>void;
  onOverview:()=>void;
};
type XY={x:number;y:number};
function pointerDistance(a:XY,b:XY){return Math.hypot(a.x-b.x,a.y-b.y);}
function midPoint(a:XY,b:XY):XY{return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
const MAP_CITIES=['bristol','roanoke','richmond','virginia-beach','charlottesville','fredericksburg','alexandria'];
const FALLBACK_VIEW_COUNT=70;

export default function VirginiaInteractiveAtlas({city,points,selectedId,userLocation,mode,onCitySelect,onPlaceSelect,onOverview}:Props){
  const [camera,setCamera]=useState<AtlasCamera>(ATLAS_OVERVIEW);
  const activePointers=useRef(new Map<number,XY>());
  const pinchRef=useRef<{distance:number;mid:XY}|null>(null);
  const selected=points.find(p=>p.id===selectedId)??null;
  const relevant=city
    ? points.filter(point=>milesBetween(point,city)<28).slice(0,FALLBACK_VIEW_COUNT)
    : points.filter(point=>point.kind!=='court').slice(0,14);
  const visibleCities=city?[city]:VIRGINIA_CITIES.filter(c=>MAP_CITIES.includes(c.id));
  const courtCount=relevant.filter(point=>point.kind==='court').length;
  useEffect(()=>{
    setCamera(city?atlasCityCamera(city):ATLAS_OVERVIEW);
  },[city?.id]);
  useEffect(()=>{
    if(!selectedId)return;
    const point=points.find(p=>p.id===selectedId);
    if(point)setCamera(atlasVenueCamera(point));
  },[selectedId]);

  const zoomIn=useCallback(()=>setCamera(c=>({...c,zoom:clampAtlasZoom(c.zoom*1.55)})),[]);
  const zoomOut=useCallback(()=>setCamera(c=>({...c,zoom:clampAtlasZoom(c.zoom/1.55)})),[]);
  const reset=()=>{
    setCamera(ATLAS_OVERVIEW);
    onOverview();
  };
  const selectCity=(target:VirginiaCity)=>{
    setCamera(atlasCityCamera(target));
    onCitySelect(target);
  };
  const onPointerDown=(event:PointerEvent<HTMLDivElement>)=>{
    if((event.target as HTMLElement).closest('button,a'))return;
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
      const x=event.clientX-old.x,y=event.clientY-old.y;
      if(x||y)setCamera(c=>({...c,panX:c.panX+x,panY:c.panY+y}));
      return;
    }
    if(positions.length===2){
      const nextMid=midPoint(positions[0],positions[1]);
      const nextDistance=pointerDistance(positions[0],positions[1]);
      const previous=pinchRef.current;
      if(previous?.distance){
        setCamera(c=>({
          ...c,
          panX:c.panX+(nextMid.x-previous.mid.x),
          panY:c.panY+(nextMid.y-previous.mid.y),
          zoom:clampAtlasZoom(c.zoom*(nextDistance/previous.distance))
        }));
      }
      pinchRef.current={distance:nextDistance,mid:nextMid};
    }
  };
  const onPointerEnd=(event:PointerEvent<HTMLDivElement>)=>{
    activePointers.current.delete(event.pointerId);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    pinchRef.current=null;
  };
  const onWheel=(event:WheelEvent<HTMLDivElement>)=>{
    event.preventDefault();
    setCamera(c=>({...c,zoom:clampAtlasZoom(c.zoom*(event.deltaY<0?1.16:1/1.16))}));
  };
  const selectedMode=mode==='3d';
  const {focusX,focusY,zoom,panX,panY}=camera;
  const markerCounter=(1/zoom).toFixed(4);
  const sceneStyle={
    transformOrigin:(focusX*100)+'% '+(focusY*100)+'%',
    transform:'translate3d('+panX+'px,'+panY+'px,0) translate('+((0.5-focusX)*100)+'%,'+((0.5-focusY)*100)+'%) translateY(-50%) scale('+zoom+')'+(selectedMode?' perspective(1000px) rotateX(8deg)':''),
    ['--rch-counter-zoom' as string]:markerCounter,
  };

  return <div className={'rch-live-atlas'+(selectedMode?' perspective':'')}
    role="region" aria-label="Interactive Virginia basketball atlas, use drag or pinch to explore"
    tabIndex={0}
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
          ArrowLeft:{x:50,y:0},ArrowRight:{x:-50,y:0},ArrowUp:{x:0,y:50},ArrowDown:{x:0,y:-50}
        };
        const d=delta[event.key];setCamera(c=>({...c,panX:c.panX+d.x,panY:c.panY+d.y}));
      }
    }}>
    <div className="rch-live-atlas-vignette" aria-hidden="true"/>
    <div className="rch-live-atlas-stage" style={sceneStyle}>
      <div className="rch-live-atlas-image" aria-hidden="true"/>
      {visibleCities.map(item=>{
        const xy=atlasXY(item);
        return <button key={item.id} type="button" className={'rch-live-atlas-city'+(city?.id===item.id?' active':'')}
          style={{left:(xy.x*100)+'%',top:(xy.y*100)+'%'}}
          onClick={()=>selectCity(item)}
          aria-label={'Explore '+item.name}>
          <span className="rch-live-atlas-city-dot" aria-hidden="true"><FaBasketball/></span>
          <span className="rch-live-atlas-city-label">{item.name}</span>
        </button>;
      })}
      {relevant.map(point=>{
        const xy=atlasXY(point);
        return <button key={point.id} type="button"
          className={'rch-live-atlas-point '+point.kind+(selectedId===point.id?' selected':'')}
          style={{left:(xy.x*100)+'%',top:(xy.y*100)+'%'}}
          onClick={()=>onPlaceSelect(point.id)}
          aria-label={'View '+point.title}>
          <FaBasketball aria-hidden="true"/>
        </button>;
      })}
      {userLocation && virginiaCoordinates(userLocation.lat,userLocation.lon)&&(()=>{
        const xy=atlasXY(userLocation);
        return <div className="rch-live-atlas-user" style={{left:(xy.x*100)+'%',top:(xy.y*100)+'%'}} aria-label="Your approximate location"/>;
      })()}
    </div>
    <div className="rch-live-atlas-toolbar" role="group" aria-label="Map zoom controls">
      <button type="button" onClick={zoomIn} aria-label="Zoom in" title="Zoom in"><FaPlus/></button>
      <button type="button" onClick={zoomOut} disabled={zoom<=1} aria-label="Zoom out" title="Zoom out"><FaMinus/></button>
      <button type="button" onClick={reset} aria-label="Show all Virginia" title="State overview"><FaArrowLeft/></button>
    </div>
    {selected?
      <div className="rch-live-atlas-selection">
        <span className="rch-live-atlas-selection-type"><FaLocationDot/> {selected.kind==='court'?'Court':selected.kind==='event'?'Event':'Run'} · {selected.city}</span>
        <strong>{selected.title}</strong>
        <Link href={selected.href}>View details <FaArrowRight/></Link>
      </div>
      :city?
      <div className="rch-live-atlas-selection city">
        <button type="button" className="rch-live-atlas-back" onClick={reset}><FaArrowLeft/> Virginia</button>
        <strong>{city.name}</strong>
        <span>{courtCount?courtCount+' mapped courts nearby':'Exploring registered activity'}</span>
        <button type="button" onClick={()=>document.getElementById('rch-world-results')?.scrollIntoView({behavior:'smooth',block:'start'})}>
          See nearby places <FaArrowRight/>
        </button>
      </div>
      :<div className="rch-live-atlas-hint">Choose a city · pinch to zoom · drag to explore</div>}
    <div className="rch-live-atlas-scale" aria-label={'Zoom level '+zoom.toFixed(1)}>{zoom.toFixed(1)}×</div>
  </div>;
}
