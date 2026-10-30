/** Gate the live on-court queue. An RSVP never proves physical presence.
 * Final authorization is enforced again by rch_join_run_queue in Postgres. */
export type NextUpEligibility='sign_in'|'not_hosted'|'check_in'|'eligible';
export function nextUpEligibility(input:{
 signedIn:boolean;hostedGameDay:boolean;checkedIn:boolean;
}):NextUpEligibility{
 if(!input.signedIn)return 'sign_in';
 if(!input.hostedGameDay)return 'not_hosted';
 if(!input.checkedIn)return 'check_in';
 return 'eligible';
}
