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
