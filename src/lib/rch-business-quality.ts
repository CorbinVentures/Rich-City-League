/** Evidence-based RCH business psychology quality standard.
 * No score is assumed from deployed code, sample data, or automation volume.
 * Each of the five checks is worth two points and MUST be independently reviewed.
 */
export type RchQualityDimension = {
  id: string; title: string; href: string; kind: 'product' | 'market';
  checks: readonly [string,string,string,string,string];
};
export const RCH_QUALITY_DIMENSIONS = [
  {
    "id": "brand",
    "title": "Brand identity",
    "href": "/",
    "kind": "product",
    "checks": [
      "RCH is the statewide parent brand across public routes",
      "Rich City League is labeled as a flagship competition",
      "Public identity and CTA copy match across mobile and desktop",
      "No stale competition or opening-night claim appears",
      "Independent Virginia organizations remain welcome"
    ]
  },
  {
    "id": "home",
    "title": "Public homepage",
    "href": "/",
    "kind": "product",
    "checks": [
      "Upcoming hosted activity is distinguished from suggestions",
      "First screen communicates a clear basketball benefit",
      "Primary action works for guest and member sessions",
      "Local discovery preserves accurate city and event facts",
      "Mobile layout and accessible navigation pass testing"
    ]
  },
  {
    "id": "conversion",
    "title": "Visitor conversion",
    "href": "/admin/growth",
    "kind": "product",
    "checks": [
      "Acquisition event collection is tested and privacy-respecting",
      "Homepage to signup to created-account stages reconcile",
      "Failures and incomplete funnels display honestly",
      "Primary CTA flows work on supported devices",
      "A/B or usability evidence supports the selected CTA"
    ]
  },
  {
    "id": "onboarding",
    "title": "Member onboarding",
    "href": "/welcome",
    "kind": "product",
    "checks": [
      "New users keep their intended destination",
      "Player coach and fan journeys have relevant actions",
      "Account and age-policy checks remain enforced",
      "First completed meaningful action is distinguishable from a click",
      "Unassisted first-task testing demonstrates usability"
    ]
  },
  {
    "id": "community",
    "title": "Authentic community",
    "href": "/pulse",
    "kind": "market",
    "checks": [
      "Human-authored posts are distinguished from automated content",
      "System accounts never inflate human engagement reporting",
      "Real independent members create recurring conversations",
      "Blocking privacy and moderation operate correctly",
      "New members can find authentic local people or truthful empty states"
    ]
  },
  {
    "id": "runs",
    "title": "Runs and courts",
    "href": "/runs",
    "kind": "market",
    "checks": [
      "Unhosted suggestions cannot impersonate hosted games",
      "Registration and onsite check-in are separately verified",
      "At least one real multi-account match runs end to end",
      "Competitive results and rewards require independent verification",
      "Live venue weather consent and safety checks pass"
    ]
  },
  {
    "id": "myplayer",
    "title": "MyPLAYER and REP",
    "href": "/profile",
    "kind": "product",
    "checks": [
      "XP REP and competitive rating have clear distinct meanings",
      "Verified match receipts produce correct progression",
      "Unverified activity cannot award competitive status",
      "Responsive and accessible first-time goals are understandable",
      "Paid features cannot change competitive credibility"
    ]
  },
  {
    "id": "league",
    "title": "Rich City League",
    "href": "/league",
    "kind": "product",
    "checks": [
      "November 2027 remains planned until an official date is approved",
      "Legacy seasons never appear as new pro competition",
      "Tryout selection and draft status cannot be implied as open",
      "Team and staff claims have a verified source",
      "Public league history and official rules are distinguishable"
    ]
  },
  {
    "id": "fantasy",
    "title": "Draft and Fantasy",
    "href": "/fantasy",
    "kind": "product",
    "checks": [
      "Preseason content cannot look like live season scoring",
      "Official draft selections require authorized actions",
      "Schedule and player identifiers are consistently sourced",
      "Eligible user flows pass usability and rules tests",
      "Game data and scoring integrity pass independent validation"
    ]
  },
  {
    "id": "tv",
    "title": "RCH TV",
    "href": "/media",
    "kind": "product",
    "checks": [
      "Video upload reaches a confirmed published state",
      "Every published video gets a functioning preview or fallback",
      "Playable media works across tested mobile devices",
      "Creators rights and attribution are respected",
      "Media links to genuine basketball people and events"
    ]
  },
  {
    "id": "news",
    "title": "News and Discover",
    "href": "/news",
    "kind": "product",
    "checks": [
      "Published stories include accurate attribution and dates",
      "Automated editorial material is clearly disclosed",
      "City topics and basketball categories are navigable",
      "Corrections and stale event status can be updated",
      "Unverified claims are not promoted as established facts"
    ]
  },
  {
    "id": "sites",
    "title": "Website Creator",
    "href": "/website-creator",
    "kind": "market",
    "checks": [
      "Free builder draft preview and save work without charging",
      "Publishing requires organization ownership verification",
      "Tenant boundaries and public site permissions are tested",
      "Independent organizations successfully publish real sites",
      "Paid and planned features are disclosed accurately"
    ]
  },
  {
    "id": "sponsors",
    "title": "Sponsorship",
    "href": "/sponsors",
    "kind": "market",
    "checks": [
      "Paid placements visibly disclose sponsorship",
      "Campaign caps and impression accounting are verified",
      "Sponsors cannot influence rankings results or editorial conclusions",
      "Real impressions clicks and outcomes are reported accurately",
      "Independent sponsor delivery and renewal evidence exists"
    ]
  },
  {
    "id": "trust",
    "title": "Trust and authority",
    "href": "/",
    "kind": "product",
    "checks": [
      "Competition and event states reflect authoritative records",
      "Security RLS and media consent protections pass",
      "Critical paths meet WCAG AA and mobile acceptance checks",
      "Public metrics never imply unverified participation",
      "Corrections privacy and accountability channels are accessible"
    ]
  },
  {
    "id": "retention",
    "title": "Meaningful retention",
    "href": "/today",
    "kind": "market",
    "checks": [
      "Member actions are tracked beyond a mere click",
      "Repeat participation is measured in real cohorts",
      "Personalized recommendations reflect explicit interests",
      "Notifications respect consent and offer actionable value",
      "Return behavior is demonstrated by independent members"
    ]
  },
  {
    "id": "statewide",
    "title": "Virginia market coverage",
    "href": "/discover",
    "kind": "market",
    "checks": [
      "City results use valid Virginia locations and real sources",
      "Independent Virginia organizers can publish without league preference",
      "Multiple cities have recurring real local activity",
      "Coverage and local opportunity success are measured per city",
      "Expansion decisions use verified local demand and supply"
    ]
  }
] as const satisfies readonly RchQualityDimension[];

export type RchQualityCheckEvidence = {
  passed: boolean;
  source: string; // URL or checked-in QA report reference, not a self-reported score
  reviewer: string;
  reviewedAt: string; // ISO date
};
export type RchQualityEvidence = {
  checks: readonly (RchQualityCheckEvidence | null)[];
  realWorldOutcomeVerified?: boolean;
};
function validCheck(check: RchQualityCheckEvidence | null | undefined): check is RchQualityCheckEvidence {
  return Boolean(check && typeof check.passed === 'boolean'
    && check.source.trim() && check.reviewer.trim()
    && Number.isFinite(Date.parse(check.reviewedAt)));
}
export function assessRchQualityDimension(
  dimension: RchQualityDimension,
  evidence?: RchQualityEvidence | null,
) {
  const checks=evidence?.checks ?? [];
  const complete=dimension.checks.every((_,index)=>validCheck(checks[index]));
  if (!complete) {
    return { id:dimension.id, title:dimension.title, kind:dimension.kind,
      score:null as number|null, status:'unverified' as const,
      blockers:['Five independently reviewed check results are required'] };
  }
  const score=checks.slice(0,5).filter(check=>check?.passed).length*2;
  const criticalPassed=Boolean(checks[0]?.passed && checks[1]?.passed);
  const marketPassed=dimension.kind!=='market' || evidence?.realWorldOutcomeVerified===true;
  const blockers=[
    ...(score<8 ? ['Below the 8/10 minimum'] : []),
    ...(!criticalPassed ? ['Both critical checks must pass'] : []),
    ...(!marketPassed ? ['Independent real-world outcome evidence required'] : []),
  ];
  return {id:dimension.id,title:dimension.title,kind:dimension.kind,
    score,status:blockers.length===0?'passed' as const:'blocked' as const,blockers};
}
export function assessRchQualityRelease(
  evidence: Partial<Record<(typeof RCH_QUALITY_DIMENSIONS)[number]['id'],RchQualityEvidence>>,
) {
  const dimensions=RCH_QUALITY_DIMENSIONS.map(d=>assessRchQualityDimension(d,evidence[d.id]));
  return {ready:dimensions.every(d=>d.status==='passed'),dimensions};
}
