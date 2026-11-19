# Millennium Site 3D

A one-page jobsite viewer for Millennium Reinforcing's Bid Pipeline Map. It opens Google Photorealistic 3D Tiles (Map Tiles API) at a job site and draws the crane reach, the 20 ft power-line clearance and the mapped poles and lines.

- The page holds no job data. The Bid Pipeline Map passes the site's name, location, reach and nearby power features in the link's `#` part, which browsers never send to the server.
- Hosted on **Azure Static Web Apps** (Standard plan). Every page except `open.html` requires a sign-in with a Millennium Microsoft 365 account (single-tenant Entra app, see `staticwebapp.config.json`).
- The Bid Pipeline Map links to `open.html#...`, which keeps the site details through the sign-in and then opens `index.html`.
- `config.js` is written at deploy time from the `GOOGLE_MAPS_KEY` GitHub secret, so the key never sits in the repo. Restrict the key in Google Cloud to the **Map Tiles API** and to the site's address (`https://<site>.azurestaticapps.net/*`).
- Deploys run from `.github/workflows/deploy.yml` with the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret.
- Google's logo and data credits must stay on screen (Cesium shows them in the bottom-right corner). Google's terms don't allow saving or re-hosting the 3D tiles.
- Built on [CesiumJS](https://cesium.com/platform/cesiumjs/) 1.121.
