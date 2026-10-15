import { ApiError } from '../../shared/api/client.js';
import { readPage } from '../../shared/api/pagination.js';
export function validateCustomCode(value) {
  const code = value.trim();
  if (code && !/^[A-Za-z0-9][A-Za-z0-9-]{1,38}[A-Za-z0-9]$/.test(code))
    throw new Error(
      'ชื่อลิงก์ต้องมี 3–40 ตัว ใช้ภาษาอังกฤษ ตัวเลข และ - โดยขึ้นต้นและลงท้ายด้วยตัวอักษรหรือตัวเลข',
    );
  return code;
}
export function validateOriginalUrl(value) {
  try {
    const url = new URL(value.trim());
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    )
      throw new Error();
    return value.trim();
  } catch {
    throw new Error('กรุณาใส่ URL ที่ถูกต้องและขึ้นต้นด้วย https:// หรือ http://');
  }
}
export function readLink(link) {
  if (
    !link ||
    typeof link.id !== 'string' ||
    typeof link.shortCode !== 'string' ||
    typeof link.shortUrl !== 'string' ||
    typeof link.originalUrl !== 'string' ||
    !/^\d{1,19}$/.test(String(link.clickCount)) ||
    !Number.isFinite(Date.parse(link.createdAt))
  ) {
    throw new ApiError(502, 'INVALID_RESPONSE', 'Invalid link response');
  }
  return link;
}
export function readHistory(data) {
  readPage(data);
  return { ...data, items: data.items.map(readLink) };
}
