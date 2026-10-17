# Runs World: Real Virginia Map (Phase A + Chesterfield pilot)
**Map lineage:** Official VDOT/VGIN Commonwealth outline; VGIN locality polygons (Chesterfield pilot); OpenStreetMap streets, park/road/water topology via OpenFreeMap Dark tiles; MapLibre GL JS 5.6.1 rendering.

## Why this replaces the custom illustrated atlas
The former Runs atlas used an authored SVG and a linear percentage transform. Zooming enlarged the illustration without actual geographic detail. This release instead uses a street-level, georeferenced vector basemap, true WGS84 venue points, government-source outline geometry, real street positions and a Chesapeake Bay/coastline depicted by the base tiles. The existing illustration continues to support Discover only until its separate migration.

## Data source and licensing
- OpenFreeMap Dark style: https://tiles.openfreemap.org/styles/dark, based on OpenStreetMap / OpenMapTiles. This pilot uses a free public service that does not promise a commercial SLA; move to a supported or self-hosted tiles provider before committing to guaranteed map uptime.
- Commonwealth outline: VDOT Administrative Boundaries ArcGIS FeatureServer 0; service description credits VGIN-derived jurisdictions. Source: https://services.arcgis.com/p5v98VHDX9Atv3l7/ArcGIS/rest/services/VDOTAdministrativeBoundaries/FeatureServer/0.
- Chesterfield jurisdiction overlay: Virginia DWR published VGIN County Boundaries ArcGIS FeatureServer 0. Source: https://services.dwr.virginia.gov/arcgis/rest/services/WMA_Editing/WMA_VGIN_CountyBoundaries/FeatureServer/0.
- MapLibre GL JS pinned 5.6.1 on jsDelivr for the initial controlled pilot. For the hardened statewide phase bundle the library with a reviewed package lock, SRI and asset governance. No map rendering requires device GPS.
- Attribution must remain visible in the MapLibre controls; the overlay credits are described in product documentation.

## Chesterfield reconciliation
The production audit identified 76 records across Chesterfield/North Chesterfield/South Chesterfield; **six** satisfy current public/outdoor/official-or-provider eligibility; **zero** of those six have coordinates on file. Cogbill Park is officially sourced but has null latitude and longitude. The patch does NOT claim a precise position, substitute Chesterfield's centroid, silently geocode the park name, or fabricate a playable Court Arena marker.
Locality labels are grouped for the first pilot; this is not yet full spatial county membership (for example Midlothian/Chester named postal cities need explicit county ID/geometry reconciliation).

## UI reconciliation contracts
- Every eligible court record appears in the searchable court list, whether or not pinnable.
- Only eligible courts with existing real coordinates receive markers; cards explicitly say **Pin needs review** for unmapped courts.
- The same loaded court set powers coverage count and event joins via canonical location_slug. Counters distinguish eligible records, exact coordinate pins, missing coordinates and linked upcoming Runs.
- Map layer selector shows all, courts, Runs, battles, crew control and 2x REP.
- The staff-only /admin/runs/map-quality queue uses is_staff_or_admin access control, reads existing records and lets staff inspect source evidence. It is read-only pending a later moderated coordinate-update function, source history and audit log.
- Changing court, region, layer or viewport does not change existing game results, REP, run registrations or territory control.

## Verification and follow-up release gates
**This is Phase A / Chesterfield pilot, not a claim of statewide 100% court completeness.**
- Add authenticated governed coordinate corrections with evidence and owner audit logs; never allow direct unreviewed public changes.
- Source precise court points from authoritative municipal GIS or aerial photo review and promote only after operator QA.
- Spatially join all venue records to VGIN independent-city / county polygons; normalizing postal aliases alone is insufficient.
- Process Midlothian and Chester records and remaining regions; deduplicate parks with multiple courts carefully.
- Measure map tile availability, load timing and data freshness on low-end phones; public OpenFreeMap offers no SLA.
- Verify VDOT/Census outline geometry against an independent official comparison; remote overlays can fail independently of the basemap.
- Use reproducible visual/geospatial snapshots for the Eastern Shore, Chesapeake Bay, Southwest Virginia and Richmond-Chesterfield-Henrico boundary edges.
- If the map provider is down, the existing text-based list and detailed court access remain usable.


## October 17 Geographic Completion Expansion
- All public basketball mapping, including /discover/radar, now defaults to georeferenced MapLibre streets. The previous simplified state illustration is removed from live map selection. Flat and tilted views use the same coordinates.
- State and county geometry is served from /api/geo/virginia?layer=state|counties, which accepts no dynamic source URL and validates official January 2026 Census TIGERweb GeoJSON boundaries, GEOIDs and polygon geometry. These official boundaries supersede the previous experimental VDOT URL; the underlying streets remain OpenStreetMap-based.
- Runs World can load community-sourced statewide leads with coordinate records as translucent, separately clustered hints. These are NOT venue verification, evidence of public access, official games, player counts, or reliable court-center GPS. They never join competitive events or count as confirmed Court Arenas.
- Full staff Map Operations at /admin/runs/map-quality provides Virginia-wide records, missing-coordinate queues, community leads, duplicate-name review leads, evidence-backed coordinate proposals, approvals, rejections and immutable audit records.
- Submitted location coordinates do not change the court listing until an authorized staff decision is entered. An authenticated direct edit to latitude/longitude outside the reviewed function is rejected. These changes do not alter the court's verification_status, gameplay REP, or rank.
- Census polygons represent county/independent-city administrative geography, while original postal-city text on legacy court records may still differ. We do not claim the full legacy inventory is county-spatially verified or that all community data is accurate.

### Remaining human verification dependency
RCH cannot guarantee every Virginia basketball facility is accurate by automatically displaying third-party data. More than 3,700 community leads require local validation and access verification. Chesterfield's six currently official/provider-verified public outdoor parks still lack approved exact court coordinates; staff should use imagery, municipal GIS and field evidence through Map Quality to approve points. Never generate guessed court-level coordinates from addresses.
