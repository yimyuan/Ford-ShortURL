export const paths = Object.freeze({
  home: '#/',
  user: '#/user',
  myLinks: '#/my-links',
  dashboard: '#/dashboard',
  admin: '#/admin',
});

export function normalizePath(pathname) {
  return pathname.replace(/^#/, '').split('#')[0].replace(/\/+$/, '') || '/';
}

export function getRoute(pathname) {
  const path = normalizePath(pathname);
  if (path === '/' || path === '/user') return 'home';
  if (path === '/admin') return 'admin';
  if (path === '/my-links') return 'my-links';
  if (path === '/dashboard') return 'dashboard';
  return 'not-found';
}

export function isAdmin(user) {
  return user?.role === 'admin';
}

export function navigate(path, { replace = false } = {}) {
  if (window.location.hash === path) return;
  if (replace) {
    window.history.replaceState(null, '', path);
    window.dispatchEvent(new Event('hashchange'));
  } else window.location.hash = path;
}

export async function completeLogin(user, onUserAuthenticated, redirect = navigate) {
  if (isAdmin(user)) {
    redirect(paths.admin, { replace: true });
    return;
  }
  await onUserAuthenticated?.(user);
}
