/** Planned 2027 RCH event financial scenarios. No projected amount is an actual receipt. */
export const EVENT_KEYS = ["bmf","cup","tryouts","shootout","full_team"] as const;
export type EventKey = typeof EVENT_KEYS[number];
export const BUDGET_FIELDS = ["teams","entryFee","spectators","ticketPrice","sponsors","vendors","vendorFee","days","games","jerseysPerTeam","beltCount","venueRental","venueStaff","officialUnits","officialRate","media","dj","otherAwards","insurance","security","marketing","equipment","permits","otherStaff","contingencyRate","processingRate","beltCost","jerseyUnitCost"] as const;
export type BudgetField = typeof BUDGET_FIELDS[number];
export type BudgetAssumptions = Record<BudgetField,number>;
export type EventBudgetPlan = { id:string;year:number;event_key:EventKey;name:string;event_count:number;cash_prize:number|null;notes:string;assumptions:BudgetAssumptions;updated_at?:string };
export type SeedBudget = Omit<EventBudgetPlan,'id'|'year'|'updated_at'>;
export const INITIAL_EVENT_BUDGETS:SeedBudget[] = [
  {
    "event_key": "bmf",
    "name": "BMF 1v1 Tournament",
    "event_count": 10,
    "cash_prize": 0,
    "notes": "32 players assumed; event duration and referee billing units still provisional.",
    "assumptions": {
      "teams": 32,
      "entryFee": 40,
      "spectators": 80,
      "ticketPrice": 10,
      "sponsors": 500,
      "vendors": 1,
      "vendorFee": 100,
      "days": 1,
      "games": 31,
      "jerseysPerTeam": 0,
      "beltCount": 1,
      "venueRental": 510,
      "venueStaff": 240,
      "officialUnits": 12,
      "officialRate": 20,
      "media": 300,
      "dj": 150,
      "otherAwards": 0,
      "insurance": 125,
      "security": 100,
      "marketing": 150,
      "equipment": 75,
      "permits": 25,
      "otherStaff": 0,
      "contingencyRate": 0.1,
      "processingRate": 0.03,
      "beltCost": 299,
      "jerseyUnitCost": 9
    }
  },
  {
    "event_key": "cup",
    "name": "Commonwealth Cup 3v3",
    "event_count": 4,
    "cash_prize": 0,
    "notes": "Confirmed: 32 teams, single elimination, 31 games, two days, 5 all-in jerseys/team at $9; four Cups scheduled provisionally.",
    "assumptions": {
      "teams": 32,
      "entryFee": 450,
      "spectators": 120,
      "ticketPrice": 10,
      "sponsors": 750,
      "vendors": 2,
      "vendorFee": 100,
      "days": 2,
      "games": 31,
      "jerseysPerTeam": 5,
      "beltCount": 1,
      "venueRental": 1700,
      "venueStaff": 400,
      "officialUnits": 40,
      "officialRate": 20,
      "media": 800,
      "dj": 300,
      "otherAwards": 200,
      "insurance": 150,
      "security": 300,
      "marketing": 200,
      "equipment": 100,
      "permits": 25,
      "otherStaff": 0,
      "contingencyRate": 0.1,
      "processingRate": 0.03,
      "beltCost": 299,
      "jerseyUnitCost": 9
    }
  },
  {
    "event_key": "tryouts",
    "name": "Rich City League Tryouts",
    "event_count": 1,
    "cash_prize": 0,
    "notes": "$25/player confirmed; 60 participants and event date are estimates. No belts or jerseys.",
    "assumptions": {
      "teams": 60,
      "entryFee": 25,
      "spectators": 0,
      "ticketPrice": 0,
      "sponsors": 0,
      "vendors": 0,
      "vendorFee": 0,
      "days": 1,
      "games": 0,
      "jerseysPerTeam": 0,
      "beltCount": 0,
      "venueRental": 340,
      "venueStaff": 160,
      "officialUnits": 0,
      "officialRate": 20,
      "media": 200,
      "dj": 0,
      "otherAwards": 0,
      "insurance": 100,
      "security": 0,
      "marketing": 100,
      "equipment": 75,
      "permits": 25,
      "otherStaff": 150,
      "contingencyRate": 0.1,
      "processingRate": 0.03,
      "beltCost": 299,
      "jerseyUnitCost": 9
    }
  },
  {
    "event_key": "shootout",
    "name": "RVA Shootout 5v5",
    "event_count": 1,
    "cash_prize": null,
    "notes": "Confirmed: 12 teams, $900/team, double elimination, two days (May 15–16 provisional), 22–23 games; modeled 23. Cash prize TBD.",
    "assumptions": {
      "teams": 12,
      "entryFee": 900,
      "spectators": 250,
      "ticketPrice": 10,
      "sponsors": 1000,
      "vendors": 3,
      "vendorFee": 100,
      "days": 2,
      "games": 23,
      "jerseysPerTeam": 12,
      "beltCount": 1,
      "venueRental": 2720,
      "venueStaff": 640,
      "officialUnits": 46,
      "officialRate": 20,
      "media": 1150,
      "dj": 300,
      "otherAwards": 250,
      "insurance": 300,
      "security": 300,
      "marketing": 300,
      "equipment": 150,
      "permits": 25,
      "otherStaff": 0,
      "contingencyRate": 0.1,
      "processingRate": 0.03,
      "beltCost": 299,
      "jerseyUnitCost": 9
    }
  },
  {
    "event_key": "full_team",
    "name": "Other Full-Team Tournament",
    "event_count": 0,
    "cash_prize": 0,
    "notes": "Optional format, NOT scheduled; $700/team fee confirmed. Other operating quantities are estimates.",
    "assumptions": {
      "teams": 12,
      "entryFee": 700,
      "spectators": 200,
      "ticketPrice": 10,
      "sponsors": 0,
      "vendors": 2,
      "vendorFee": 100,
      "days": 1,
      "games": 23,
      "jerseysPerTeam": 0,
      "beltCount": 1,
      "venueRental": 1360,
      "venueStaff": 320,
      "officialUnits": 46,
      "officialRate": 20,
      "media": 1150,
      "dj": 150,
      "otherAwards": 250,
      "insurance": 200,
      "security": 200,
      "marketing": 250,
      "equipment": 125,
      "permits": 25,
      "otherStaff": 0,
      "contingencyRate": 0.1,
      "processingRate": 0.03,
      "beltCost": 299,
      "jerseyUnitCost": 9
    }
  }
];
export const NON_CONFIRMED_REVENUE_NOTE = 'Spectator admissions, sponsors and vendor fees are estimates until contracted or collected.';
export function calculateEventBudget(plan:Pick<EventBudgetPlan,'assumptions'|'event_count'|'cash_prize'>){
 const a=plan.assumptions;
 const registration=a.teams*a.entryFee;const gate=a.spectators*a.ticketPrice;const sponsorship=a.sponsors;const vendors=a.vendors*a.vendorFee;
 const revenue=registration+gate+sponsorship+vendors;
 const jerseys=a.teams*a.jerseysPerTeam*a.jerseyUnitCost;const belts=a.beltCount*a.beltCost;
 const direct=jerseys+belts+a.venueRental+a.venueStaff+a.officialUnits*a.officialRate+a.media+a.dj+a.otherAwards+a.insurance+a.security+a.marketing+a.equipment+a.permits+a.otherStaff;
 const contingency=direct*a.contingencyRate;const processing=revenue*a.processingRate;
 const expenses=direct+contingency+processing;const prePrizeProfit=revenue-expenses;
 const netProfit=plan.cash_prize===null?null:prePrizeProfit-plan.cash_prize;
 return {registration,gate,sponsorship,vendors,revenue,jerseys,belts,direct,contingency,processing,expenses,prePrizeProfit,netProfit,annualRevenue:revenue*plan.event_count,annualExpenses:expenses*plan.event_count,annualProfitBeforePrize:prePrizeProfit*plan.event_count,annualNetProfit:netProfit===null?null:netProfit*plan.event_count};
}
