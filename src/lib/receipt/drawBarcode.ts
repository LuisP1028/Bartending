/** Prototype seed-driven pixel barcode (no smoothing). */
export function drawBarcode(
  canvas: HTMLCanvasElement,
  seed: string,
  inkColor: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || !seed) return;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = inkColor;

  let x = 10;
  const limit = seed.length * 2;
  for (let i = 0; i < limit; i++) {
    const charCode = seed.charCodeAt(i % seed.length);
    const barW = (charCode >> (i % 3)) & 1 ? 4 : 2;
    const spaceW = (charCode >> ((i + 1) % 3)) & 1 ? 4 : 2;
    if (x + barW < canvas.width - 10) {
      ctx.fillRect(x, 0, barW, canvas.height);
    }
    x += barW + spaceW;
    if (x >= canvas.width - 10) break;
  }
}
