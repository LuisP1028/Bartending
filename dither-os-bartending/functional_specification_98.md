# FS98 — Runtime-only join character storage (testing)

## Purpose

For testing: every successful Join saves character art + roster entry on the **running app host** without updating git. GCS later. Ephemeral Space wipe on rebuild is accepted for now.

## Desired `{functionality}`

1. No git push required for joiners.  
2. On successful `--run` install: four PNGs on host disk + runtime roster row.  
3. Art is **servable** to the browser (if static `/assets` fails, app must still serve files).  
4. Roster lists only joiners with real pack on disk.  
5. In play, ready joiners can spawn; stock cast unchanged.  
6. Failed generate → failed job, no ghost name without art.

## Acceptance

| ID | Result |
|----|--------|
| R1 | Successful Join → sit/walk reachable over HTTP |
| R2 | Roster includes joiner only with pack |
| R3 | Git tree unchanged by Join |
| R4 | Stock Elder/Caesar/Trump still work |
