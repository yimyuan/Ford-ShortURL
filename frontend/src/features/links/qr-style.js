export const defaultQrStyle = Object.freeze({
  dark: '#111827',
  light: '#ffffff',
  size: 512,
  shape: 'square',
});
function luminance(hex) {
  const values = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
export function qrStyleError(style) {
  if (
    !style ||
    ![style.dark, style.light].every((v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) ||
    ![256, 512, 1024].includes(style.size) ||
    (style.shape !== undefined && !['square', 'rounded', 'dots'].includes(style.shape))
  )
    return 'กรุณาเลือกสีและขนาดที่ถูกต้อง';
  return '';
}
export function qrStyleWarning(style) {
  if (qrStyleError(style)) return '';
  if ((luminance(style.light) + 0.05) / (luminance(style.dark) + 0.05) < 4.5)
    return 'สีนี้อาจสแกนยากในบางอุปกรณ์ คุณยังลองใช้และดาวน์โหลดได้';
  return '';
}
export const sameQrStyle = (a, b) =>
  a.dark === b.dark &&
  a.light === b.light &&
  a.size === b.size &&
  (a.shape || 'square') === (b.shape || 'square');
