import {
  FaHouse, FaCalendarDays, FaChartSimple, FaUsers, FaUser, FaFolderOpen, FaNewspaper,
  FaPlay, FaListOl, FaUserTie, FaBell, FaComments, FaPeopleGroup, FaCrown,
  FaTrophy, FaShirt, FaFlask, FaBasketball, FaGear, FaCompass
} from 'react-icons/fa6';

export type RCLNavItem = { label:string; href:string; icon:any };

export const RCL_NAV_ITEMS:RCLNavItem[]=[
  {label:'Home',href:'/',icon:FaHouse},
  {label:'Explore RCL',href:'/explore',icon:FaCompass},
  {label:'The Lab',href:'/lab',icon:FaFlask},
  {label:'Players',href:'/players',icon:FaUser},
  {label:'Teams',href:'/teams',icon:FaUsers},
  {label:'Schedule',href:'/schedule',icon:FaCalendarDays},
  {label:'Games',href:'/games',icon:FaBasketball},
  {label:'Standings',href:'/standings',icon:FaFolderOpen},
  {label:'Stats',href:'/stats',icon:FaChartSimple},
  {label:'Draft Night',href:'/draft',icon:FaCrown},
  {label:'Social',href:'/social',icon:FaPeopleGroup},
  {label:'News',href:'/news',icon:FaNewspaper},
  {label:'Media',href:'/media',icon:FaPlay},
  {label:'Community',href:'/communities',icon:FaPeopleGroup},
  {label:'Rankings',href:'/rankings',icon:FaListOl},
  {label:'Fantasy',href:'/fantasy',icon:FaTrophy},
  {label:'Leaderboards',href:'/leaderboards',icon:FaListOl},
  {label:'Game IQ',href:'/game-iq',icon:FaChartSimple},
  {label:'Messages',href:'/messages',icon:FaComments},
  {label:'Friends',href:'/friends',icon:FaUsers},
  {label:'Coaches',href:'/coaches',icon:FaUserTie},
  {label:'Awards',href:'/badges',icon:FaTrophy},
  {label:'Shop',href:'/shop',icon:FaShirt},
  {label:'Notifications',href:'/notifications',icon:FaBell},
  {label:'About',href:'/about',icon:FaBasketball},
];

export const RCL_ADMIN_NAV_ITEM:RCLNavItem={label:'Admin',href:'/admin',icon:FaGear};
