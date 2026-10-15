import { config } from '../../config.js';
import { AppError } from '../../errors/app-error.js';
export function publicLinkUrl(code, settings = config) {
  let base;
  try {
    base = new URL(settings.publicBaseUrl);
  } catch {
    throw new AppError(503, 'PUBLIC_URL_INVALID', 'Public link domain is not configured');
  }
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== '/' ||
    (settings.production && base.protocol !== 'https:')
  )
    throw new AppError(503, 'PUBLIC_URL_INVALID', 'Public link domain is invalid');
  return new URL(`/r/${code}`, base).href;
}
