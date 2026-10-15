import { adminService } from './admin.service.js';
export async function listUsers(req, res) {
  res.json(await adminService.listUsers(req.user, res.locals.input));
}
export async function updateUser(req, res) {
  res.json(await adminService.updateUser(req.user, req.params.id, res.locals.input));
}
export async function listLinks(req, res) {
  res.json(await adminService.listLinks(req.user, res.locals.input));
}
export async function impact(req, res) {
  res.json(await adminService.impact(req.user, req.params.id));
}
export async function history(req, res) {
  res.json(await adminService.history(req.user, res.locals.input));
}
export async function summary(req, res) {
  res.json(await adminService.summary(req.user));
}
