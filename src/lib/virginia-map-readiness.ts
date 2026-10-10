/** Conservative visibility check for the optional MapLibre street map.
 * A loaded style or source can still be blank on mobile Safari; keep the
 * illustrated geographic atlas visible until street geometry is drawn.
 */
export function isVirginiaBasemapRenderable(map:any):boolean {
  try {
    if(!map.isStyleLoaded?.() || !map.isSourceLoaded?.('openmaptiles'))return false;
    const layers=(map.getStyle?.()?.layers??[])
      .filter((layer:any)=>layer.source==='openmaptiles'
        && ['fill','line','fill-extrusion'].includes(layer.type))
      .map((layer:any)=>layer.id);
    if(!layers.length)return false;
    return map.queryRenderedFeatures(undefined,{layers}).length>0;
  }catch{return false;}
}
