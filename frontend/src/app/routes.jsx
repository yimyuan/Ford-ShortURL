import HomePage from '../features/home/pages/HomePage.jsx';
import { useEffect, useState } from 'react';
import MyLinksPage from '../features/links/pages/MyLinksPage.jsx';
import UserDashboardPage from '../features/dashboard/pages/UserDashboardPage.jsx';
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage.jsx';
import PageShell from '../shared/components/PageShell.jsx';
import { Button } from '../shared/ui/index.js';
import AdminGuard from './guards/AdminGuard.jsx';
import PublicGuard from './guards/PublicGuard.jsx';
import { getRoute, paths } from './navigation.js';

export default function AppRoutes() {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const changed = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    const anchor = hash.split('#')[2];
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo(0, 0);
  }, [hash]);
  switch (getRoute(hash)) {
    case 'dashboard':
      return (
        <PublicGuard>
          <UserDashboardPage />
        </PublicGuard>
      );
    case 'my-links':
      return (
        <PublicGuard>
          <MyLinksPage />
        </PublicGuard>
      );
    case 'home':
      return (
        <PublicGuard>
          <HomePage />
        </PublicGuard>
      );
    case 'admin':
      return (
        <AdminGuard>
          <AdminDashboardPage />
        </AdminGuard>
      );
    default:
      return (
        <PageShell title="ไม่พบหน้า">
          <Button href={paths.home}>กลับหน้าหลัก</Button>
        </PageShell>
      );
  }
}
