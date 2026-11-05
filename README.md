# NYC Charter School Explorer

A responsive, interactive map of New York City charter school **locations**, built with **vanilla JavaScript + Leaflet**. It is designed to run as a static GitHub Pages site, with no account, database, or API key.

## Live demo

After publishing via GitHub Pages, replace this line with your GitHub Pages URL.

## Features

- Pins for NYC charter school locations from New York State's **Charter K–12 GIS layer**
- Search by school name, address, ZIP code, or school code
- Filter by the five NYC boroughs
- Click a result to zoom to the school and see its address
- Link to directions / location in Google Maps
- Live record count, responsive mobile layout, and explicit loading/error handling

## Data source & accuracy

**Source:** [NYS ITS / NYSED — Charter K–12 FeatureServer, Layer 4](https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Schools/FeatureServer/4)

The app queries the public layer at page load and filters to `COUNTY_DESC` values `Bronx`, `Kings`, `New York`, `Queens`, and `Richmond`. It does not hardcode a count or claim that its records match the total number of operating NYC charter schools. The dataset may include a school as a single location rather than every instructional campus, and its update cadence may differ from the current school year.

For campus-level cross-checking, see [NYC Charter School Center Data Hub](https://nyccharterschools.org/data-hub/) and [NYSED Charter School Directory](https://www.nysed.gov/charter-schools/charter-schools-directory). The NYC Charter School Center reported 286 schools in the 2026–27 year, but schools and physical campuses are different counting units.

**Limitations:** Dependent on the external GIS API, external basemap tiles, and Leaflet CDN. Data may be incomplete or temporarily inaccessible. The external API has not been runtime-tested in this offline authoring environment. Validate the live map against the source prior to submitting.

## Run locally

Serve the directory via a local web server so browsers load the page as a site:

```bash
python -m http.server 8000
```

Open http://localhost:8000 in your browser. The GIS query needs internet connectivity.

## Publish on GitHub Pages

1. Create a **public GitHub repository** named `nyc-charter-school-map`.
2. Upload `index.html`, `styles.css`, `app.js`, and this `README.md` to the repository root.
3. Under **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/(root)**, then **Save**.
4. After the site goes live, check that pins load and update the **Live demo** link above.
5. Send the reviewer both the repository link and (optionally) the GitHub Pages link.

## Technical design

- `app.js` calls the ArcGIS REST `/query` endpoint using GeoJSON (`f=geojson`) and geographic WGS84 coordinates (`outSR=4326`).
- The map uses Leaflet for rendering and Carto/OpenStreetMap for base tiles.
- Strings from the public dataset are HTML-escaped before insertion into the DOM.
- No private credentials, server, external analytics, or personally identifiable student data are used.

## Decisions / next improvements

Given the one-hour assignment time box, the scope prioritizes a clear working map, discoverability, and authoritative public data. A follow-up would integrate campus-level records from the NYC Charter School Center, add a dated local data snapshot for offline resilience, and introduce automated validation tests and data refreshes.
