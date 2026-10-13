// RCL internal chart of accounts: use stable codes for accurate season and game reporting.
// Concession revenue is captured exclusively via the concessions POS, not game ledger.
export type Template = {code:string;label:string;group:string;hint?:string};
export const budgetTemplates:Template[] = [
 {code:'uniforms_jerseys',label:'Game jerseys & shorts',group:'Uniforms'},
 {code:'uniforms_warmups',label:'Warmups & practice apparel',group:'Uniforms'},
 {code:'venue_game_rental',label:'Game gym rental',group:'Facilities'},
 {code:'venue_practice_rental',label:'Practice court rental',group:'Facilities'},
 {code:'venue_staffing_deposits',label:'Venue deposits & staffing',group:'Facilities'},
 {code:'officials_referees',label:'Referees & officials',group:'Game personnel'},
 {code:'scorekeepers_statcrew',label:'Scorekeepers, stats & clock',group:'Game personnel'},
 {code:'security_medical',label:'Security, EMT & medical',group:'Game personnel'},
 {code:'staff_payroll',label:'League & event staff',group:'Game personnel'},
 {code:'equipment_basketballs',label:'Basketballs & training supplies',group:'Equipment'},
 {code:'equipment_scoreboards',label:'Scoreboards & scorebook',group:'Equipment'},
 {code:'media_streaming_production',label:'Live stream & video production',group:'Media'},
 {code:'media_photography',label:'Photography & creative content',group:'Media'},
 {code:'marketing_digital',label:'Digital marketing & paid ads',group:'Marketing'},
 {code:'marketing_print',label:'Flyers, banners & signs',group:'Marketing'},
 {code:'insurance_permits',label:'Insurance, permits & licenses',group:'Administration'},
 {code:'technology_platform',label:'Software, web & payment services',group:'Administration'},
 {code:'travel_transport',label:'Transportation & travel',group:'Travel'},
 {code:'awards_trophies',label:'Awards, trophies & championship',group:'Awards'},
 {code:'concession_inventory',label:'Concession stock purchases',group:'Concessions'},
 {code:'concession_equipment',label:'Concession equipment & supplies',group:'Concessions'},
 {code:'merchandise_cost',label:'Merchandise production',group:'Merchandise'},
 {code:'cleaning_utilities',label:'Cleaning & utilities',group:'Facilities'},
 {code:'contingency',label:'Contingency reserve',group:'Administration'},
];
export const incomeTemplates:Template[] = [
 {code:'registration_fees',label:'Player registration',group:'Registration'},
 {code:'team_franchise_fees',label:'Team or franchise fees',group:'Registration'},
 {code:'ticket_general',label:'General admission tickets',group:'Tickets'},
 {code:'ticket_vip',label:'VIP or premium tickets',group:'Tickets'},
 {code:'ticket_season_pass',label:'Season pass allocation',group:'Tickets'},
 {code:'ticket_door_cash',label:'Door admissions (cash)',group:'Tickets'},
 {code:'sponsorship_league',label:'League sponsorship',group:'Sponsors'},
 {code:'sponsorship_game',label:'Game presenting sponsor',group:'Sponsors'},
 {code:'sponsorship_team',label:'Franchise sponsorship',group:'Sponsors'},
 {code:'advertising_in_venue',label:'In-venue advertising',group:'Sponsors'},
 {code:'merchandise_sales',label:'Team/league merchandise sales',group:'Merchandise'},
 {code:'media_subscription',label:'RCH TV subscriptions',group:'Media'},
 {code:'media_sponsorship',label:'RCH TV program sponsorship',group:'Media'},
 {code:'donations_grants',label:'Donations & grants',group:'Community'},
 {code:'vendor_fees',label:'Vendor booth fees',group:'Game day'},
 {code:'parking_revenue',label:'Game parking proceeds',group:'Game day'},
 {code:'other_income',label:'Other identified league income',group:'Other'},
];
export const expenseTemplates:Template[] = [
 {code:'uniforms_jerseys',label:'Uniforms & jerseys',group:'Team'},
 {code:'venue_game_rental',label:'Game venue rental',group:'Facilities'},
 {code:'venue_practice_rental',label:'Practice gym rental',group:'Facilities'},
 {code:'venue_staffing_deposits',label:'Venue fees, deposits & staff',group:'Facilities'},
 {code:'officials_referees',label:'Referee payments',group:'Officials'},
 {code:'scorekeepers_statcrew',label:'Scorekeeper / clock / statistician',group:'Officials'},
 {code:'security_medical',label:'Security & medical coverage',group:'Game day'},
 {code:'staff_payroll',label:'Event staff payroll',group:'Game day'},
 {code:'equipment_supplies',label:'Balls, equipment & supplies',group:'Equipment'},
 {code:'media_streaming_production',label:'Live stream / editing / media',group:'Media'},
 {code:'marketing_promotion',label:'Advertising & promotion',group:'Marketing'},
 {code:'insurance_permits',label:'Insurance, licenses & permits',group:'Compliance'},
 {code:'technology_fees',label:'Software & payment platform',group:'Technology'},
 {code:'travel_transport',label:'Team/staff travel',group:'Travel'},
 {code:'awards_prizes',label:'Awards, prizes & trophies',group:'Awards'},
 {code:'merchant_processing_fees',label:'Card processing fees',group:'Finance'},
 {code:'merchandise_cost',label:'Merchandise cost of goods',group:'Merchandise'},
 {code:'concession_purchases',label:'Concession wholesale purchases',group:'Concessions'},
 {code:'cleaning_utilities',label:'Cleaning & utilities',group:'Facilities'},
 {code:'other_operating',label:'Other identified operating expense',group:'Other'},
];
export const gameIncomeCodes=[
 'ticket_general','ticket_vip','ticket_season_pass','ticket_door_cash',
 'sponsorship_game','advertising_in_venue','merchandise_sales',
 'vendor_fees','parking_revenue','media_sponsorship',
] as const;
export const gameExpenseCodes=[
 'venue_game_rental','venue_staffing_deposits','officials_referees',
 'scorekeepers_statcrew','security_medical','staff_payroll',
 'media_streaming_production','merchant_processing_fees',
 'cleaning_utilities','other_operating',
] as const;
export const gameIncomeTemplates=incomeTemplates.filter(x=>(gameIncomeCodes as readonly string[]).includes(x.code));
export const gameExpenseTemplates=expenseTemplates.filter(x=>(gameExpenseCodes as readonly string[]).includes(x.code));
export const labelFor=(code?:string)=> [...budgetTemplates,...incomeTemplates,...expenseTemplates].find(x=>x.code===code)?.label
 ||(code||'Uncategorized').replaceAll('_',' ');
export const templatesFor=(direction:'income'|'expense')=>direction==='income'?incomeTemplates:expenseTemplates;
export const gameTaskRules=[
 {key:'confirm_venue',title:'Confirm contracted court and setup access',type:'auto',group:'VENUE',days:14},
 {key:'assign_opponent',title:'Verify both franchises and game schedule',type:'auto',group:'GAME',days:14},
 {key:'officials_confirmed',title:'Assign and confirm referee crew',type:'manual',group:'OFFICIALS',days:7},
 {key:'scorebook_ready',title:'Set up the scorebook and scoreboard',type:'manual',group:'TECH',days:2},
 {key:'media_crew',title:'Assign RCH TV camera, score overlay and audio',type:'manual',group:'MEDIA',days:7},
 {key:'ticketing_ready',title:'Publish admission offer and gate procedures',type:'manual',group:'TICKETS',days:7},
 {key:'concessions_ready',title:'Confirm stock, prices and food safety supplies',type:'manual',group:'FOOD',days:2},
 {key:'security_medical',title:'Confirm venue security and first-aid contacts',type:'manual',group:'SAFETY',days:2},
 {key:'social_promo',title:'Publish the matchup and hype storyline',type:'manual',group:'MARKETING',days:4},
 {key:'game_status',title:'Confirm final game result from official scorebook',type:'auto',group:'AFTER GAME',days:0},
 {key:'attendance_entered',title:'Reconcile gate counts and paid admissions',type:'auto',group:'AFTER GAME',days:0},
 {key:'financial_settlement',title:'Reconcile sales, rentals, payouts and game costs',type:'manual',group:'AFTER GAME',days:0},
] as const;
