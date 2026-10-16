import { linksService } from './links.service.js';
export async function create(req, res) {
  // Required at the HTTP boundary so a client can safely retry a lost response.
  const requestId = req.get('idempotency-key') || '';
  res.status(201).json(await linksService.create(req.user, res.locals.input, requestId));
}
export async function list(req, res) {
  res.json(await linksService.list(req.user, res.locals.input));
}
export async function get(req, res) {
  res.json(await linksService.get(req.user, req.params.id));
}
export async function qr(req, res) {
  res
    .type(res.locals.input.format === 'png' ? 'image/png' : 'image/svg+xml')
    .send(await linksService.qr(req.user, req.params.id, req.query));
}
export async function redirect(req, res) {
  res.set('Cache-Control', 'no-store');
  res.redirect(302, await linksService.redirect(req.params.code, req.method !== 'HEAD'));
}

export async function saveQr(req, res) {
  res.json(await linksService.saveQr(req.user, req.params.id, res.locals.input));
}
