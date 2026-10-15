import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import { defaultQrStyle, parseQrStyle } from './qr.schema.js';
export async function renderLinkQr(url, style = defaultQrStyle, format = 'svg') {
  style = parseQrStyle(style);
  if (style.shape !== 'square') return renderShapedQr(url, style, format);
  const options = {
    errorCorrectionLevel: 'M',
    margin: 4,
    width: style.size,
    color: { dark: style.dark, light: style.light },
  };
  return format === 'png'
    ? QRCode.toBuffer(url, { ...options, type: 'png' })
    : QRCode.toString(url, { ...options, type: 'svg' });
}

// Keep every reserved module square: finder eyes, separators, timing, alignment,
// format and version information. Only ordinary data modules change shape.
export function qrShapeCells(url) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' });
  return modules;
}
function renderShapedQr(url, style, format) {
  const modules = qrShapeCells(url);
  const extent = modules.size + 8;
  if (format === 'svg') {
    const squares = [];
    const shaped = [];
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (!modules.get(row, col)) continue;
        const x = col + 4,
          y = row + 4;
        if (modules.isReserved(row, col)) squares.push(`M${x} ${y}h1v1h-1z`);
        else if (style.shape === 'dots')
          shaped.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.48"/>`);
        else shaped.push(`<rect x="${x}" y="${y}" width="1" height="1" rx="0.22"/>`);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${style.size}" height="${style.size}" viewBox="0 0 ${extent} ${extent}"><path fill="${style.light}" d="M0 0h${extent}v${extent}H0z"/><g fill="${style.dark}"><path shape-rendering="crispEdges" d="${squares.join('')}"/>${shaped.join('')}</g></svg>`;
  }
  const image = new PNG({ width: style.size, height: style.size });
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const dark = rgb(style.dark),
    light = rgb(style.light);
  for (let py = 0; py < style.size; py++) {
    const my = ((py + 0.5) * extent) / style.size - 4;
    const row = Math.floor(my),
      fy = my - row;
    for (let px = 0; px < style.size; px++) {
      const mx = ((px + 0.5) * extent) / style.size - 4;
      const col = Math.floor(mx),
        fx = mx - col;
      let ink =
        row >= 0 && col >= 0 && row < modules.size && col < modules.size && !!modules.get(row, col);
      if (ink && !modules.isReserved(row, col)) {
        if (style.shape === 'dots') ink = (fx - 0.5) ** 2 + (fy - 0.5) ** 2 <= 0.48 ** 2;
        else
          ink =
            Math.max(Math.abs(fx - 0.5) - 0.28, 0) ** 2 +
              Math.max(Math.abs(fy - 0.5) - 0.28, 0) ** 2 <=
            0.22 ** 2;
      }
      const index = (py * style.size + px) * 4;
      const color = ink ? dark : light;
      image.data[index] = color[0];
      image.data[index + 1] = color[1];
      image.data[index + 2] = color[2];
      image.data[index + 3] = 255;
    }
  }
  return PNG.sync.write(image);
}
