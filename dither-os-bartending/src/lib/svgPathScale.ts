/**
 * Scale an SVG path `d` by (sx, sy) about the origin.
 * Absolute coords and relative deltas are scaled (needed for CSS clip-path
 * mapping viewBox → element pixel size).
 */
export function scalePathD(d: string, sx: number, sy: number): string {
  if (sx === 1 && sy === 1) return d;
  const tokens = d.match(/[a-zA-Z]|[+-]?(?:\d*\.)?\d+(?:[eE][+-]?\d+)?/g);
  if (!tokens) return d;

  let i = 0;
  let cmd = '';
  let out = '';

  const num = () => {
    const t = tokens[i++];
    return t != null ? parseFloat(t) : 0;
  };

  const fmt = (n: number) => {
    const r = Math.round(n * 1000) / 1000;
    return String(r);
  };

  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      i++;
      out += cmd;
    }

    switch (cmd) {
      case 'M':
      case 'L':
      case 'T':
      case 'm':
      case 'l':
      case 't': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const x = num() * sx;
          const y = num() * sy;
          out += `${fmt(x)} ${fmt(y)} `;
        }
        break;
      }
      case 'H':
      case 'h': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          out += `${fmt(num() * sx)} `;
        }
        break;
      }
      case 'V':
      case 'v': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          out += `${fmt(num() * sy)} `;
        }
        break;
      }
      case 'C':
      case 'c': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const vals = [
            num() * sx,
            num() * sy,
            num() * sx,
            num() * sy,
            num() * sx,
            num() * sy,
          ];
          out += vals.map(fmt).join(' ') + ' ';
        }
        break;
      }
      case 'S':
      case 's':
      case 'Q':
      case 'q': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const vals = [num() * sx, num() * sy, num() * sx, num() * sy];
          out += vals.map(fmt).join(' ') + ' ';
        }
        break;
      }
      case 'A':
      case 'a': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const rx = num() * sx;
          const ry = num() * sy;
          const rot = num();
          const laf = num();
          const sf = num();
          const x = num() * sx;
          const y = num() * sy;
          out += `${fmt(rx)} ${fmt(ry)} ${fmt(rot)} ${laf} ${sf} ${fmt(x)} ${fmt(y)} `;
        }
        break;
      }
      case 'Z':
      case 'z':
        break;
      default:
        break;
    }
  }

  return out.trim();
}

/**
 * Even-odd clip path for "full element box minus bar region".
 * `barCutoffD` is in viewBox units (VW×VH); result is in element pixel units.
 */
export function roomMinusBarClipPathCss(
  barCutoffD: string,
  elWidthPx: number,
  elHeightPx: number,
  viewW = 1184,
  viewH = 880
): string | undefined {
  if (!barCutoffD || elWidthPx <= 0 || elHeightPx <= 0) return undefined;
  const sx = elWidthPx / viewW;
  const sy = elHeightPx / viewH;
  const bar = scalePathD(barCutoffD, sx, sy);
  const rect = `M0 0H${elWidthPx}V${elHeightPx}H0Z`;
  return `path(evenodd, "${rect} ${bar}")`;
}
