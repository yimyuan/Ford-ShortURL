import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { parseAdminAction, parseAuditQuery } from './admin.dto.js';
import { parseAdminUsers, parseAdminLinks } from './admin-query.js';
import { protectAuthWrite } from '../../middleware/csrf.js';
import { createAuthRateLimit } from '../../middleware/rate-limit.js';
import * as handler from './admin.handler.js';
import * as linkHandler from './admin-links.handler.js';
import { parseOwnerList, parseOwnerLinks, parseLinkAction } from './admin-links.dto.js';
export const adminRouter = Router();
const adminOnly = [authenticate, authorize('admin')];
adminRouter.get(
  '/link-owners',
  ...adminOnly,
  validate(parseOwnerList, 'query'),
  linkHandler.owners,
);
adminRouter.get(
  '/link-owners/:ownerId/links',
  ...adminOnly,
  validate(parseOwnerLinks, 'query'),
  linkHandler.list,
);
adminRouter.get('/link-owners/:ownerId/links/:id', ...adminOnly, linkHandler.detail);
adminRouter.get('/link-owners/:ownerId/links/:id/qr', ...adminOnly, linkHandler.qr);
adminRouter.patch(
  '/link-owners/:ownerId/links/:id',
  ...adminOnly,
  protectAuthWrite,
  createAuthRateLimit('admin'),
  validate(parseLinkAction),
  linkHandler.manage,
);
adminRouter.get('/users', ...adminOnly, validate(parseAdminUsers, 'query'), handler.listUsers);
adminRouter.get('/users/:id/impact', ...adminOnly, handler.impact);
adminRouter.patch(
  '/users/:id',
  ...adminOnly,
  protectAuthWrite,
  createAuthRateLimit('admin'),
  validate(parseAdminAction),
  handler.updateUser,
);
adminRouter.get('/links', ...adminOnly, validate(parseAdminLinks, 'query'), handler.listLinks);
adminRouter.get('/summary', ...adminOnly, handler.summary);
adminRouter.get('/history', ...adminOnly, validate(parseAuditQuery, 'query'), handler.history);
