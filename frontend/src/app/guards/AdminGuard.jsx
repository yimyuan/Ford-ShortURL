import { useEffect, useRef, useState } from 'react';
import PageShell from '../../shared/components/PageShell.jsx';
import { Button, Icon } from '../../shared/ui/index.js';
import { isAdmin } from '../navigation.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import AuthDialog from '../../features/auth/components/AuthDialog.jsx';

export default function AdminGuard({ children }) {
  const { status, user, retry, logout } = useAuth();
  const [mode, setMode] = useState('login');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  useEffect(() => {
    if (status === 'anonymous') dialog.current?.showModal();
  }, [status]);
  if (status === 'authenticated' && isAdmin(user)) return children;
  async function switchAccount() {
    setBusy(true);
    setNotice('');
    try {
      await logout();
    } catch {
      setNotice('ยังออกจากระบบไม่ได้ กรุณาลองอีกครั้ง');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageShell
        title={
          status === 'loading'
            ? 'กำลังตรวจสอบบัญชี'
            : status === 'error'
              ? 'ยังตรวจสอบบัญชีไม่ได้'
              : user
                ? 'บัญชีนี้ไม่มีสิทธิ์ Admin'
                : 'เข้าสู่ระบบผู้ดูแล'
        }
      >
        <p role="status">
          {status === 'loading'
            ? 'กรุณารอสักครู่…'
            : status === 'error'
              ? 'กรุณาตรวจสอบว่าหลังบ้านทำงานอยู่ แล้วลองอีกครั้ง'
              : user
                ? `คุณเข้าสู่ระบบด้วย ${user.email} พื้นที่นี้สำหรับผู้ดูแลระบบเท่านั้น`
                : 'เข้าสู่ระบบด้วยบัญชี Admin เพื่อดูแลผู้ใช้และลิงก์ของระบบ'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {status === 'error' && (
            <Button onClick={retry}>
              ลองอีกครั้ง <Icon name="refresh" width="17" />
            </Button>
          )}
          {status === 'anonymous' && (
            <Button
              onClick={() => {
                setMode('login');
                setNotice('');
                dialog.current.showModal();
              }}
            >
              เข้าสู่ระบบ <Icon name="arrow" width="17" />
            </Button>
          )}
          {user && (
            <Button disabled={busy} onClick={switchAccount}>
              {busy ? 'กำลังออกจากระบบ…' : 'เข้าสู่ระบบด้วยบัญชีอื่น'}
            </Button>
          )}
          <Button variant="outline" href="#/">
            กลับหน้าเว็บไซต์
          </Button>
        </div>
        {notice && user && (
          <p role="alert" className="mt-4 text-13 text-warning">
            {notice}
          </p>
        )}
      </PageShell>
      <AuthDialog
        dialog={dialog}
        mode={mode}
        setMode={setMode}
        authNotice={notice}
        setAuthNotice={setNotice}
        adminOnly
      />
    </>
  );
}
