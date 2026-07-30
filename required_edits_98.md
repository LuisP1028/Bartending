# RE98 — Runtime-only join assets (serve from disk)

1. API route GET `/api/patrons/assets/[characterId]/[file]` streams PNG from `public/assets/patrons/{id}/` on disk (allowlist sit/talk/walk_01/walk_02).  
2. Roster extras use those API URLs for sit/walk.  
3. Client runtime cache builds CharacterDef with assetsOverride from roster URLs.  
4. Spawn env: map XAIKEY→XAI_API_KEY for child.  
5. Hard prune ghosts; pack ready = real PNG on disk.  
6. Do not commit joiners to git.
