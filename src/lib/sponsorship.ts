export type SponsorInventoryCode =
  | 'social-feed'
  | 'today-in-rch'
  | 'search-discovery'
  | 'featured-event'
  | 'community-feature'
  | 'rch-tv-feature'
  | 'weekend-guide'
  | 'runs-presenting'
  | 'rch-tv-presenting'
  | 'category-exclusive'
  | 'bmf-presenting'
  | 'bmf-championship-partner'
  | 'bmf-community-partner'
  | 'rcl-runs-championship-award'
  | 'rcl-league-championship-award'
  | 'rcl-team-uniform-partner'
  | 'rcl-digital-platform-partner'
  | 'rcl-game-streaming-partner'
  | 'rcl-game-highlights-partner'
  | 'rcl-playoff-series-partner'
  | 'rcl-finals-partner'
  | 'rcl-social-campaign-partner';

export type SponsorInventoryItem = {
  code:SponsorInventoryCode;
  name:string;
  eyebrow:string;
  kind:'campaign'|'featured-partner'|'presenting'|'exclusive'|'event-partner';
  placement:'social-feed'|'event-spotlight'|'community-feature'|'media-feature'|'digest'|'regional-feature'|'network-home'|'search-feature'|'news-feature';
  package:'boost'|'amplify'|'premier'|'custom';
  objective:'awareness'|'event-traffic'|'website-traffic'|'media-views'|'audience-growth';
  durationDays:number|null;
  startingPriceCents:number|null;
  priceLabel:string;
  description:string;
  deliverables:string[];
  idealFor:string;
  featured?:boolean;
  availabilityLabel?:string;
  lane?:'network'|'rcl-2027';
  slotCount?:number;
};

export const SPONSOR_INVENTORY:SponsorInventoryItem[]=[
  {
    code:'social-feed',
    name:'Sponsored Social Feed',
    eyebrow:'Campaign',
    kind:'campaign',
    placement:'social-feed',
    package:'boost',
    objective:'website-traffic',
    durationDays:7,
    startingPriceCents:4900,
    priceLabel:'From $49',
    description:'Native, clearly disclosed distribution inside eligible RCH social surfaces.',
    deliverables:['Sponsored feed placement','Clickable call to action','Regional targeting','RCH Reach reporting'],
    idealFor:'Local businesses, launches, offers and event promotion',
  },
  {
    code:'today-in-rch',
    name:'Today in RCH Partner',
    eyebrow:'Premium daily visibility',
    kind:'featured-partner',
    placement:'network-home',
    package:'amplify',
    objective:'awareness',
    durationDays:30,
    startingPriceCents:25000,
    priceLabel:'From $250 / month',
    description:'A subtle presented-by placement inside the daily RCH activity snapshot members see near the top of Social Home.',
    deliverables:['Today in RCH sponsor strip','Daily native brand association','Clickable partner CTA','RCH Reach reporting'],
    idealFor:'Banks, telecom, automotive, healthcare, restaurants and high-frequency local brands',
    featured:true,
  },
  {
    code:'search-discovery',
    name:'Search + Discover Feature',
    eyebrow:'Discovery placement',
    kind:'campaign',
    placement:'search-feature',
    package:'amplify',
    objective:'website-traffic',
    durationDays:14,
    startingPriceCents:9900,
    priceLabel:'From $99',
    description:'Appear as a clearly sponsored discovery card after members begin browsing people, players and basketball results.',
    deliverables:['Search / Discover placement','Clickable CTA','Frequency-capped delivery','RCH Reach reporting'],
    idealFor:'Trainers, schools, events, local services and businesses seeking high-intent discovery',
  },
  {
    code:'featured-event',
    name:'Featured Event',
    eyebrow:'Campaign',
    kind:'campaign',
    placement:'event-spotlight',
    package:'boost',
    objective:'event-traffic',
    durationDays:7,
    startingPriceCents:7500,
    priceLabel:'From $75',
    description:'Give a major event priority visibility across eligible RCH discovery surfaces.',
    deliverables:['Featured event placement','Event-focused CTA','Regional targeting','Campaign reporting'],
    idealFor:'Car shows, mixers, tournaments, openings and community events',
  },
  {
    code:'community-feature',
    name:'Community Feature',
    eyebrow:'Featured partner',
    kind:'featured-partner',
    placement:'community-feature',
    package:'amplify',
    objective:'awareness',
    durationDays:14,
    startingPriceCents:9900,
    priceLabel:'From $99',
    description:'Put a brand or organization in front of people exploring the RCH Community Network.',
    deliverables:['Community placement','Brand spotlight treatment','Outbound CTA','RCH Reach reporting'],
    idealFor:'Clubs, restaurants, gyms, shops and community-first businesses',
  },
  {
    code:'rch-tv-feature',
    name:'RCH TV Feature',
    eyebrow:'Media placement',
    kind:'featured-partner',
    placement:'media-feature',
    package:'amplify',
    objective:'media-views',
    durationDays:14,
    startingPriceCents:14900,
    priceLabel:'From $149',
    description:'Place a sponsor around RCH TV and eligible original basketball-media experiences.',
    deliverables:['RCH TV placement','Sponsored brand treatment','Clickable destination','Media-view reporting'],
    idealFor:'Brands that want basketball-media association',
  },
  {
    code:'weekend-guide',
    name:'Weekend Guide Sponsor',
    eyebrow:'Presenting opportunity',
    kind:'presenting',
    placement:'digest',
    package:'custom',
    objective:'awareness',
    durationDays:7,
    startingPriceCents:14900,
    priceLabel:'From $149 / edition',
    description:'Own premium visibility around the recurring RCH guide to basketball, cars, social events, fitness and local culture.',
    deliverables:['Presented-by treatment','Guide placement','Partner CTA','Cross-community association'],
    idealFor:'Restaurants, entertainment, local retail, auto and lifestyle brands',
    featured:true,
  },
  {
    code:'runs-presenting',
    name:'RCH Runs Presenting Partner',
    eyebrow:'Presenting sponsorship',
    kind:'presenting',
    placement:'regional-feature',
    package:'custom',
    objective:'awareness',
    durationDays:30,
    startingPriceCents:50000,
    priceLabel:'From $500 / month',
    description:'Associate your brand with one of RCH’s most repeatable basketball utility products.',
    deliverables:['Presented-by treatment','Runs-area visibility','Regional brand association','Monthly reporting'],
    idealFor:'Gyms, sports medicine, apparel, food, beverage and local service brands',
    featured:true,
  },
  {
    code:'rch-tv-presenting',
    name:'RCH TV Presenting Partner',
    eyebrow:'Presenting sponsorship',
    kind:'presenting',
    placement:'media-feature',
    package:'custom',
    objective:'media-views',
    durationDays:30,
    startingPriceCents:75000,
    priceLabel:'From $750 / month',
    description:'Become the recurring brand associated with RCH’s original basketball video and creator ecosystem.',
    deliverables:['Recurring RCH TV association','Premium media placement','Sponsor CTA','Monthly performance reporting'],
    idealFor:'Dealerships, financial services, telecom, apparel and larger local brands',
  },
  {
    code:'category-exclusive',
    name:'Exclusive Category Partner',
    eyebrow:'Major sponsorship',
    kind:'exclusive',
    placement:'network-home',
    package:'custom',
    objective:'awareness',
    durationDays:null,
    startingPriceCents:null,
    priceLabel:'Custom',
    description:'Discuss category exclusivity across an agreed RCH property, geography or sponsorship term.',
    deliverables:['Category exclusivity where available','Custom inventory mix','Named RCH association','Executive reporting'],
    idealFor:'Dealerships, banks, telecom, insurance, healthcare and enterprise local brands',
    featured:true,
  },
  {
    code:'bmf-presenting', name:'BMF Presenting Partner', eyebrow:'Exclusive event lead',
    kind:'event-partner', placement:'event-spotlight', package:'custom', objective:'event-traffic',
    durationDays:null, startingPriceCents:250000, priceLabel:'Proposed $2,500',
    description:'Top billing and event association for the RCH BMF 1v1 Championship.',
    deliverables:['One presenting partner slot','Presented-by event branding','On-site and digital recognition','Post-event recap placement'],
    idealFor:'A brand seeking lead association with the championship', featured:true, availabilityLabel:'1 proposed slot',
  },
  {
    code:'bmf-championship-partner', name:'BMF Championship Partner', eyebrow:'Event partner',
    kind:'event-partner', placement:'event-spotlight', package:'custom', objective:'event-traffic',
    durationDays:null, startingPriceCents:100000, priceLabel:'Proposed $1,000',
    description:'A featured partner position across the championship event and RCH promotion.',
    deliverables:['Event partner recognition','Digital event promotion','On-site brand placement','Post-event recap placement'],
    idealFor:'Local and regional brands aligned with basketball', featured:true, availabilityLabel:'2 proposed slots',
  },
  {
    code:'bmf-community-partner', name:'BMF Community Partner', eyebrow:'Community support',
    kind:'event-partner', placement:'event-spotlight', package:'custom', objective:'event-traffic',
    durationDays:null, startingPriceCents:50000, priceLabel:'Proposed $500',
    description:'Support the championship and receive a clear, defined event partner presence.',
    deliverables:['Community partner recognition','Digital event promotion','Post-event recap placement'],
    idealFor:'Richmond area businesses and community organizations', featured:false, availabilityLabel:'4 proposed slots',
  },

  {
    code:'rcl-runs-championship-award',name:'Runs 1v1 Championship Award Partner',eyebrow:'2027 League property',lane:'rcl-2027',kind:'event-partner',
    placement:'event-spotlight',package:'custom',objective:'event-traffic',durationDays:null,startingPriceCents:150000,priceLabel:'Asking $1,500',slotCount:1,
    description:'Support the statewide Runs 1v1 championship award and its champion recognition.',
    deliverables:['2 sponsor posts','4 sponsor stories','Reveal photo','Presentation acknowledgment','90-day listing'],
    idealFor:'Brands aligned with Virginia streetball and the Runs community',availabilityLabel:'1 proposed slot · identity and event gates apply',
  },
  {
    code:'rcl-league-championship-award',name:'League Championship Award Partner',eyebrow:'2027 League property',lane:'rcl-2027',kind:'event-partner',
    placement:'event-spotlight',package:'custom',objective:'event-traffic',durationDays:null,startingPriceCents:250000,priceLabel:'Asking $2,500',slotCount:1,
    description:'Associate your brand with the 2027 Rich City League championship award and Finals moment.',
    deliverables:['2 sponsor posts','Championship award reveal','Finals acknowledgment','90-day listing'],
    idealFor:'Brands seeking a clear association with the League champion',availabilityLabel:'1 proposed slot · season and award gates apply',
  },
  {
    code:'rcl-team-uniform-partner',name:'Team Uniform Partner',eyebrow:'2027 League property',lane:'rcl-2027',kind:'event-partner',
    placement:'event-spotlight',package:'custom',objective:'awareness',durationDays:null,startingPriceCents:400000,priceLabel:'Asking $4,000 per team',slotCount:6,
    description:'Primary uniform placement with a participating Rich City League team.',
    deliverables:['Primary uniform position','Team and roster acknowledgment','Uniform reveal video','Team posts'],
    idealFor:'Apparel, footwear, local businesses and team-aligned brands',availabilityLabel:'Up to 6 proposed team slots · uniform production gates apply',
  },
  {
    code:'rcl-digital-platform-partner',name:'Digital Platform Partner',eyebrow:'2027 League property',lane:'rcl-2027',kind:'event-partner',
    placement:'network-home',package:'custom',objective:'website-traffic',durationDays:null,startingPriceCents:500000,priceLabel:'Asking $5,000',slotCount:1,
    description:'A named digital association across the Rich City League platform experience.',
    deliverables:['League Center sponsor panel','Up to 2 digital placements','Tagged destination URL','Monthly reporting'],
    idealFor:'Brands seeking a measurable season-long digital presence',availabilityLabel:'1 proposed slot · League Center readiness gate applies',
  },
  {
    code:'rcl-game-streaming-partner',name:'Game Streaming Partner',eyebrow:'2027 League property',lane:'rcl-2027',kind:'event-partner',
    placement:'media-feature',package:'custom',objective:'media-views',durationDays:null,startingPriceCents:500000,priceLabel:'Asking $5,000',slotCount:1,
    description:'Proposed sponsor treatment across rights-cleared Rich City League broadcasts and programs.',
    deliverables:['Proposed 8 broadcasts or programs','Sponsor slate treatment','Logo integration','Delivery report'],
    idealFor:'Brands investing in basketball media and video storytelling',availabilityLabel:'1 proposed slot · broadcast rights and production gates apply',
  },
  {
    code:'rcl-game-highlights-partner',name:'Game Highlights Partner',eyebrow:'2027 League property',lane:'rcl-2027',kind:'event-partner',
    placement:'media-feature',package:'custom',objective:'media-views',durationDays:null,startingPriceCents:200000,priceLabel:'Asking $2,000',slotCount:1,
    description:'Sponsor identification on a proposed slate of short-form Rich City League highlights.',
    deliverables:['Proposed 12 short-form clips','Approved sponsor treatment','League highlight association','Delivery report'],
    idealFor:'Brands looking for repeatable social-video visibility',availabilityLabel:'1 proposed slot · player, music and media-rights gates apply',
  },
  {
    code:'rcl-playoff-series-partner',name:'Playoff Series Partner',eyebrow:'2027 League property',lane:'rcl-2027',kind:'event-partner',
    placement:'event-spotlight',package:'custom',objective:'event-traffic',durationDays:null,startingPriceCents:300000,priceLabel:'Asking $3,000',slotCount:1,
    description:'Associate your brand with a defined 2027 League playoff series.',
    deliverables:['Bracket treatment','2 digital placements','Approved venue signage','Series recap recognition'],
    idealFor:'Brands seeking postseason visibility in a specific event window',availabilityLabel:'1 proposed slot · schedule and venue gates apply',
  },
  {
    code:'rcl-finals-partner',name:'Championship Finals Partner',eyebrow:'2027 League property',lane:'rcl-2027',kind:'event-partner',
    placement:'event-spotlight',package:'custom',objective:'event-traffic',durationDays:null,startingPriceCents:500000,priceLabel:'Asking $5,000',slotCount:1,
    description:'A presenting designation around the 2027 Rich City League Championship Finals.',
    deliverables:['Finals presenting designation','Championship award acknowledgment','Official recap credit','Defined Finals placements'],
    idealFor:'A lead brand seeking association with the League’s signature event',availabilityLabel:'1 proposed slot · schedule, venue and rights gates apply',
  },
  {
    code:'rcl-social-campaign-partner',name:'League Social Campaign Partner',eyebrow:'2027 League property',lane:'rcl-2027',kind:'event-partner',
    placement:'social-feed',package:'custom',objective:'audience-growth',durationDays:null,startingPriceCents:200000,priceLabel:'Asking $2,000',slotCount:1,
    description:'A defined sponsor campaign across Rich City League social channels during the proposed 90-day term.',
    deliverables:['90-day campaign term','8 feed posts or Reels','12 stories','End-of-campaign report'],
    idealFor:'Brands prioritizing social storytelling and season buildup',availabilityLabel:'1 proposed slot · schedule and creative approval gates apply',
  },

];

export const SPONSOR_BUDGET_OPTIONS=[
  ['under-100','Under $100'],
  ['100-249','$100–$249'],
  ['250-499','$250–$499'],
  ['500-999','$500–$999'],
  ['1000-2499','$1,000–$2,499'],
  ['2500-plus','$2,500+'],
  ['custom','Let’s build it together'],
] as const;

export const SPONSOR_CATEGORIES=[
  'Automotive','Restaurant / Food','Barber / Beauty','Fitness / Wellness','Apparel / Retail',
  'Real Estate','Financial Services','Insurance','Healthcare','Telecom / Technology',
  'Entertainment / Nightlife','Professional Services','Education','Nonprofit / Community','Other',
] as const;

export function sponsorInventoryByCode(code:string|null|undefined){
  return SPONSOR_INVENTORY.find(item=>item.code===code)??null;
}

export function isSelfServeSponsorProduct(itemOrCode:SponsorInventoryItem|string|null|undefined){
  const item=typeof itemOrCode==='string'?sponsorInventoryByCode(itemOrCode):itemOrCode;
  return Boolean(item&&item.startingPriceCents!==null&&item.durationDays!==null&&!item.code.startsWith('bmf-')&&(item.kind==='campaign'||item.kind==='featured-partner'));
}

export function sponsorMoney(cents:number|null){
  if(cents===null)return 'Custom';
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(cents/100);
}
