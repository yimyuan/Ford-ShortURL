import { authService } from './auth.service.js';
function sendSession(res, session, status = 200) {
  res.set('Cache-Control', 'no-store');
  res
    .status(status)
    .json({ user: session.user, accessToken: session.accessToken, expiresAt: session.expiresAt });
}
export async function register(_req, res) {
  sendSession(res, await authService.register(res.locals.input), 201);
}
export async function login(_req, res) {
  sendSession(res, await authService.login(res.locals.input));
}
export async function logout(req, res) {
  await authService.logout(req.accessToken);
  res.set('Cache-Control', 'no-store').sendStatus(204);
}
export function me(req, res) {
  res.set('Cache-Control', 'no-store').json({ user: req.user });
}
export async function changePassword(req, res) {
  await authService.changePassword(req.user, req.body);
  res.set('Cache-Control', 'no-store').sendStatus(204);
}
