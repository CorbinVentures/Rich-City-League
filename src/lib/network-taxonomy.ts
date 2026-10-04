export const NETWORK_ORGANIZATION_TYPES = [
  { value:'league', label:'Basketball League', group:'basketball' },
  { value:'tournament', label:'Tournament / Event Operator', group:'basketball' },
  { value:'program', label:'Basketball Program', group:'basketball' },
  { value:'team', label:'Team', group:'basketball' },
  { value:'training', label:'Trainer / Development', group:'basketball' },
  { value:'facility', label:'Gym / Facility', group:'basketball' },
  { value:'media', label:'Media Brand', group:'media' },
  { value:'creator', label:'Creator', group:'media' },
  { value:'social-club', label:'Social Club', group:'community' },
  { value:'car-club', label:'Car Club', group:'community' },
  { value:'motorcycle-club', label:'Motorcycle Club', group:'community' },
  { value:'run-club', label:'Run Club', group:'community' },
  { value:'couples-club', label:'Couples / Dating Community', group:'community' },
  { value:'alumni', label:'Alumni Group', group:'community' },
  { value:'professional-group', label:'Professional / Networking Group', group:'community' },
  { value:'fitness', label:'Fitness Community', group:'community' },
  { value:'lifestyle', label:'Lifestyle Community', group:'community' },
  { value:'community', label:'Community Organization', group:'community' },
  { value:'nonprofit', label:'Nonprofit', group:'community' },
  { value:'business', label:'Local Business', group:'business' },
  { value:'venue', label:'Venue', group:'business' },
  { value:'club', label:'Club / Association', group:'community' },
  { value:'other', label:'Other', group:'other' },
] as const;

export const NETWORK_ORGANIZATION_TYPE_VALUES:string[] = NETWORK_ORGANIZATION_TYPES.map(item=>item.value);

export const NETWORK_REGIONS = [
  { value:'central-virginia', label:'Central Virginia' },
  { value:'tri-cities', label:'Tri-Cities / Petersburg' },
  { value:'hampton-roads', label:'Hampton Roads' },
  { value:'northern-virginia', label:'Northern Virginia' },
  { value:'shenandoah', label:'Shenandoah Valley' },
  { value:'southwest-virginia', label:'Southwest Virginia' },
  { value:'statewide', label:'Statewide' },
  { value:'other', label:'Other Virginia area' },
] as const;

export const NETWORK_REGION_VALUES:string[] = NETWORK_REGIONS.map(item=>item.value);

export const NETWORK_EVENT_TYPES = [
  { value:'league', label:'League' },
  { value:'tournament', label:'Tournament' },
  { value:'tryout', label:'Tryout' },
  { value:'showcase', label:'Showcase' },
  { value:'camp', label:'Camp' },
  { value:'run', label:'Basketball Run' },
  { value:'clinic', label:'Clinic' },
  { value:'media', label:'Media / Premiere' },
  { value:'community', label:'Community Event' },
  { value:'car-meet', label:'Car Meet / Show' },
  { value:'social', label:'Social Event' },
  { value:'networking', label:'Networking Event' },
  { value:'nightlife', label:'Nightlife / Day Party' },
  { value:'fitness', label:'Fitness Event' },
  { value:'couples', label:'Couples / Dating Event' },
  { value:'fundraiser', label:'Fundraiser / Charity' },
  { value:'meetup', label:'Meetup' },
  { value:'expo', label:'Expo / Showcase' },
  { value:'other', label:'Other' },
] as const;

export const NETWORK_EVENT_TYPE_VALUES:string[] = NETWORK_EVENT_TYPES.map(item=>item.value);

export const COMMUNITY_ORGANIZATION_TYPES = new Set([
  'social-club','car-club','motorcycle-club','run-club','couples-club','alumni',
  'professional-group','fitness','lifestyle','community','nonprofit','business','venue','club',
]);

export function networkTypeLabel(value:string){
  return NETWORK_ORGANIZATION_TYPES.find(item=>item.value===value)?.label
    ?? value.replaceAll('-',' ').replace(/\b\w/g,letter=>letter.toUpperCase());
}

export function networkRegionLabel(value:string){
  return NETWORK_REGIONS.find(item=>item.value===value)?.label
    ?? value.replaceAll('-',' ').replace(/\b\w/g,letter=>letter.toUpperCase());
}
