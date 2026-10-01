import {
  FaHouse, FaCalendarDays, FaChartSimple, FaUsers, FaUser, FaNewspaper,
  FaPlay, FaListOl, FaUserTie, FaBell, FaComments, FaPeopleGroup, FaCrown,
  FaTrophy, FaShirt, FaBasketball, FaGear, FaCompass, FaBolt, FaLocationDot,
  FaMedal, FaArrowRightArrowLeft, FaGlobe, FaBullhorn, FaPenToSquare
} from 'react-icons/fa6';
import type { IconType } from 'react-icons';

export type RCLNavItem = { label:string; href:string; icon:IconType };
export type RCLNavGroup = { label:string; description:string; items:RCLNavItem[] };

export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

const LEAGUE_FAMILY=['/league','/schedule','/games','/standings','/stats','/rankings','/coaches','/pickem'];
const SOCIAL_FAMILY=['/social','/friends','/messages','/communities','/runs'];
const NETWORK_FAMILY=['/network','/organizations'];

export function isPrimaryNavigationActive(pathname:string, href:string){
  if(href==='/league') return LEAGUE_FAMILY.some(path=>pathname===path||pathname.startsWith(`${path}/`));
  if(href==='/social') return SOCIAL_FAMILY.some(path=>pathname===path||pathname.startsWith(`${path}/`));
  if(href==='/network') return NETWORK_FAMILY.some(path=>pathname===path||pathname.startsWith(`${path}/`));
  return isNavigationActive(pathname,href);
}

const HOME:RCLNavItem={label:'Home',href:'/',icon:FaHouse};
const TODAY:RCLNavItem={label:'Today',href:'/today',icon:FaBolt};
const LEAGUE:RCLNavItem={label:'League',href:'/league',icon:FaBasketball};
const NETWORK:RCLNavItem={label:'Virginia Network',href:'/network',icon:FaGlobe};
const EXPLORE:RCLNavItem={label:'Explore',href:'/explore',icon:FaCompass};
const PLAYERS:RCLNavItem={label:'Players',href:'/players',icon:FaUser};
const TEAMS:RCLNavItem={label:'Teams',href:'/teams',icon:FaUsers};
const SOCIAL:RCLNavItem={label:'Social',href:'/social',icon:FaPeopleGroup};
const NEWS:RCLNavItem={label:'News',href:'/news',icon:FaNewspaper};

export const RCL_PRIMARY_NAV_ITEMS:RCLNavItem[]=[HOME,LEAGUE,NETWORK,PLAYERS,TEAMS,SOCIAL,NEWS,EXPLORE];

export const RCL_NAV_GROUPS:RCLNavGroup[]=[
  {label:'League',description:'Rich City League flagship competition and performance',items:[PLAYERS,TEAMS,{label:'Schedule',href:'/schedule',icon:FaCalendarDays},{label:'Game Night',href:'/games',icon:FaBasketball},{label:'Pick’em',href:'/pickem',icon:FaTrophy},{label:'Standings',href:'/standings',icon:FaListOl},{label:'Stats',href:'/stats',icon:FaChartSimple},{label:'Rankings',href:'/rankings',icon:FaListOl},{label:'Player Compare',href:'/players/compare',icon:FaArrowRightArrowLeft},{label:'Coaches',href:'/coaches',icon:FaUserTie}]},
  {label:'Virginia Network',description:'Discover and amplify basketball across Virginia',items:[NETWORK,{label:'Organizations',href:'/organizations',icon:FaPeopleGroup},{label:'For Organizations',href:'/network/partners',icon:FaBullhorn},{label:'Join the Network',href:'/network/partners/apply',icon:FaGlobe},{label:'Partner Dashboard',href:'/network/dashboard',icon:FaChartSimple},{label:'RCL Reach',href:'/network/dashboard/reach',icon:FaChartSimple},{label:'Manage Organization',href:'/network/dashboard/profile',icon:FaPenToSquare}]},
  {label:'Experience',description:'Signature RCL products and game layers',items:[TODAY,{label:'My Hoops',href:'/my-hoops',icon:FaBolt},{label:'Weekly Missions',href:'/missions',icon:FaMedal},{label:'Open Runs',href:'/runs',icon:FaLocationDot},{label:'Draft Night',href:'/draft',icon:FaCrown},{label:'Fantasy',href:'/fantasy',icon:FaTrophy},{label:'Leaderboards',href:'/leaderboards',icon:FaListOl},{label:'Game IQ',href:'/game-iq',icon:FaChartSimple},{label:'Shop',href:'/shop',icon:FaShirt}]},
  {label:'Community',description:'People, stories and basketball culture',items:[SOCIAL,NEWS,{label:'RCL TV',href:'/media',icon:FaPlay},{label:'Communities',href:'/communities',icon:FaPeopleGroup},{label:'Basketball Connections',href:'/connections',icon:FaUsers},{label:'Friends',href:'/friends',icon:FaUsers},{label:'Messages',href:'/messages',icon:FaComments},{label:'Awards',href:'/badges',icon:FaTrophy},{label:'Legacy',href:'/legacy',icon:FaCrown}]},
  {label:'RCL',description:'About RCL, membership and account activity',items:[{label:'Membership',href:'/membership',icon:FaCrown},{label:'Notifications',href:'/notifications',icon:FaBell},{label:'Alert Settings',href:'/settings/notifications',icon:FaGear},{label:'About RCL',href:'/about',icon:FaBasketball}]},
];

export const RCL_NAV_ITEMS:RCLNavItem[]=[HOME,TODAY,LEAGUE,NETWORK,EXPLORE,...RCL_NAV_GROUPS.flatMap(group=>group.items)].filter((item,index,items)=>items.findIndex(candidate=>candidate.href===item.href)===index);

export const RCL_ADMIN_NAV_ITEM:RCLNavItem={label:'Admin',href:'/admin',icon:FaGear};
export const RCL_NETWORK_ADMIN_ITEM:RCLNavItem={label:'Network Operations',href:'/admin/network',icon:FaBullhorn};
export const RCL_NETWORK_CAMPAIGNS_ADMIN_ITEM:RCLNavItem={label:'Campaign Control',href:'/admin/network/campaigns',icon:FaChartSimple};
export const RCL_NETWORK_ACQUISITION_ADMIN_ITEM:RCLNavItem={label:'Network Acquisition',href:'/admin/network/acquisition',icon:FaPeopleGroup};
export const RCL_REVENUE_ADMIN_ITEM:RCLNavItem={label:'Revenue Center',href:'/admin/revenue',icon:FaChartSimple};
export const RCL_ADMIN_NAV_GROUP:RCLNavGroup={label:'Operations',description:'Staff, league, revenue and Network administration',items:[RCL_ADMIN_NAV_ITEM,RCL_REVENUE_ADMIN_ITEM,RCL_NETWORK_ADMIN_ITEM,RCL_NETWORK_CAMPAIGNS_ADMIN_ITEM,RCL_NETWORK_ACQUISITION_ADMIN_ITEM]};
