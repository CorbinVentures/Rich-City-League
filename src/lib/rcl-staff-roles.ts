/**
 * RCL staff assignments are distinct from free RCH member identities and
 * profiles.role (admin/staff). Nothing here grants a Supabase privilege.
 */
export type RCLStaffRole='league_coach'|'accountant'|'video_staff'|'cheerleading_coach'|'referee'|'franchise_owner';
export type RCLStaffRequestStatus='pending'|'approved'|'rejected'|'withdrawn';
export type RCLStaffRoleInfo={
 id:RCLStaffRole;title:string;department:string;description:string;
 teamRequired:boolean;actions:readonly {title:string;href:string;note:string}[];
};
export const RCL_STAFF_ROLES:readonly RCLStaffRoleInfo[]=[
 {id:'league_coach',title:'Rich City League Coach',department:'Competition',teamRequired:true,
  description:'Lead an officially assigned RCL team, coordinate practices and develop players.',
  actions:[{title:'Team directory',href:'/teams',note:'See your team and season'},{title:'Game schedule',href:'/games',note:'Track upcoming matchups'},{title:'My RCH profile',href:'/social/profile/me',note:'Your personal basketball presence'}]},
 {id:'accountant',title:'Accountant',department:'Finance',teamRequired:false,
  description:'Assist with financial reconciliation, invoices, game settlements and budgets.',
  actions:[{title:'Staff assignments',href:'/staff',note:'View your confirmed role'},{title:'League schedule',href:'/games',note:'See upcoming events for planning'}]},
 {id:'video_staff',title:'Video & Media Staff',department:'Media Production',teamRequired:false,
  description:'Work on game footage, production schedules, highlight reels and RCH TV.',
  actions:[{title:'RCH TV',href:'/media',note:'Browse productions'},{title:'Game schedule',href:'/games',note:'Plan filming coverage'},{title:'Creator program',href:'/media/creators',note:'Explore production opportunities'}]},
 {id:'cheerleading_coach',title:'Cheerleading Coach',department:'Entertainment',teamRequired:false,
  description:'Lead cheer teams, rehearsals, halftime routines and game-day entertainment.',
  actions:[{title:'Game schedule',href:'/games',note:'Coordinate performances'},{title:'League teams',href:'/teams',note:'See the league organizations'}]},
 {id:'referee',title:'Referee',department:'Game Officials',teamRequired:false,
  description:'Officiate assigned games, follow league rules and coordinate game-day availability.',
  actions:[{title:'Game schedule',href:'/games',note:'Plan assignments'},{title:'League center',href:'/league',note:'View competition information'}]},
 {id:'franchise_owner',title:'Franchise Owner',department:'Franchise Leadership',teamRequired:true,
  description:'Request ownership access for a specific RCL franchise. No owner permissions activate before administrator approval.',
  actions:[{title:'My franchise',href:'/staff/franchise',note:'Team-scoped approved franchise office'},{title:'League teams',href:'/teams',note:'Review team information'},{title:'Game schedule',href:'/games',note:'Follow franchise matchups'}]}
] as const;
export const roleInfo=(id:string)=>RCL_STAFF_ROLES.find(r=>r.id===id);
export const isRCLStaffRole=(id:string):id is RCLStaffRole=>RCL_STAFF_ROLES.some(r=>r.id===id);
