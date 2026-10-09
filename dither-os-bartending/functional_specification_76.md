# FS76 — Vessel garnishes render correctly (shell + mobile)

Ice, rim, and garnish assets on the live vessel render visibly and co-registered with the glass on mobile shell and desktop. Prefer non-nested SVG `use` of global defs so WebKit does not drop nested-svg symbol paints. Shell cover/pan must not hide garnishes that belong on the glass.
