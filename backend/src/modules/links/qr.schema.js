import { AppError } from '../../errors/app-error.js';
export const defaultQrStyle = Object.freeze({
  dark: '#111827',
  light: '#ffffff',
  size: 512,
  shape: 'square',
});
export function parseQrStyle(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    (Object.keys(input).length !== 3 && Object.keys(input).length !== 4) ||
    Object.keys(input).some((key) => !['dark', 'light', 'size', 'shape'].includes(key)) ||
    ![input.dark, input.light].every((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) ||
    ![256, 512, 1024].includes(input.size) ||
    (input.shape !== undefined && !['square', 'rounded', 'dots'].includes(input.shape))
  )
    throw new AppError(422, 'INVALID_QR_STYLE', 'Invalid QR colors or size');
  return {
    dark: input.dark.toLowerCase(),
    light: input.light.toLowerCase(),
    size: input.size,
    shape: input.shape || 'square',
  };
}
export function parseQrQuery(query = {}) {
  if (
    Object.keys(query).some((key) => !['dark', 'light', 'size', 'shape', 'format'].includes(key)) ||
    (query.format !== undefined && !['png', 'svg'].includes(query.format))
  )
    throw new AppError(422, 'INVALID_QR_STYLE', 'Invalid QR query');
  const hasStyle = ['dark', 'light', 'size', 'shape'].some((key) => query[key] !== undefined);
  const style = hasStyle
    ? parseQrStyle({
        ...(query.shape !== undefined ? { shape: query.shape } : {}),
        dark: query.dark,
        light: query.light,
        size:
          typeof query.size === 'string' && /^(256|512|1024)$/.test(query.size)
            ? Number(query.size)
            : null,
      })
    : undefined;
  return { style, format: query.format || 'svg' };
}
export function parseQrUpdate(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    input.confirmed !== true ||
    Object.keys(input).some((key) => !['confirmed', 'version', 'style'].includes(key)) ||
    typeof input.version !== 'string' ||
    !/^(0|[1-9]\d{0,18})$/.test(input.version) ||
    BigInt(input.version) > 9223372036854775807n
  )
    throw new AppError(422, 'QR_CONFIRMATION_REQUIRED', 'Confirm changes with a valid revision');
  return { confirmed: true, version: input.version, style: parseQrStyle(input.style) };
}
