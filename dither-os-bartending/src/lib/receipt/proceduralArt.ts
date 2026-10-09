/** Stair-step jagged tear tile (8×8) filled with paper color — CSS background-image. */
export function getJaggedEdge(colorHex: string): string {
  const hex = colorHex.replace('#', '%23');
  return `url('data:image/svg+xml;utf8,<svg width="8" height="8" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="0" y="0" width="8" height="2" fill="${hex}"/><rect x="1" y="2" width="6" height="2" fill="${hex}"/><rect x="2" y="4" width="4" height="2" fill="${hex}"/><rect x="3" y="6" width="2" height="2" fill="${hex}"/></svg>')`;
}

/** 8-bit crumpled wad sprite (16×16 grid) using paper + ink colors. */
export function getCrumpledSprite(paperHex: string, inkHex: string): string {
  const p = paperHex.replace('#', '%23');
  const i = inkHex.replace('#', '%23');
  return `url('data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M3,4 h3 v-2 h4 v2 h3 v3 h2 v5 h-2 v3 h-5 v-2 h-4 v2 h-3 v-4 h-2 v-5 h2 z" fill="${p}"/><path d="M3,4 h3 v-2 h4 v2 h3 v3 h2 v5 h-2 v3 h-5 v-2 h-4 v2 h-3 v-4 h-2 v-5 h2 z" fill="none" stroke="${i}" stroke-width="1"/><path d="M6,2 v5 h5 m2,0 v4 h-6 m-4,-1 v-4 h3" fill="none" stroke="${i}" stroke-width="1"/></svg>')`;
}
