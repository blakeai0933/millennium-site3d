# Millennium Site Viewer

A jobsite viewer for Millennium Reinforcing's Bid Pipeline Map, with five tabs:

- **3D city**: Google Photorealistic 3D Tiles (Map Tiles API) with the crane reach, the 20 ft power-line clearance, mapped poles and lines, and a measuring tool. Google is only loaded (and billed) when this tab is opened.
- **Satellite**: Azure Maps live satellite imagery with the same reach rings and power features.
- **Truck route**: Azure Maps truck routing from the San Clemente office or any address, using the truck's weight, length, height, width and hazmat class, with live-traffic drive time and turn-by-turn directions.
- **Traffic**: Azure Maps live traffic flow and incidents around the site.
- **Weather**: Azure Maps current conditions, 24-hour forecast with gusts, and severe-weather alerts.

- The page holds no job data. The Bid Pipeline Map passes the site's name, location, reach and nearby power features in the link's `#` part, which browsers never send to the server.
- Hosted on **Azure Static Web Apps** (Free plan) at https://proud-bush-0583bbc1e.5.azurestaticapps.net. Every page except `open.html` and `denied.html` requires a Microsoft sign-in **and** the `millennium` role, which is granted only by invitation (Static Web App → Role management → Invite, up to 25 people). See `staticwebapp.config.json`.
- The Bid Pipeline Map links to `open.html#...`, which keeps the site details through the sign-in and then opens `index.html`.
- `config.js` is written at deploy time from the `GOOGLE_MAPS_KEY` and `AZURE_MAPS_KEY` GitHub secrets, so the key never sits in the repo. Restrict the key in Google Cloud to the **Map Tiles API** and to the site's address (`https://proud-bush-0583bbc1e.5.azurestaticapps.net/*`).
- Deploys run from `.github/workflows/deploy.yml` with the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret.
- Google's logo and data credits must stay on screen (Cesium shows them in the bottom-right corner). Google's terms don't allow saving or re-hosting the 3D tiles.
- Built on [CesiumJS](https://cesium.com/platform/cesiumjs/) 1.121 and the Azure Maps Web SDK v3. The Azure Maps key is only served to signed-in users; also set the Maps account's CORS allowed origins to the site address.
