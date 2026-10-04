import {
  FaBasketball, FaBell, FaBolt, FaBullhorn, FaCalendarDays, FaChartSimple,
  FaComments, FaCompass, FaCrown, FaFilm, FaGear, FaGlobe, FaHouse, FaListOl,
  FaLocationDot, FaMedal, FaNewspaper, FaPeopleGroup, FaPlay, FaPlus,
  FaShirt, FaTrophy, FaUser, FaUsers
} from 'react-icons/fa6';
import type { IconType } from 'react-icons';

export type RCLNavItem = { label:string; href:string; icon:IconType };
export type RCLNavGroup = { label:string; description:string; items:RCLNavItem[] };

export function isNavigationActive(pathname:string,href:string){
  const clean=href.split('?')[0];
  return pathname===clean||(clean!=='/'&&pathname.startsWith(`${clean}/`));
}

const SOCIAL_FAMILY=['/social'];
const DISCOVER_FAMILY=['/discover','/explore','/search','/players','/teams','/organizations','/network','/community','/news','/media','/communities','/friends'];
const CREATE_FAMILY=['/create'];
const RUNS_FAMILY=['/runs','/richmond-basketball-runs'];
const LEAGUE_FAMILY=['/league','/schedule','/games','/standings','/stats','/rankings','/coaches','/pickem','/fantasy','/draft','/game-iq','/leaderboards'];

export function isPrimaryNavigationActive(pathname:string,href:string){
  if(href==='/social') return SOCIAL_FAMILY.some(path=>pathname===path||pathname.startsWith(`${path}/`));
  if(href==='/discover') return DISCOVER_FAMILY.some(path=>pathname===path||pathname.startsWith(`${path}/`));
  if(href==='/create') return CREATE_FAMILY.some(path=>pathname===path||pathname.startsWith(`${path}/`));
  if(href==='/runs') return RUNS_FAMILY.some(path=>pathname===path||pathname.startsWith(`${path}/`));
  if(href==='/league') return LEAGUE_FAMILY.some(path=>pathname===path||pathname.startsWith(`${path}/`));
  return isNavigationActive(pathname,href);
}

export const RCL_PRIMARY_NAV_ITEMS:RCLNavItem[]=[
  {label:'Home',href:'/social',icon:FaHouse},
  {label:'Discover',href:'/discover',icon:FaCompass},
  {label:'Create',href:'/create',icon:FaPlus},
  {label:'Runs',href:'/runs',icon:FaLocationDot},
  {label:'League',href:'/league',icon:FaBasketball},
];

export const RCL_NAV_GROUPS:RCLNavGroup[]=[
  {
    label:'Your basketball',
    description:'Your identity, conversations and personalized basketball world',
    items:[
      {label:'Home Feed',href:'/social',icon:FaHouse},
      {label:'My Hoops',href:'/my-hoops',icon:FaBolt},
      {label:'Communities',href:'/communities',icon:FaPeopleGroup},
      {label:'Messages',href:'/messages',icon:FaComments},
      {label:'Notifications',href:'/notifications',icon:FaBell},
      {label:'REP + Badges',href:'/badges',icon:FaMedal},
    ],
  },
  {
    label:'Discover',
    description:'Find the people, teams, stories and organizations shaping Virginia basketball',
    items:[
      {label:'Discover Basketball',href:'/discover',icon:FaCompass},
      {label:'Players',href:'/players',icon:FaUser},
      {label:'Teams',href:'/teams',icon:FaUsers},
      {label:'Organizations',href:'/organizations',icon:FaPeopleGroup},
      {label:'Virginia Network',href:'/network',icon:FaGlobe},
      {label:'Community Network',href:'/community',icon:FaPeopleGroup},
      {label:'News',href:'/news',icon:FaNewspaper},
      {label:'RCH TV',href:'/media',icon:FaPlay},
    ],
  },
  {
    label:'Rich City League',
    description:'The flagship competition property inside the RCL basketball world',
    items:[
      {label:'League Center',href:'/league',icon:FaBasketball},
      {label:'Schedule',href:'/schedule',icon:FaCalendarDays},
      {label:'Game Night',href:'/games',icon:FaBasketball},
      {label:'Standings',href:'/standings',icon:FaListOl},
      {label:'Stats',href:'/stats',icon:FaChartSimple},
      {label:'Rankings',href:'/rankings',icon:FaTrophy},
      {label:'Fantasy',href:'/fantasy',icon:FaTrophy},
      {label:'Pick’em',href:'/pickem',icon:FaTrophy},
      {label:'Draft Night',href:'/draft',icon:FaCrown},
      {label:'Game IQ',href:'/game-iq',icon:FaChartSimple},
    ],
  },
  {
    label:'Membership + shop',
    description:'Premium basketball utility, member benefits and RCL drops',
    items:[
      {label:'Membership',href:'/membership',icon:FaCrown},
      {label:'Shop RCL',href:'/shop',icon:FaShirt},
      {label:'My Hoops',href:'/my-hoops',icon:FaBolt},
    ],
  },
  {
    label:'For organizations',
    description:'Claim your presence, publish activity and grow through RCL',
    items:[
      {label:'For Organizations',href:'/network/partners',icon:FaBullhorn},
      {label:'Join the Network',href:'/network/partners/apply',icon:FaGlobe},
      {label:'Partner Dashboard',href:'/network/dashboard',icon:FaChartSimple},
      {label:'RCL Reach',href:'/network/dashboard/reach',icon:FaChartSimple},
    ],
  },
];

export const RCL_NAV_ITEMS:RCLNavItem[]=[...RCL_PRIMARY_NAV_ITEMS,...RCL_NAV_GROUPS.flatMap(group=>group.items)]
  .filter((item,index,items)=>items.findIndex(candidate=>candidate.href===item.href)===index);

export const RCL_ADMIN_NAV_ITEM:RCLNavItem={label:'Admin',href:'/admin',icon:FaGear};
export const RCL_NETWORK_ADMIN_ITEM:RCLNavItem={label:'Network Operations',href:'/admin/network',icon:FaBullhorn};
export const RCL_NETWORK_CAMPAIGNS_ADMIN_ITEM:RCLNavItem={label:'Campaign Control',href:'/admin/network/campaigns',icon:FaChartSimple};
export const RCL_NETWORK_ACQUISITION_ADMIN_ITEM:RCLNavItem={label:'Network Acquisition',href:'/admin/network/acquisition',icon:FaPeopleGroup};
export const RCL_NETWORK_EDITORIAL_ADMIN_ITEM:RCLNavItem={label:'Editorial Queue',href:'/admin/network/editorial',icon:FaNewspaper};
export const RCL_REVENUE_ADMIN_ITEM:RCLNavItem={label:'Revenue Center',href:'/admin/revenue',icon:FaChartSimple};
export const RCH_TV_ACQUISITION_ADMIN_ITEM:RCLNavItem={label:'RCH TV Acquisition',href:'/admin/rch-tv/acquisition',icon:FaFilm};
export const RCL_ADMIN_NAV_GROUP:RCLNavGroup={
  label:'Operations',
  description:'Staff, league, revenue and Network administration',
  items:[RCL_ADMIN_NAV_ITEM,RCL_REVENUE_ADMIN_ITEM,RCH_TV_ACQUISITION_ADMIN_ITEM,RCL_NETWORK_ADMIN_ITEM,RCL_NETWORK_CAMPAIGNS_ADMIN_ITEM,RCL_NETWORK_EDITORIAL_ADMIN_ITEM,RCL_NETWORK_ACQUISITION_ADMIN_ITEM],
};
