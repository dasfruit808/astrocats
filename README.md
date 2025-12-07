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

## Deployment/Operations

- `DATA_DIR`: Directory where profile and leaderboard data is written. By
  default this is `./data`, but you should mount a persistent volume here in
  production (e.g., Docker bind mount or Kubernetes `PersistentVolumeClaim`) so
  `leaderboard.json` and `profiles.json` survive restarts.
- `LEADERBOARD_MAX_ENTRIES`: Limits the number of leaderboard rows stored and
  returned. Tune this down for memory-constrained deployments.
- File outputs:
  - `leaderboard.json`: Stored under `DATA_DIR`, contains the current sorted
    leaderboard state.
  - `profiles.json`: Stored under `DATA_DIR`, contains saved player profiles
    and progress.
- Ports: The server defaults to port `3000`. Set `PORT` if you need to run on a
  different port or behind a reverse proxy; expose or forward this port in your
  hosting environment.
