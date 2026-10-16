import { renderLinkQr } from './qr.renderer.js';
import { defaultQrStyle, parseQrQuery, parseQrUpdate } from './qr.schema.js';
import { publicLinkUrl } from './public-url.js';
import { isValidShortCode } from './short-code.js';
import { randomInt, randomUUID, createHash } from 'node:crypto';
import { config } from '../../config.js';
import { AppError } from '../../errors/app-error.js';
import { linksRepository } from './links.repository.js';
import { linksCache } from './links.cache.js';
import { parseCreateLink, parseLinkId, toLinkDto } from './links.dto.js';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const createShortCode = () =>
  Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join('');
const missing = () => new AppError(404, 'LINK_NOT_FOUND', 'Link not found or unavailable');
export function createLinksService(
  repository = linksRepository,
  {
    settings = config,
    cache = linksCache,
    generate = createShortCode,
    renderQr = renderLinkQr,
  } = {},
) {
  const publicUrl = (code) => publicLinkUrl(code, settings);
  const dto = (row) => ({
    ...toLinkDto(row),
    shortUrl: publicUrl(row.short_code),
    isActive: row.is_active,
    lastClickedAt: row.last_clicked_at ?? null,
  });
  async function owned(identity, id) {
    const row = await repository.findById(parseLinkId(id), identity.id);
    if (!row) throw missing();
    return row;
  }
  return {
    async create(identity, input, requestId = randomUUID()) {
      const { originalUrl, customCode } = parseCreateLink(input);
      if (
        typeof requestId !== 'string' ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)
      )
        throw new AppError(422, 'INVALID_IDEMPOTENCY_KEY', 'Supply a UUID v4 Idempotency-Key');
      const requestHash = createHash('sha256')
        .update(JSON.stringify([originalUrl, customCode || null]))
        .digest('hex');
      publicUrl('validate');
      for (let attempt = 0; attempt < 5; attempt++) {
        const shortCode = customCode || generate();
        try {
          return dto(
            await repository.create({
              userId: identity.id,
              shortCode,
              originalUrl,
              requestId,
              requestHash,
            }),
          );
        } catch (error) {
          if (error.code !== 'SHORT_CODE_COLLISION') throw error;
          if (customCode)
            throw new AppError(409, 'CUSTOM_CODE_TAKEN', 'This short name is already in use');
        }
      }
      throw new AppError(
        503,
        'SHORT_CODE_UNAVAILABLE',
        'Unable to allocate a short link; try again',
      );
    },
    async list(identity, page = { page: 1, pageSize: 10 }) {
      const result = await repository.listByUser(identity.id, page);
      return { ...result, items: result.items.map(dto) };
    },
    async get(identity, id) {
      return dto(await owned(identity, id));
    },
    async saveQr(identity, id, input) {
      input = parseQrUpdate(input);
      await owned(identity, id);
      return repository.saveQr(identity.id, id, input);
    },
    async qr(identity, id, query = {}) {
      const options = parseQrQuery(query);
      const row = await owned(identity, id);
      try {
        return await renderQr(
          publicUrl(row.short_code),
          options.style || row.qr_style || defaultQrStyle,
          options.format,
        );
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(503, 'QR_UNAVAILABLE', 'QR code generation is temporarily unavailable');
      }
    },
    async redirect(code, countClick = true) {
      if (!isValidShortCode(code)) throw missing();
      const cachedId = await cache.get(code);
      let row = await repository.incrementAndResolve(code, cachedId, countClick);
      if (!row && cachedId) row = await repository.incrementAndResolve(code, null, countClick);
      if (!row) throw missing();
      let destination;
      try {
        destination = parseCreateLink({
          originalUrl: row.original_url,
        }).originalUrl;
      } catch {
        throw missing();
      }
      if (row.id !== cachedId) await cache.set(code, row.id);
      return destination;
    },
  };
}
export const linksService = createLinksService();
