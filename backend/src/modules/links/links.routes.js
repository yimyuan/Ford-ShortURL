import { parseQrQuery, parseQrUpdate } from './qr.schema.js';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { parseCreateLink, parseLinkPage } from './links.dto.js';
import { protectAuthWrite } from '../../middleware/csrf.js';
import { createLinkRateLimit } from '../../middleware/rate-limit.js';
import * as handler from './links.handler.js';
export const linksRouter = Router();
linksRouter.get('/', authenticate, validate(parseLinkPage, 'query'), handler.list);
linksRouter.post(
  '/',
  authenticate,
  protectAuthWrite,
  createLinkRateLimit(),
  validate(parseCreateLink),
  handler.create,
);
linksRouter.get('/:id', authenticate, handler.get);
linksRouter.get('/:id/qr', authenticate, validate(parseQrQuery, 'query'), handler.qr);
linksRouter.patch(
  '/:id/qr',
  authenticate,
  protectAuthWrite,
  createLinkRateLimit(),
  validate(parseQrUpdate),
  handler.saveQr,
);
export const redirectRouter = Router();
redirectRouter.get('/:code', handler.redirect);
