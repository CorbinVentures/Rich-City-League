/** Royaltee event-by-event prep and content workflow. Templates are proposals, not completed tasks. */
export type RoyalteeLane = 'ops' | 'content';
export type RoyalteeStatus = 'pending' | 'in_progress' | 'blocked' | 'complete' | 'not_applicable';
export type RoyalteeTemplate = {
  key: string; kind: RoyalteeLane; scope: 'all' | 'show';
  day_offset: number; priority: 'critical' | 'standard';
  title: string; instructions: string; owner_label: string;
};
export type RoyalteeWorkItem = {
  id: string; event_id: string; template_key: string; kind: RoyalteeLane; day_offset: number;
  priority: 'critical' | 'standard'; title: string; instructions: string; owner_label: string;
  status: RoyalteeStatus; notes: string; asset_url: string;
  rights_verified: boolean; editorial_approved: boolean; posted_at: string | null;
  updated_at: string;
};
export const ROYALTEE_WORK_TEMPLATES: RoyalteeTemplate[] = [
  {
    "key": "royaltee-v1-01",
    "kind": "ops",
    "scope": "all",
    "day_offset": -14,
    "priority": "critical",
    "title": "Purpose & game-day storyline",
    "instructions": "Confirm the event goal, the cheerleading role in RCL entertainment, the audience payoff, and responsible decision makers.",
    "owner_label": "Royaltee coach"
  },
  {
    "key": "royaltee-v1-02",
    "kind": "ops",
    "scope": "all",
    "day_offset": -10,
    "priority": "critical",
    "title": "Venue, timing & show rundown",
    "instructions": "Agree call time, setup, timeouts/halftime if applicable, access, rehearsal window and contingency with the event producer.",
    "owner_label": "Coach / show caller"
  },
  {
    "key": "royaltee-v1-03",
    "kind": "ops",
    "scope": "all",
    "day_offset": -7,
    "priority": "critical",
    "title": "Adult roster & alternates",
    "instructions": "Verify available approved 18+ performers, squad headcount, backups and availability without copying private contacts to public tools.",
    "owner_label": "Squad captain"
  },
  {
    "key": "royaltee-v1-04",
    "kind": "ops",
    "scope": "all",
    "day_offset": -7,
    "priority": "standard",
    "title": "Practice assignments",
    "instructions": "Publish internal rehearsal dates, assign choreography lead and set who signs off on readiness.",
    "owner_label": "Coach"
  },
  {
    "key": "royaltee-v1-05",
    "kind": "ops",
    "scope": "show",
    "day_offset": -5,
    "priority": "critical",
    "title": "Routine, entrances & court traffic",
    "instructions": "Time the performance, verify entrances/exits, safe spacing, boundaries and reset time.",
    "owner_label": "Choreographer"
  },
  {
    "key": "royaltee-v1-06",
    "kind": "ops",
    "scope": "all",
    "day_offset": -5,
    "priority": "standard",
    "title": "Uniforms, props & supplies",
    "instructions": "Inspect uniforms, shoes, props, travel cases, water and a spare kit; record shortages.",
    "owner_label": "Operations lead"
  },
  {
    "key": "royaltee-v1-07",
    "kind": "ops",
    "scope": "all",
    "day_offset": -3,
    "priority": "critical",
    "title": "Complete rehearsal & corrections",
    "instructions": "Perform a timed dry run and document missed moves, timing problems and exact follow-up.",
    "owner_label": "Choreographer"
  },
  {
    "key": "royaltee-v1-08",
    "kind": "ops",
    "scope": "show",
    "day_offset": -3,
    "priority": "critical",
    "title": "DJ, announcer & production sync",
    "instructions": "Confirm permitted audio, show caller cues, microphone and camera handoff with backups.",
    "owner_label": "Coach / DJ"
  },
  {
    "key": "royaltee-v1-09",
    "kind": "ops",
    "scope": "all",
    "day_offset": -2,
    "priority": "critical",
    "title": "Safety briefing & contingency",
    "instructions": "Review safe surfaces, spotting, injuries escalation, weather plan, event security and emergency lead.",
    "owner_label": "Coach / venue"
  },
  {
    "key": "royaltee-v1-10",
    "kind": "ops",
    "scope": "all",
    "day_offset": -2,
    "priority": "standard",
    "title": "Transportation & check-in plan",
    "instructions": "Confirm venue entry, transport, parking, changing space, access credentials and arrival instructions.",
    "owner_label": "Operations lead"
  },
  {
    "key": "royaltee-v1-11",
    "kind": "ops",
    "scope": "all",
    "day_offset": -1,
    "priority": "critical",
    "title": "Final call sheet",
    "instructions": "Verify every 18+ performer has the right time and role; share contact details only via approved private channels.",
    "owner_label": "Coach"
  },
  {
    "key": "royaltee-v1-12",
    "kind": "ops",
    "scope": "all",
    "day_offset": -1,
    "priority": "critical",
    "title": "Leadership final approval",
    "instructions": "Close blockers, confirm replacement plan and identify who can stop an unsafe routine.",
    "owner_label": "Coach / producer"
  },
  {
    "key": "royaltee-v1-13",
    "kind": "ops",
    "scope": "all",
    "day_offset": 0,
    "priority": "critical",
    "title": "Arrivals, warm-up & uniform check",
    "instructions": "Check performer attendance, warm-up time, equipment, holding area and show schedule.",
    "owner_label": "Squad captain"
  },
  {
    "key": "royaltee-v1-14",
    "kind": "ops",
    "scope": "show",
    "day_offset": 0,
    "priority": "critical",
    "title": "Execute and safely clear stage",
    "instructions": "Follow cue, deliver performance, clear safely, and document any show interruption.",
    "owner_label": "Show caller"
  },
  {
    "key": "royaltee-v1-15",
    "kind": "ops",
    "scope": "all",
    "day_offset": 0,
    "priority": "standard",
    "title": "Footage transfer & wrap",
    "instructions": "Ensure captured media reaches the correct editor; do not publish unapproved footage.",
    "owner_label": "Media coordinator"
  },
  {
    "key": "royaltee-v1-16",
    "kind": "ops",
    "scope": "all",
    "day_offset": 1,
    "priority": "standard",
    "title": "Debrief and next improvements",
    "instructions": "Capture the rehearsal/performance outcome, friction, audience feedback and next rehearsal priorities.",
    "owner_label": "Coach"
  },
  {
    "key": "royaltee-v1-17",
    "kind": "content",
    "scope": "all",
    "day_offset": -14,
    "priority": "critical",
    "title": "Royaltee hero story brief",
    "instructions": "Create an authentic storyline: what makes the squad compelling, the stakes, key adult voices and approved CTA.",
    "owner_label": "Creative producer"
  },
  {
    "key": "royaltee-v1-18",
    "kind": "content",
    "scope": "all",
    "day_offset": -10,
    "priority": "standard",
    "title": "Meet the squad series",
    "instructions": "Plan individual introductions from consenting 18+ performers: role, personality, talent and ambitions.",
    "owner_label": "Interviewer"
  },
  {
    "key": "royaltee-v1-19",
    "kind": "content",
    "scope": "all",
    "day_offset": -7,
    "priority": "standard",
    "title": "Cheerleader spotlight feature",
    "instructions": "Shoot a cleared adult member portrait and brief profile; do not invent conflicts or achievements.",
    "owner_label": "Photo lead"
  },
  {
    "key": "royaltee-v1-20",
    "kind": "content",
    "scope": "all",
    "day_offset": -5,
    "priority": "standard",
    "title": "Inside practice / rehearsal diary",
    "instructions": "Collect rehearsal B-roll, teaching moments and 15–30-second social edits.",
    "owner_label": "Videographer"
  },
  {
    "key": "royaltee-v1-21",
    "kind": "content",
    "scope": "show",
    "day_offset": -3,
    "priority": "critical",
    "title": "Hero hype trailer",
    "instructions": "Edit 15–30-second vertical show teaser with confirmed time, venue and Rich City League branding.",
    "owner_label": "Lead editor"
  },
  {
    "key": "royaltee-v1-22",
    "kind": "content",
    "scope": "all",
    "day_offset": -2,
    "priority": "standard",
    "title": "Countdown social package",
    "instructions": "Prepare stories, teaser graphics and a call to action with captions and cleared imagery.",
    "owner_label": "Social lead"
  },
  {
    "key": "royaltee-v1-23",
    "kind": "content",
    "scope": "all",
    "day_offset": -1,
    "priority": "critical",
    "title": "Shot list, consent & media briefing",
    "instructions": "Assign vertical/wide cameras, interview subjects, rights approvals, captions and editorial reviewer.",
    "owner_label": "Media coordinator"
  },
  {
    "key": "royaltee-v1-24",
    "kind": "content",
    "scope": "show",
    "day_offset": 0,
    "priority": "critical",
    "title": "Game-day arrival and tunnel moments",
    "instructions": "Capture approved arrivals, makeup/uniform prep, squad focus and entrance moments.",
    "owner_label": "Field producer"
  },
  {
    "key": "royaltee-v1-25",
    "kind": "content",
    "scope": "show",
    "day_offset": 0,
    "priority": "critical",
    "title": "Full routine plus hero highlights",
    "instructions": "Record stable wide master, vertical hero angles, atmosphere and permitted reactions.",
    "owner_label": "Camera team"
  },
  {
    "key": "royaltee-v1-26",
    "kind": "content",
    "scope": "all",
    "day_offset": 0,
    "priority": "standard",
    "title": "Post-event adult reactions",
    "instructions": "Interview consenting adult performers and coach; record one genuine takeaway and next-show hook.",
    "owner_label": "Interviewer"
  },
  {
    "key": "royaltee-v1-27",
    "kind": "content",
    "scope": "all",
    "day_offset": 1,
    "priority": "critical",
    "title": "Royaltee recap / highlight edit",
    "instructions": "Edit vertical recap, caption, verify claims, clear music and rights, send for approval.",
    "owner_label": "Lead editor"
  },
  {
    "key": "royaltee-v1-28",
    "kind": "content",
    "scope": "all",
    "day_offset": 2,
    "priority": "standard",
    "title": "Publish recap and measure response",
    "instructions": "Log approved published links, views/engagement and a specific idea for next episode.",
    "owner_label": "Social producer"
  }
] as RoyalteeTemplate[];
export const ROYALTEE_STATUSES: readonly {value: RoyalteeStatus; label: string}[] = [
  {value:'pending',label:'To do'}, {value:'in_progress',label:'In progress'},
  {value:'blocked',label:'Blocked'}, {value:'complete',label:'Completed'},
  {value:'not_applicable',label:'Not applicable'},
];
export const forRoyalteeEvent = (eventType: string) =>
  ROYALTEE_WORK_TEMPLATES.filter(t=>t.scope==='all' || eventType==='game_day' || eventType==='performance');
export const workIsComplete = (row: Pick<RoyalteeWorkItem,'status'>) =>
  row.status === 'complete' || row.status === 'not_applicable';
const ET = 'America/New_York';
export function nyDateKey(input: string | Date) {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:ET,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const val=(type:string)=>parts.find(p=>p.type===type)?.value??'';
  return `${val('year')}-${val('month')}-${val('day')}`;
}
function dayIndex(key: string) {
  const [y,m,d] = key.split('-').map(Number);
  return Date.UTC(y,m-1,d) / 86400000;
}
export function dueDateForEvent(iso: string, offset: number) {
  const eventKey = nyDateKey(iso);
  if (!eventKey) return '';
  return new Date((dayIndex(eventKey)+offset)*86400000).toISOString().slice(0,10);
}
export function daysUntilDue(iso: string, offset: number, now: Date = new Date()) {
  const due=dueDateForEvent(iso,offset);
  const current=nyDateKey(now);
  return due && current ? dayIndex(due)-dayIndex(current) : 0;
}
export function offsetLabel(days: number) {
  return days === 0 ? 'Event day' : days < 0 ? `D${days}` : `D+${days}`;
}
export function readiness(items: RoyalteeWorkItem[]) {
  const ops=items.filter(t=>t.kind==='ops');
  const critical=ops.filter(t=>t.priority==='critical');
  const content=items.filter(t=>t.kind==='content');
  const ready=critical.filter(workIsComplete).length;
  return {
    opsComplete:ops.filter(workIsComplete).length, opsTotal:ops.length,
    criticalComplete:ready,criticalTotal:critical.length,
    operationalReady:critical.length>0 && ready===critical.length,
    contentPlanned:content.length,
    contentCleared:content.filter(t=>t.rights_verified&&t.editorial_approved).length,
    contentPublished:content.filter(t=>t.posted_at!==null).length,
    blocked:items.filter(t=>t.status==='blocked').length,
  };
}
