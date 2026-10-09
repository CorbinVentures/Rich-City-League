import {
  FaBasketball, FaBell, FaBolt, FaBullhorn, FaChartSimple,
  FaCompass, FaCrown, FaDownload, FaGlobe, FaHandshake, FaHouse, FaLocationDot, FaMedal, FaNewspaper,
  FaPeopleGroup, FaPlay, FaPlus, FaShirt, FaTrophy, FaUser, FaUserPlus, FaUsers
} from 'react-icons/fa6';
import type { IconType } from 'react-icons';
import type { RCLNavGroup } from '@/lib/rcl-navigation';

export type RCLMemberNavItem={label:string;href:string;icon:IconType;action?:'create'};

export const RCL_MEMBER_PRIMARY_NAV:RCLMemberNavItem[]=[
  {label:'Home',href:'/social',icon:FaHouse},
  {label:'Discover',href:'/discover',icon:FaCompass},
  {label:'Create',href:'/create',icon:FaPlus,action:'create'},
  {label:'Runs',href:'/runs',icon:FaLocationDot},
  {label:'Profile',href:'/social/profile/me',icon:FaUser},
];

export const RCL_MEMBER_DESKTOP_NAV=RCL_MEMBER_PRIMARY_NAV;

export const RCL_MEMBER_NAV_GROUPS:RCLNavGroup[]=[
  {
    label:'Your basketball',
    description:'Your identity, people, conversations and personalized basketball world',
    items:[
      {label:'Home Feed',href:'/social',icon:FaHouse},
      {label:'Get the RCH App',href:'/app',icon:FaDownload},
      {label:'RCH Today',href:'/today',icon:FaBolt},
      {label:'My Profile',href:'/social/profile/me',icon:FaUser},
      {label:'My Hoops',href:'/my-hoops',icon:FaBolt},
      {label:'Notifications',href:'/notifications',icon:FaBell},
      {label:'Communities',href:'/communities',icon:FaPeopleGroup},
      {label:'REP + Badges',href:'/badges',icon:FaMedal},
      {label:'Invite + Earn',href:'/referrals',icon:FaUserPlus},
    ],
  },
  {
    label:'Discover',
    description:'Find people, teams, organizations, media and opportunities around you',
    items:[
      {label:'Discover Basketball',href:'/discover',icon:FaCompass},
      {label:'Basketball Radar',href:'/radar',icon:FaLocationDot},
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
    description:'The premier league and flagship competition property on RCL',
    items:[
      {label:'League Center',href:'/league',icon:FaBasketball},
      {label:'Games',href:'/games',icon:FaBasketball},
      {label:'Standings',href:'/standings',icon:FaChartSimple},
      {label:'Stats',href:'/stats',icon:FaChartSimple},
      {label:'Rankings',href:'/rankings',icon:FaTrophy},
      {label:'Draft Night',href:'/draft',icon:FaCrown},
      {label:'Fantasy',href:'/fantasy',icon:FaTrophy},
    ],
  },
  {
    label:'Membership + shop',
    description:'Premium tools, member benefits and limited RCL drops',
    items:[
      {label:'Membership',href:'/membership',icon:FaCrown},
      {label:'Shop RCL',href:'/shop',icon:FaShirt},
    ],
  },
  {
    label:'Organization tools',
    description:'Manage and grow an organization without turning RCL into league-management software',
    items:[
      {label:'For Organizations',href:'/network/partners',icon:FaBullhorn},
      {label:'Sponsor + Advertise',href:'/sponsors',icon:FaHandshake},
      {label:'Sponsor Dashboard',href:'/sponsors/dashboard',icon:FaHandshake},
      {label:'Partner Dashboard',href:'/network/dashboard',icon:FaChartSimple},
      {label:'Organization Profile',href:'/network/dashboard/profile',icon:FaUser},
      {label:'Editorial Studio',href:'/network/dashboard/editorial',icon:FaNewspaper},
      {label:'Boost',href:'/network/dashboard/boost',icon:FaBolt},
      {label:'RCL Reach',href:'/network/dashboard/reach',icon:FaChartSimple},
      {label:'Billing',href:'/network/dashboard/billing',icon:FaCrown},
    ],
  },
];

const SOCIAL=['/social'];
const DISCOVER=['/discover','/explore','/search','/players','/teams','/organizations','/network','/community','/news','/media','/communities','/friends'];
const RUNS=['/runs','/richmond-basketball-runs'];
const PROFILE=['/social/profile','/profile'];
const LEAGUE=['/league','/schedule','/games','/standings','/stats','/rankings','/coaches','/pickem','/fantasy','/draft','/game-iq','/leaderboards'];

export function isMemberNavigationActive(pathname:string,href:string){
  const family=href==='/social'?SOCIAL:href==='/discover'?DISCOVER:href==='/runs'?RUNS:href==='/profile'||href==='/social/profile/me'?PROFILE:href==='/league'?LEAGUE:href==='/create'?['/create']:null;
  if(family) return family.some(path=>pathname===path||pathname.startsWith(`${path}/`));
  const clean=href.split('?')[0];
  return pathname===clean||(clean!=='/'&&pathname.startsWith(`${clean}/`));
}
