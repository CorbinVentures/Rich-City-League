# Virginia official basketball facility audit — Alexandria, Hampton and Roanoke County
**Source date:** October 17, 2026

## City of Alexandria: current verified municipal basketball facility directory
City of Alexandria Recreation, Parks & Cultural Activities official court directory, updated July 15, 2026:
https://www.alexandriava.gov/parks/outdoor-ball-courts

The city explicitly lists 15 outdoor basketball locations and says use is sunrise-to-sunset unless otherwise posted, with exceptions possible for lighted courts and scheduled programming. Potomac Yard Park and Helen Miller-Bernard Hunter Park were already verified records in RCH's Weekend Circuit and are **not reinserted**. The migration adds the other 13 distinct basketball facility locations with original park names and links to this authoritative municipal directory.

The city also operates a georeferenced ArcGIS amenity-polygon layer differentiating **Basketball Court** from other court types:
https://maps.alexandriava.gov/arcgis/rest/services/alxPublicParksWm/MapServer/4
**Next court-location workflow:** A staff reviewer compares a facility polygon against the municipal listing and submitted coordinate proposals. The polygon's centroid is a candidate only after checking that it actually identifies the playable basketball court, not the entrance/whole park. No official GIS centroids or street-geocoded points were inserted by this release.

## Hampton: current official Parks & Recreation site
https://www.hampton.gov/3173/Mary-W-Jackson-Neighborhood-Center

Mary W. Jackson Neighborhood Center, 231 Lincoln Street, includes a fenced outdoor basketball court and indoor gym explicitly supporting basketball/open basketball and league activities. Venue type **mixed**. Access varies by program and center policies. Facility-level source is verified but center-of-court GPS and live gym availability are **not**.

## Roanoke County: current official facility and gym references
https://www.roanokecountyparks.com/168/Green-Ridge
https://www.roanokecountyparks.com/175/Gymnasium

Green Ridge Recreation Center, 7415 Wood Haven Road, offers a double-sized gymnasium with two regulation basketball courts; its official facility page describes admission/membership requirements. Venue type **indoor**, access **varies**. Current drop-in schedule and playable-court GPS remain under staff review.

## Duplicate-site data investigation
RCH has prior GIS and community records with identical site names that may describe *multiple separate court surfaces*. The Map Operations overview now surfaces groups with canonical slugs, source links, verification origins and nearest reported coordinates. Close coordinates (<=15 meters) are a **review prompt**, not evidence that two differently identified courts can be collapsed. Never auto-delete, reassign REP/badges or merge title history from these candidates.

## Remaining statewide tasks
This stage does **not** complete all Virginia Parks & Recreation departments or court-level audits. Staff still must verify hundreds of remaining agency inventories, inspect municipal GIS polygons, review precise basketball court centers and access restrictions, remove stale entries only with documented decisions, and address the separate operational question of organizer permits or gym reservations.

Existing public Run listings that are **scheduled community pickup meetups** are not confirmed facility bookings and do not guarantee attendance.

## Coastal city source additions: Chesapeake and Virginia Beach
**Chesapeake — 7 outdoor basketball facilities** documented on the city’s current facilities directory:
- James W. McNeil Park: https://www.cityofchesapeake.net/facilities/facility/details/James-W-McNeil-Park-47
- Claire R. Askew Western Branch Park (half courts, first-come public use): https://www.cityofchesapeake.net/Facilities/Facility/Details/Western-Branch-Park-103
- Chesapeake City Park: https://www.cityofchesapeake.net/facilities/facility/details/Chesapeake-City-Park-92
- Indian River Park **north side**, at 1709 Rokeby Avenue, rather than the separate south-side trail entrance: https://www.cityofchesapeake.net/facilities/facility/details/Indian-River-Park-98
- Crestwood Park (Park Side): https://www.cityofchesapeake.net/facilities/facility/details/Crestwood-Park-Park-Side-30
- Campostella Square Park: https://www.cityofchesapeake.net/facilities/facility/details/Campostella-Square-Park-20
- Dunedin Park – M. Anne Tregembo Park: https://www.cityofchesapeake.net/Facilities/Facility/Details/Dunedin-Park-M-Anne-Tregembo-Park-34

**Virginia Beach — 3 additional outdoor parks** (distinct from existing City View and Little Island sites):
- Level Green Park (two full-size basketball courts, upgrades completed): https://parks.virginiabeach.gov/outdoors/city-parks/level-green-park
- Bayville Farms Park (three lighted basketball courts): https://parks.virginiabeach.gov/outdoors/city-parks/bayville-farms-park
- Great Neck Park (three basketball courts): https://parks.virginiabeach.gov/outdoors/city-parks/great-neck-park

These records are each one **park site**, not one physical basketball hoop. All 10 have official sourced street addresses and **NULL** precise court center coordinates pending separate review. Public park access does not imply guaranteed Run scheduling or that all individual hoops are available.

### Combined expansion validation
Migrations `20261017235500` and `20261017235600` succeeded together in `BEGIN; ... ROLLBACK` on connected Supabase, finding **13 Alexandria + 7 Chesapeake + 1 Hampton + 1 Roanoke + 3 Virginia Beach = 25 additional source-backed sites** with **zero invented GPS points**.


## Existing Newport News Parks GIS audit: school-site and non-court exceptions
Production source inventory `City of Newport News Parks GIS` (https://maps.nnva.gov/arcgis/rest/services/Parks/ParksAssetInventory/FeatureServer/26) includes **28 basketball asset records with an `ES-` naming prefix**. Those indicate possible school facilities. Presence in the city asset database confirms a municipal inventory reference, but is not proof that the courts are Parks & Recreation-managed or open to public pickup. Until a current public-use agreement/access policy is reviewed, those 28 records remain in the underlying source inventory but are excluded from RCH verified Parks & Rec play markers. Staff can review them in Map Operations' other-status cases.

The same inventory contains **Courthouse Way Community Center Basketball Court** with notes explicitly stating **“Basketball hoop structure only, no court. Hoop is adjacent to asphalt parking lot.”** This is a basketball amenity but not a verified playable court surface. Its source record is preserved; it is also excluded from the verified-play arena layer.

This changes game-facing verified venue eligibility only. It **does not delete records, silently merge GIS surface IDs, alter source provenance, or rewrite game/REP/territory history**. Reviewers must independently check any school-public-use arrangements and physical court status before upgrading either classification.
