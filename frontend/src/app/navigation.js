export const paths = Object.freeze({
  home: '/',
  user: '/user',
  myLinks: '/my-links',
  dashboard: '/dashboard',
  admin: '/admin',
});

export function normalizePath(pathname) {
  return pathname.replace(/\/+$/, '') || '/';
}

export function getRoute(pathname) {
  const path = normalizePath(pathname);
  if (path === paths.home || path === paths.user) return 'home';
  if (path === paths.admin) return 'admin';
  if (path === paths.myLinks) return 'my-links';
  if (path === paths.dashboard) return 'dashboard';
  return 'not-found';
}

export function isAdmin(user) {
  return user?.role === 'admin';
}

export function navigate(path, { replace = false } = {}) {
  if (normalizePath(window.location.pathname) === path) return;
  window.location[replace ? 'replace' : 'assign'](path);
}

export async function completeLogin(user, onUserAuthenticated, redirect = navigate) {
  if (isAdmin(user)) {
    redirect(paths.admin, { replace: true });
    return;
  }
  await onUserAuthenticated?.(user);
}
