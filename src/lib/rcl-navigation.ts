import {
  FaHouse, FaCalendarDays, FaChartSimple, FaUsers, FaUser, FaNewspaper,
  FaPlay, FaListOl, FaUserTie, FaBell, FaComments, FaPeopleGroup, FaCrown,
  FaTrophy, FaShirt, FaBasketball, FaGear, FaCompass
} from 'react-icons/fa6';
import type { IconType } from 'react-icons';

export type RCLNavItem = { label:string; href:string; icon:IconType };
export type RCLNavGroup = { label:string; description:string; items:RCLNavItem[] };

export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

const LEAGUE_FAMILY=['/league','/schedule','/games','/standings','/stats','/rankings','/coaches'];
const SOCIAL_FAMILY=['/social','/friends','/messages','/communities','/runs'];

export function isPrimaryNavigationActive(pathname:string, href:string){
  if(href==='/league') return LEAGUE_FAMILY.some(path=>pathname===path||pathname.startsWith(`${path}/`));
  if(href==='/social') return SOCIAL_FAMILY.some(path=>pathname===path||pathname.startsWith(`${path}/`));
  return isNavigationActive(pathname,href);
}

const HOME:RCLNavItem={label:'Home',href:'/',icon:FaHouse};
const LEAGUE:RCLNavItem={label:'League',href:'/league',icon:FaBasketball};
const EXPLORE:RCLNavItem={label:'Explore',href:'/explore',icon:FaCompass};
const PLAYERS:RCLNavItem={label:'Players',href:'/players',icon:FaUser};
const TEAMS:RCLNavItem={label:'Teams',href:'/teams',icon:FaUsers};
const SOCIAL:RCLNavItem={label:'Social',href:'/social',icon:FaPeopleGroup};
const NEWS:RCLNavItem={label:'News',href:'/news',icon:FaNewspaper};

export const RCL_PRIMARY_NAV_ITEMS:RCLNavItem[]=[
  HOME,
  LEAGUE,
  PLAYERS,
  TEAMS,
  SOCIAL,
  NEWS,
  EXPLORE,
];

export const RCL_NAV_GROUPS:RCLNavGroup[]=[
  {
    label:'League',
    description:'Competition, teams and performance',
    items:[
      PLAYERS,
      TEAMS,
      {label:'Schedule',href:'/schedule',icon:FaCalendarDays},
      {label:'Games',href:'/games',icon:FaBasketball},
      {label:'Standings',href:'/standings',icon:FaListOl},
      {label:'Stats',href:'/stats',icon:FaChartSimple},
      {label:'Rankings',href:'/rankings',icon:FaListOl},
      {label:'Coaches',href:'/coaches',icon:FaUserTie},
    ],
  },
  {
    label:'Experience',
    description:'Signature RCL products and game layers',
    items:[
      {label:'Draft Night',href:'/draft',icon:FaCrown},
      {label:'Fantasy',href:'/fantasy',icon:FaTrophy},
      {label:'Leaderboards',href:'/leaderboards',icon:FaListOl},
      {label:'Game IQ',href:'/game-iq',icon:FaChartSimple},
      {label:'Shop',href:'/shop',icon:FaShirt},
    ],
  },
  {
    label:'Community',
    description:'People, stories and basketball culture',
    items:[
      SOCIAL,
      NEWS,
      {label:'Media',href:'/media',icon:FaPlay},
      {label:'Communities',href:'/communities',icon:FaPeopleGroup},
      {label:'Friends',href:'/friends',icon:FaUsers},
      {label:'Messages',href:'/messages',icon:FaComments},
      {label:'Awards',href:'/badges',icon:FaTrophy},
    ],
  },
  {
    label:'Organization',
    description:'About RCL and your account activity',
    items:[
      {label:'Notifications',href:'/notifications',icon:FaBell},
      {label:'About RCL',href:'/about',icon:FaBasketball},
    ],
  },
];

export const RCL_NAV_ITEMS:RCLNavItem[]=[
  HOME,
  LEAGUE,
  EXPLORE,
  ...RCL_NAV_GROUPS.flatMap(group=>group.items),
].filter((item,index,items)=>items.findIndex(candidate=>candidate.href===item.href)===index);

export const RCL_ADMIN_NAV_ITEM:RCLNavItem={label:'Admin',href:'/admin',icon:FaGear};
export const RCL_ADMIN_NAV_GROUP:RCLNavGroup={
  label:'Operations',
  description:'Staff and league administration',
  items:[RCL_ADMIN_NAV_ITEM],
};
