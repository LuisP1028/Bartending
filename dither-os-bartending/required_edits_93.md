# RE93

1. `JoinBarCommLink.module.css` — inputs `font-size: 16px` (min) to stop iOS zoom.  
2. `JoinBarCommLink.tsx` — focus index 0–2; moveFocus/activate; expose via ref or shell bridge.  
3. `MainMenu.tsx` — when join active, D-pad/A delegate to shell join nav instead of menu list.  
4. `page.tsx` — wire bridge for comm stage only.
