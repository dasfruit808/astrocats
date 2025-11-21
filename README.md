# astrocats

## Sprite Assets

Player spacecraft artwork lives in `assets/sprites/`. Add PNG files with the
following exact filenames so the game can pick them up automatically:

| Spacecraft ID       | File name               | Notes                         |
| ------------------- | ----------------------- | ----------------------------- |
| `astro-pioneer`     | `astro-pioneer.png`     | Default starter craft.        |
| `nova-striker`      | `nova-striker.png`      | Rare hangar unlock.           |
| `lunar-shadow`      | `lunar-shadow.png`      | Legendary hangar unlock.      |

If a PNG is missing, the game will fall back to a procedural placeholder, so
you can drop in new art at any time without breaking the build.

## Running the realtime API

To enable shared profiles and leaderboards, start the lightweight backend:

```bash
npm install
npm start
```

This launches the API on `http://localhost:3000/api` with WebSocket updates at
`ws://localhost:3000/api/realtime`. Open `index.html` in your browser after the
server is running to sync progress and scores through the backend.
