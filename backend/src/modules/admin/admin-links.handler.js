import { adminLinksService } from './admin-links.service.js';
export async function owners(req, res) {
  res.json(await adminLinksService.owners(req.user, res.locals.input));
}
export async function list(req, res) {
  res.json(await adminLinksService.list(req.user, req.params.ownerId, res.locals.input));
}
export async function detail(req, res) {
  res.json(await adminLinksService.detail(req.user, req.params.ownerId, req.params.id));
}
export async function qr(req, res) {
  res
    .type('image/svg+xml')
    .send(await adminLinksService.qr(req.user, req.params.ownerId, req.params.id));
}
export async function manage(req, res) {
  res.json(
    await adminLinksService.manage(req.user, req.params.ownerId, req.params.id, res.locals.input),
  );
}
