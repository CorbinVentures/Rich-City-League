# RCH Virginia Basketball Court Directory — Data Provenance

## Scope

Goal: statewide discovery of basketball courts in parks, recreation centers, schools, gyms, sports halls and commercial venues. Coverage is **not exhaustive**. A mapped court does not imply public access, operating hours, accessibility or permission to play.

The operational data is `public.basketball_locations`. The Radar uses `public.search_basketball_locations` for paged search rather than pulling the full inventory to mobile devices.

## Sources and imports (October 8, 2026)

- RCH originally curated: 44 entries.
- Fairfax County GIS Recreational Features: 1,629 basketball court polygons; image-mapped court surfaces, not a statement of current access or indoor amenities. Source: https://services1.arcgis.com/ioennV6PpG5Xodq0/ArcGIS/rest/services/Recreational_Features/FeatureServer/0
- City of Roanoke Parks GIS: 37 basketball court assets with park names. Source: https://gis03.roanokeva.gov/arcgis/rest/services/VUEWorks/ParksRec_Map_Service_Prod/MapServer/3
- Newport News Parks Asset Inventory: 40 basketball-tagged athletic court assets. Source: https://maps.nnva.gov/arcgis/rest/services/Parks/ParksAssetInventory/FeatureServer/26
- OpenStreetMap (ODbL 1.0): bbox search yielded 5,695 basketball features; 2,720 were inside Virginia's official polygon and 2,136 nonduplicated entries were imported. Source: https://www.openstreetmap.org/copyright
- State boundary used for filtering: https://services.dwr.virginia.gov/arcgis/rest/services/VAFWIS/Virginia/FeatureServer/0
- Virginia county and independent-city boundaries for locality labelling: https://services.dwr.virginia.gov/arcgis/rest/services/WMA_Editing/WMA_VGIN_CountyBoundaries/FeatureServer/0

Imported OpenStreetMap record tags, OSM IDs, source links, and attribution are maintained in `public.basketball_osm_provenance`. The raw OSM source is OpenStreetMap, © OpenStreetMap contributors, distributed under the Open Database License 1.0 (ODbL). Any public production map or directory displaying those records must attribute OSM and link to the ODbL. Derivative data sharing requests may be made to info@richcityhoops.com.

The query used for mapped basketball-tagged features:

```overpass
[out:json][timeout:150];
nwr["sport"~"(^|;)basketball(;|$)",i](36.5,-83.7,39.5,-75.0);
out center tags;
```

From the query's 5,695 results, keep only geometries whose center falls inside the Virginia state boundary using PostGIS `ST_Covers`. Label localities using the county/city boundary layer. Drop features within 18 m of a previously imported (non-OSM) site to limit duplicates. Preserve each OSM ID and tags, with a stable slug `osm-<type>-<id>`.

## Safety and quality

- 'Mapped · unverified' means **location presence, not venue access or playability**.
- Imported access-unconfirmed facilities use `access_type='varies'` and `verification_status='community'`. They are **not eligible** for Court Passport GPS reward checks.
- `venue_type='indoor'` is used only where source tags explicitly indicate an indoor setting; a basketball tag by itself is not evidence that the court is indoor.
- School/private/paid locations may require membership or explicit authorization, even when their coordinates are public.
- Do not generate park communities for unverified mapped courts.
- Existing curated records are not overwritten by automated imports; source keys make ingestion idempotent.
- Municipal imagery can lag reality. Each provider's mapped condition and access must be checked separately.
- Mobile app uses 60-record pages and GPS-filtered searches, not a full statewide download.

## Future coverage

Prioritize verified indoor gyms, school/community centers, YMCAs, municipal recreation departments, universities, and commercial fitness facilities, using owner-submitted or official public sources. Add community suggestions with moderation and source URLs. Re-run OSM and municipal sync in carefully throttled batches; respect their API policies and license requirements.
