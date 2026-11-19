# Millennium Site 3D

A one-page jobsite viewer for Millennium Reinforcing's Bid Pipeline Map. It opens Google Photorealistic 3D Tiles (Map Tiles API) at a job site and draws the crane reach, the 20 ft power-line clearance and the mapped poles and lines.

- The page holds no job data. The Bid Pipeline Map passes the site's name, location, reach and nearby power features in the link's `#` part, which browsers never send to the server.
- `config.js` holds the Google browser key. Restrict that key in Google Cloud to the **Map Tiles API** and to this site's address (`https://blakeai0933.github.io/*`).
- Google's logo and data credits must stay on screen (Cesium shows them in the bottom-right corner). Google's terms don't allow saving or re-hosting the 3D tiles.
- Built on [CesiumJS](https://cesium.com/platform/cesiumjs/) 1.121.
