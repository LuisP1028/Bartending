/**
 * Translate an SVG path `d` by (dx, dy).
 * Handles common absolute and relative commands used in POV hotspots.
 */
export function translatePathD(d: string, dx: number, dy: number): string {
  if (!dx && !dy) return d;

  const tokens = d.match(/[a-zA-Z]|[+-]?(?:\d*\.)?\d+(?:[eE][+-]?\d+)?/g);
  if (!tokens) return d;

  let i = 0;
  let cmd = '';
  let out = '';
  // Track current point for relative conversions if needed
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;

  const num = () => {
    const t = tokens[i++];
    return t != null ? parseFloat(t) : 0;
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
      case 'T': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const x = num() + dx;
          const y = num() + dy;
          cx = x;
          cy = y;
          if (cmd === 'M') {
            startX = x;
            startY = y;
          }
          out += `${x} ${y} `;
          // implicit L after first M pair
          if (cmd === 'M') cmd = 'L';
        }
        break;
      }
      case 'm':
      case 'l':
      case 't': {
        // relative deltas unchanged for translation of whole path... actually
        // translating a path: relative segments stay same; only first M absolute moves.
        // For pure translate of entire shape, relative coords need no change after first absolute M.
        let first = true;
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          let x = num();
          let y = num();
          if (cmd === 'm' && first) {
            x += dx;
            y += dy;
            first = false;
            cmd = 'l';
          }
          cx += x;
          cy += y;
          out += `${x} ${y} `;
        }
        break;
      }
      case 'H': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const x = num() + dx;
          cx = x;
          out += `${x} `;
        }
        break;
      }
      case 'h': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const x = num(); // relative — unchanged
          cx += x;
          out += `${x} `;
        }
        break;
      }
      case 'V': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const y = num() + dy;
          cy = y;
          out += `${y} `;
        }
        break;
      }
      case 'v': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const y = num();
          cy += y;
          out += `${y} `;
        }
        break;
      }
      case 'C': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const x1 = num() + dx;
          const y1 = num() + dy;
          const x2 = num() + dx;
          const y2 = num() + dy;
          const x = num() + dx;
          const y = num() + dy;
          cx = x;
          cy = y;
          out += `${x1} ${y1} ${x2} ${y2} ${x} ${y} `;
        }
        break;
      }
      case 'c': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const x1 = num();
          const y1 = num();
          const x2 = num();
          const y2 = num();
          const x = num();
          const y = num();
          cx += x;
          cy += y;
          out += `${x1} ${y1} ${x2} ${y2} ${x} ${y} `;
        }
        break;
      }
      case 'S':
      case 'Q': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const x1 = num() + dx;
          const y1 = num() + dy;
          const x = num() + dx;
          const y = num() + dy;
          cx = x;
          cy = y;
          out += `${x1} ${y1} ${x} ${y} `;
        }
        break;
      }
      case 's':
      case 'q': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const x1 = num();
          const y1 = num();
          const x = num();
          const y = num();
          cx += x;
          cy += y;
          out += `${x1} ${y1} ${x} ${y} `;
        }
        break;
      }
      case 'A': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const rx = num();
          const ry = num();
          const rot = num();
          const large = num();
          const sweep = num();
          const x = num() + dx;
          const y = num() + dy;
          cx = x;
          cy = y;
          out += `${rx} ${ry} ${rot} ${large} ${sweep} ${x} ${y} `;
        }
        break;
      }
      case 'a': {
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          const rx = num();
          const ry = num();
          const rot = num();
          const large = num();
          const sweep = num();
          const x = num();
          const y = num();
          cx += x;
          cy += y;
          out += `${rx} ${ry} ${rot} ${large} ${sweep} ${x} ${y} `;
        }
        break;
      }
      case 'Z':
      case 'z': {
        cx = startX;
        cy = startY;
        break;
      }
      default: {
        // Unknown — flush remaining numbers unchanged
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
          out += `${tokens[i++]} `;
        }
      }
    }
  }

  return out.trim();
}
