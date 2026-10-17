# Rich City Hoops: Parks & Recreation verified basketball facilities
**Policy approved October 17, 2026**

## Verified Parks & Rec facility definition
A venue receives the RCH Parks & Rec verified designation when its basketball facility is listed by an **official municipal/county Parks & Recreation department** or published Parks & Rec GIS/directory source, and the venue belongs to the official indoor, outdoor or mixed category.

Eligible:
- Outdoor public Parks & Rec basketball courts, including courts inside parks, playgrounds and community centers.
- Indoor Parks & Rec gymnasiums with basketball facilities.
- Recreation centers with both outdoor basketball courts and indoor gyms.

Not automatically verified:
- Community/OpenStreetMap basketball pins without municipal corroboration.
- Private fitness centers, YMCAs, schools, or third-party venues based solely on their own website.
- Any park or recreation center without evidence of a basketball court or usable basketball gym.

### Crucial distinction: verified **facility** ≠ open gym ≠ booked game
The verified designation confirms a basketball facility exists in an authoritative city/county Parks & Rec listing. It does **not** indicate real-time opening, open-play permission, court availability, free admission, reservations, verified attendance, or eligibility for REP.

- **Outdoor courts:** Show park access/hours and any posted restrictions.
- **Indoor gyms / mixed centers:** Show posted hours, schedules, passes, and reservation limitations when documented; without authoritative schedules show "Check gym access / schedule."
- **Game/REP eligibility:** Depends only on actual recorded Run and independently verified match evidence; never solely on a mapped facility's badge.
- **Map precision:** Existing official records lacking verified center coordinates remain searchable and flagged for pin review, not pinned to a fake location.
- **YMCA/private operators:** Remain searchable in other venue contexts with their real membership restrictions, but do not display the government Parks & Rec badge.

## Implementation
The Runs World park and gym registry follows `verifiedParksRecFacility`, which distinguishes official municipal source labels (City of Richmond PRCF, Chesterfield County Parks & Recreation, Henrico Recreation & Parks, official municipal parks directories, City of Newport News Parks GIS). The public map and the staff Map Operations queue use this same rule. Indoor gyms display a distinct arena pin when actual coordinates are present.

The Henrico county selector groups Henrico/Glen Allen/Sandston name labels so official basketball gyms like Eastern Henrico and Deep Run do not disappear due to the previous city-only UI. Geographic assignment from administrative polygons is still preferred for future statewide completeness.

## Authoritative sample evidence
- Richmond Parks & Recreation basketball facilities directory: https://www.rva.gov/parks-recreation/about-department
- Henrico Recreation & Parks basketball amenity list: https://henrico.gov/rec/parks/park-amenities/
- Eastern Henrico Recreation Center: https://henrico.gov/rec/places/ehrc/
- Chesterfield Beulah Recreation Center gym: https://www.chesterfield.gov/facilities/facility/details/Beulah-Recreation-Center-408

## Coverage warning
This policy is the verified-classification rule for RCH's current records. It does **not** imply that every Virginia locality Parks & Rec court or gym has already been imported, reviewed, or mapped. The staff Map Quality workflow remains responsible for sourcing missing facilities, confirming basketball amenities, recording court coordinates, validating access rules, and resolving duplications before expanding the verified inventory.
