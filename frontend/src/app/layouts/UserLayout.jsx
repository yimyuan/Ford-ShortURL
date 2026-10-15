import { useState } from 'react';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import useSignOut from '../../features/auth/hooks/useSignOut.js';
import HomeHeader from '../../features/home/components/HomeHeader.jsx';
import PageShell from '../../shared/components/PageShell.jsx';
import { Button } from '../../shared/ui/index.js';
import { paths } from '../navigation.js';
export default function UserLayout({ title, activePage, children }) {
  const { user, status, retry } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  const { busy: loggingOut, error, signOut } = useSignOut();
  if (status === 'loading')
    return (
      <PageShell title={title}>
        <p role="status">กำลังตรวจสอบบัญชี…</p>
      </PageShell>
    );
  if (!user)
    return (
      <PageShell title={title}>
        <p className="mb-5">
          {status === 'error'
            ? 'ตรวจสอบบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง'
            : 'กรุณาเข้าสู่ระบบเพื่อดูข้อมูลของคุณ'}
        </p>
        {status === 'error' ? (
          <Button onClick={retry}>ลองอีกครั้ง</Button>
        ) : (
          <Button href={paths.home}>ไปหน้าแรกเพื่อเข้าสู่ระบบ</Button>
        )}
      </PageShell>
    );
  return (
    <div className="min-h-svh bg-page">
      <div className="border-b border-admin-line bg-white/80">
        <HomeHeader
          activePage={activePage}
          model={{ user, authStatus: status, loggingOut, signOut, mobileMenu, setMobileMenu }}
        />
      </div>
      <main className="ui-view-enter">
        {error && (
          <p role="alert" className="mx-auto max-w-[1160px] px-5 pt-5 text-danger">
            {error}
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
