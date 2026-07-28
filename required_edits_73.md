# RE73

## `src/app/gameboy-shell.css` (shell media)

Replace FS70 stretch (aspect-ratio auto + object-fit fill) with:

1. Playfield / section: overflow hidden, center flex, size container.
2. `.pov-stage`: aspect-ratio 1184/880; width/height cover math using cqi/cqb of section.
3. Stage img: width/height 100% (stage already correct aspect).
4. Keep hotspot SVG full box; preserveAspectRatio none still OK or default meet (both fine when stage aspect matches viewBox).

## `page.tsx`

Keep preserveAspectRatio="none" or use default meet — both align when stage is 1184∶880 cover.
