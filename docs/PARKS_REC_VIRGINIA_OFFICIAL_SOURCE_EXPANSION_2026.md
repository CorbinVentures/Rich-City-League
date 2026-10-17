# Statewide Parks & Recreation facility sourcing (Virginia)
**Source review date:** October 17, 2026
**Scope:** City/county Parks & Recreation basketball courts and gyms, not all basketball venues.

## October 17 source-backed expansion
- **Arlington County:** 43 basketball recreation locations from the official county Outdoor Courts / Outdoor Drop-In Courts / Indoor Courts directory. Overlapping indoor and outdoor listings become a single mixed-use facility entry. School-only sites were not imported as unrestricted public parks. Source: https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts
- **Prince William County:** 19 park/rec sites from the official county Sports Amenities list, which separately counts individual outdoor court surfaces. A park site is one RCH facility; it is not proof that the park has just one hoop. Source: https://pwcaws.pwcva.gov/department/sports-amenities
- **Henrico County:** Hunton Community Center & Park, explicitly displaying basketball among its official amenities. Source: https://henrico.gov/rec/places/hunton-2/
- **Shenandoah County:** County Park (Maurertown), with one basketball court documented on the official county page. Source: https://www.shenandoahcountyva.gov/Facilities/Facility/Details/County-Park-2

Total: 64 additional **source-documented facility rows** across these municipal/county sources, subject to the idempotent source uniqueness logic in migrations.

## What official-source verification means
The local government department explicitly lists a basketball facility. It does NOT guarantee:
1. A basketball court currently exists in perfect playing condition or has a measured court-center GPS location.
2. Gym use is free, accessible to all ages, staffed, open for pickup, or reserved for RCH.
3. A Run is occurring now, attendance is present, or play is eligible for double REP.
4. Every city/county Parks & Recreation facility in Virginia has been found.

For sources that list facility names without street addresses, **Street address pending facility verification** is shown and latitude/longitude remain NULL. Never geocode the site name or place it at a county/city centroid as an arena pin.

## Statewide review operations
Staff can inspect **all 2026 Census county/independent-city names** in Map Quality; source matches are simple postal-name heuristics, not geometric jurisdiction verification. Listed location counts by county are an aid for prioritization, not evidence of exhaustive geographic coverage. Where no official source is documented, the UI explicitly says **Source needed**.

- Further expansion: review all remaining local government Parks & Recreation agency official facility inventories, amenity filters and park GIS services.
- Coordinate review: exact court points must be supported by municipal aerial imagery, trusted GIS or documented staff review through the existing audited coordinate approval process.
- Real-world availability: park operation and indoor open-gym/reservation details must be read from the facilities' current schedules, not guessed.
- Deduplicate official facility listing overlaps through canonical venue review, preserving historical game references.
- Repeat official-source audits because programs and park facilities close, change access rules, and change court layouts.

No secret service keys, full-user GPS traces or player-count predictions are used by this rollout.


## Repeatable official-facility intake without code changes
A staff-only workbench at /admin/runs/facility-sources lets authorized members submit a new official Parks & Recreation basketball site for evidence review. It supports the published facility name, city/locality, optional verified street address, indoor/outdoor/mixed classification, access requirements, official city/county source URL, responsible Parks & Rec agency and specific basketball amenity evidence.

Submissions go into public.rch_official_facility_reviews with RLS and staff-only review RPCs. An approved site receives a new immutable canonical venue ID and documented source, but NULL map coordinates. It is not marked as reservable or gameplay verified. Rejected records and review notes remain in the audit queue. Automatic venue discovery, source URL content scraping, geocoding, and blanket state-wide verification are intentionally not permitted.

**Outstanding human tasks:** Consult each remaining Virginia local government Parks & Recreation directory, verify the basketball amenity (not just park existence), resolve conflicting/duplicate names, inspect facility accessibility and court coordinates, and review seasonal gym schedules. The official Census jurisdiction list in Map Operations makes remaining gaps visible; it does not certify geographic completeness.
