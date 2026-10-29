# RCH RUNS — Richmond Takeover first-event go/no-go playbook

**Operating status:** First event NOT yet cleared. A green Vercel build or SQL migration proves deployment, **not** that a live competition, staffed court, or attendance verification has succeeded. Assign real owners and record the evidence below before publicly promising a confirmed event.

## 1. Go/no-go gates — complete before public confirmation

| Gate | Responsible person | Evidence to retain | Required |
|---|---|---|---|
| Outdoor court, hours, public accessibility and any organized-use permission confirmed | Venue lead | Official park source, call/email, exact physical court | YES |
| Weather, heat, air quality and wet-court backup decision made | Venue lead | Rain date or cancellation announcement | YES |
| Named host and separate scorekeeper on-site | Operations lead | Assigned RCH accounts and contact plan | YES |
| Independent match official (for Court Master / Takeover titles) | Operations lead | Role assignment, independence from either crew | YES for title games |
| At least two real opposing checked-in players (1v1); six for a full 3v3 | Host | Actual RSVP roster, consent and attendance | YES |
| Host-issued court code generated at the venue, and two separate real accounts checked in | Host + two players | Screenshots of UI, no photo of reusable code | YES |
| At least one scored game submitted as **unverified** and reviewed independently by both sides | Scorekeeper + players | Game ID, opposing confirmation receipts | YES |
| Verified match and XP/REP ledgers reflect exactly the eligible outcome; no duplicate awards | Admin | Server receipts and ledger reconciliation | YES |
| Players understand rules, conduct, optional photos, consent and complaints | Operations lead | Pre-game briefing and media opt-in | YES |
| RSVP, check-in and result flow tested on actual iPhone PWA and Android/mobile browser | QA lead | Two real-account screenshots and defects | YES |
| Offline fallback, incident escalation and emergency response are ready | Host | Printed/accessible roster and score sheets | YES |

If any YES gate is missing, **do not advertise a ranked or confirmed RCH event**. You may invite players to an explicitly described casual meetup at an accessible park but must not promise staffing, rewards, verified status, court ownership, or league selection.

## 2. Host's event-day checklist

**12 to 2 hours before:** Check official park hours and access; verify rain/wet court/lighting and availability; send location with entrance landmark, time, format, no-shows deadline and public court notice. Confirm two independently accessible participant accounts. Verify roles in Run Operations HQ and that each person knows their assigned job.

**2 hours before:** At the actual venue, the host opens the Run Room and generates the **12-character court check-in code**. Give it only to people present; never publish it in the event post or broadcast it online. The code is stored hashed, can be rotated, and expires six hours after the scheduled start. Each player must have joined the hosted Run and signed in on their own account. **A self-reported code alone is not GPS proof**; the host must physically check attendees.

**Game start:** Display team assignments and rules; make sure players have successfully checked in with the host-issued code. If code, network or sign-in fails, use a paper roster and postpone all automated rewards/rankings until resolved. Never insert fake check-ins or score receipts to fill the gap.

**After each game:** Host enters the score as an **unverified scorecard**. For ranked 1v1/2v2/3v3/4v4/5v5, both distinct opponent accounts independently confirm. Do not claim Court Master or territory until authorized official evidence and all server-side checks pass. Confirm no double XP/REP claims, and label legacy check-in/highlight points **XP**, not verified-game REP.

**After event:** Reconcile RSVPs vs physically confirmed players, record no-shows, cancellations, disputes, check-in errors and device/browser failures. Obtain consent before publishing identifiable highlights. Send a follow-up and invite repeat attendance. Protect any phone numbers and do not expose a live location or reusable event code.

## 3. Exact acceptance test matrix (test event or isolated staging first)

| Scenario | Expected behavior |
|---|---|
| Guest or other player tries to issue code | Denied |
| Host tries to issue code days ahead | Denied until 12h before |
| Host issues code at court | Receives 12-character code |
| Same host reissues code | Old code invalid |
| Unknown/non-RSVP account enters code | Denied |
| An RSVP account enters wrong code | Denied |
| An RSVP account enters correct code inside time window | One check-in and one legacy XP receipt |
| Account retries same check-in | No second XP receipt |
| Suggested public court attempts code, check-in or scored match | Denied |
| Cancelled/expired Run attempts check-in or completed score | Denied |
| Scorecard created before game window | Denied |
| Host submits 1v1 score before both players checked in | Ranked submission denied |
| Player from just one side confirms | Remains pending; no rank change |
| Both independent opposing players confirm | Verified rating/REP only if all existing title protections pass |
| Host changes score during pending/verified review | Denied; official dispute workflow required |
| Attendee posts valid media | Media publish can succeed independently of reward |
| Non-attendee publishes media then claims XP | Denied |
| Court Master/crew takeover without independent official evidence | Denied |
| Low connectivity / offline | Offline roster; no fabricated digital awards or confirmations |

**Privacy and safety:** The check-in code proves access to a code handed out at the event, not continuous physical presence. Do not publish it or treat it as a secure location attestation. Do not solicit sensitive identity documents from players as a shortcut.

## 4. Escalation and rollback

Stop check-ins and game-rating attempts if the same code works for an unregistered account, any unstaffed listing awards points, both sides can be confirmed by one account, or repeated check-ins mint additional XP.

If the database migration fails, do **not** ship the UI that calls the new RPC names. If the UI build fails, do not revoke the legacy RPC grants without coordinating a compatible rollback. Any service incident during the event defaults to **manual attendance and unverified results**, never silently awarding verified competitive progress.

**Physical owner signoff required:** Event date/time, exact park/court, park permission/access, host, scorekeeper, official for title competition, incident contact, fallback location/date, a real two-account test, and the go/no-go decision.
