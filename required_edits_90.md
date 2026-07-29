# RE90 — Join overlays fill Game Boy glass

## Edits

1. **page.tsx / MainMenu.tsx** — Pass join UI as overlay **inside** playfield (not sibling fixed full-screen).  
2. **JoinBarCommLink.module.css** — overlay absolute inset 0; terminal 100% size.  
3. **JoinBarCamera.module.css** — same; camera box flex-fills glass.  
4. Optional compact padding for small glass.
