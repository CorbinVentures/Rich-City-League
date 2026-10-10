/** Geographic anchors are navigation landmarks, not claims of exact event/venue coordinates. */
export type VirginiaCity = {id:string; name:string; lat:number; lon:number; landmark:string; symbol:string; major?:boolean};
export const VIRGINIA_CITIES:VirginiaCity[] = [
  {id:'richmond',name:'Richmond',lat:37.5407,lon:-77.436,landmark:'Downtown skyline',symbol:'🏙️',major:true},
  {id:'alexandria',name:'Alexandria',lat:38.8048,lon:-77.0469,landmark:'Old Town waterfront',symbol:'🏛️',major:true},
  {id:'arlington',name:'Arlington',lat:38.8816,lon:-77.1068,landmark:'Northern Virginia',symbol:'🏢'},
  {id:'fairfax',name:'Fairfax',lat:38.8462,lon:-77.3064,landmark:'Fairfax city',symbol:'🏛️',major:true},
  {id:'manassas',name:'Manassas',lat:38.7509,lon:-77.4753,landmark:'Historic district',symbol:'🏘️'},
  {id:'leesburg',name:'Leesburg',lat:39.1157,lon:-77.5636,landmark:'Loudoun County',symbol:'🏡'},
  {id:'fredericksburg',name:'Fredericksburg',lat:38.3032,lon:-77.4605,landmark:'Rappahannock River',symbol:'🌉',major:true},
  {id:'winchester',name:'Winchester',lat:39.1857,lon:-78.1633,landmark:'Shenandoah Valley',symbol:'⛰️',major:true},
  {id:'harrisonburg',name:'Harrisonburg',lat:38.4496,lon:-78.8689,landmark:'Shenandoah Valley',symbol:'⛰️'},
  {id:'staunton',name:'Staunton',lat:38.1496,lon:-79.0717,landmark:'Historic downtown',symbol:'🏘️'},
  {id:'charlottesville',name:'Charlottesville',lat:38.0293,lon:-78.4767,landmark:'Rotunda district',symbol:'🏛️',major:true},
  {id:'roanoke',name:'Roanoke',lat:37.271,lon:-79.9414,landmark:'Roanoke Star',symbol:'⭐',major:true},
  {id:'blacksburg',name:'Blacksburg',lat:37.2296,lon:-80.4139,landmark:'New River Valley',symbol:'🏔️'},
  {id:'lynchburg',name:'Lynchburg',lat:37.4138,lon:-79.1422,landmark:'James River bridges',symbol:'🌉',major:true},
  {id:'danville',name:'Danville',lat:36.5859,lon:-79.395,landmark:'River District',symbol:'🏭',major:true},
  {id:'martinsville',name:'Martinsville',lat:36.6915,lon:-79.8717,landmark:'Southside Virginia',symbol:'🏘️'},
  {id:'wytheville',name:'Wytheville',lat:36.9485,lon:-81.0834,landmark:'Blue Ridge crossroads',symbol:'⛰️'},
  {id:'bristol',name:'Bristol',lat:36.5951,lon:-82.1887,landmark:'State Street',symbol:'🎸',major:true},
  {id:'abingdon',name:'Abingdon',lat:36.7098,lon:-81.9774,landmark:'Historic town',symbol:'🎭'},
  {id:'petersburg',name:'Petersburg',lat:37.2279,lon:-77.4019,landmark:'Old Towne',symbol:'🏛️',major:true},
  {id:'chesterfield',name:'Chesterfield',lat:37.3771,lon:-77.504,landmark:'Chesterfield County',symbol:'🌳'},
  {id:'williamsburg',name:'Williamsburg',lat:37.2707,lon:-76.7075,landmark:'Colonial district',symbol:'🏛️'},
  {id:'newport-news',name:'Newport News',lat:37.0871,lon:-76.473,landmark:'James River waterfront',symbol:'⚓',major:true},
  {id:'hampton',name:'Hampton',lat:37.0299,lon:-76.3452,landmark:'Hampton Roads',symbol:'🌉'},
  {id:'norfolk',name:'Norfolk',lat:36.8508,lon:-76.2859,landmark:'Downtown waterfront',symbol:'🚢',major:true},
  {id:'portsmouth',name:'Portsmouth',lat:36.8354,lon:-76.2983,landmark:'Historic waterfront',symbol:'⚓'},
  {id:'chesapeake',name:'Chesapeake',lat:36.7682,lon:-76.2875,landmark:'Coastal Virginia',symbol:'🌲'},
  {id:'virginia-beach',name:'Virginia Beach',lat:36.8529,lon:-75.978,landmark:'Oceanfront',symbol:'🎡',major:true},
  {id:'suffolk',name:'Suffolk',lat:36.7282,lon:-76.5836,landmark:'Coastal plain',symbol:'🌳'},
  {id:'emporia',name:'Emporia',lat:36.6859,lon:-77.5433,landmark:'Southside Virginia',symbol:'🏘️'},
];
export type GeoPosition = {lat:number; lon:number};
export function milesBetween(a:GeoPosition,b:GeoPosition) {
  const rad=Math.PI/180, deltaLat=(b.lat-a.lat)*rad, deltaLon=(b.lon-a.lon)*rad;
  const hav=Math.sin(deltaLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(deltaLon/2)**2;
  return 3958.7613*2*Math.atan2(Math.sqrt(hav),Math.sqrt(1-hav));
}
export function cityForText(value:string|null|undefined):VirginiaCity|null {
  if(!value) return null;
  const normalized=value.toLowerCase().replace(/[^a-z0-9]/g,' ').replace(/ +/g,' ').trim();
  // Only known city names. Never geocode a street address to an invented point.
  return [...VIRGINIA_CITIES].sort((a,b)=>b.name.length-a.name.length)
    .find(city=>normalized === city.name.toLowerCase()
      || normalized.startsWith(city.name.toLowerCase()+' ')
      || normalized.includes(' '+city.name.toLowerCase()+' ')
      || normalized.endsWith(' '+city.name.toLowerCase())) ?? null;
}
export function virginiaCoordinates(lat:unknown,lon:unknown):lat is number {
  return typeof lat==='number'&&typeof lon==='number'
    &&Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=36.4&&lat<=39.55&&lon>=-83.75&&lon<=-75.1;
}
