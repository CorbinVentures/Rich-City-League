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
  | 'category-exclusive';

export type SponsorInventoryItem = {
  code:SponsorInventoryCode;
  name:string;
  eyebrow:string;
  kind:'campaign'|'featured-partner'|'presenting'|'exclusive';
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

export function sponsorMoney(cents:number|null){
  if(cents===null)return 'Custom';
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(cents/100);
}
