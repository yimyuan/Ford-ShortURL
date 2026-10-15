import { authService } from './auth.service.js';
import { config } from '../../config.js';

const cookieOptions = (path) => ({
  httpOnly: true,
  secure: config.production,
  sameSite: 'strict',
  path,
});
function sendSession(res, session, status = 200) {
  res.cookie('shorturl_access', session.accessToken, {
    ...cookieOptions('/api'),
    maxAge: config.accessTokenTtl * 1000,
  });
  res.cookie('shorturl_refresh', session.refreshToken, {
    ...cookieOptions('/api/auth'),
    maxAge: Math.max(0, session.refreshExpiresAt * 1000 - Date.now()),
  });
  res.set('Cache-Control', 'no-store');
  res.status(status).json({ user: session.user });
}
function clearSession(res) {
  res.clearCookie('shorturl_access', cookieOptions('/api'));
  res.clearCookie('shorturl_refresh', cookieOptions('/api/auth'));
}
export async function register(_req, res) {
  sendSession(res, await authService.register(res.locals.input), 201);
}
export async function login(_req, res) {
  sendSession(res, await authService.login(res.locals.input));
}
export async function refresh(req, res) {
  try {
    sendSession(res, await authService.refresh(req.cookies));
  } catch (error) {
    if (error.status === 401) clearSession(res);
    throw error;
  }
}
export async function logout(req, res) {
  await authService.logout(req.cookies);
  clearSession(res);
  res.set('Cache-Control', 'no-store').sendStatus(204);
}
export function me(req, res) {
  res.set('Cache-Control', 'no-store').json({ user: req.user });
}
export async function changePassword(req, res) {
  await authService.changePassword(req.user, req.body);
  clearSession(res);
  res.sendStatus(204);
}
