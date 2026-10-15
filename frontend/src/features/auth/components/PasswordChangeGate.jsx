import { Button, Input, Modal } from '../../../shared/ui/index.js';
import PageShell from '../../../shared/components/PageShell.jsx';
import usePasswordChange from '../hooks/usePasswordChange.js';
export default function PasswordChangeGate({ children }) {
  const {
    user,
    dialog,
    current,
    setCurrent,
    password,
    setPassword,
    repeat,
    setRepeat,
    busy,
    error,
    notice,
    setNotice,
    mode,
    prepare,
    prepareLogout,
    confirm,
  } = usePasswordChange();
  if (!user?.mustChangePassword)
    return (
      <>
        {notice && (
          <p
            role="status"
            className="fixed inset-x-4 top-4 z-50 mx-auto max-w-xl rounded-xl border border-admin-line bg-admin-panel p-4 text-center text-16"
          >
            {notice}
            <button className="ml-4 underline" onClick={() => setNotice('')}>
              ปิด
            </button>
          </p>
        )}
        {children}
      </>
    );
  return (
    <PageShell title="ตั้งรหัสผ่านใหม่">
      <p className="text-16 leading-7">
        บัญชี {user.email} ได้รับการรีเซ็ตรหัสผ่าน กรุณาเปลี่ยนรหัสก่อนใช้งาน
      </p>
      <form onSubmit={prepare} className="mx-auto mt-6 max-w-md space-y-4 text-left">
        <label className="block space-y-2 text-16">
          รหัสผ่านชั่วคราว
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={current}
            maxLength={1024}
            onChange={(event) => setCurrent(event.target.value)}
          />
        </label>
        <label className="block space-y-2 text-16">
          รหัสผ่านใหม่ (อย่างน้อย 10 ตัวอักษร)
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={1024}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="block space-y-2 text-16">
          ยืนยันรหัสผ่านใหม่
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={1024}
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-15 text-warning">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            เปลี่ยนรหัสผ่าน
          </Button>
          <Button variant="outline" disabled={busy} onClick={prepareLogout}>
            ออกจากระบบ
          </Button>
        </div>
      </form>
      <Modal ref={dialog} labelledBy="password-confirm-title" dismissible={!busy}>
        <h2 id="password-confirm-title" className="text-24 font-semibold">
          {mode === 'logout' ? 'ยืนยันออกจากระบบ' : 'ยืนยันเปลี่ยนรหัสผ่าน'}
        </h2>
        <p className="mt-3 text-16 leading-7">
          {mode === 'logout'
            ? 'ออกจากบัญชีนี้และกลับไปหน้าเข้าสู่ระบบ'
            : `เปลี่ยนรหัสผ่านของ ${user.email} และออกจากระบบทุกอุปกรณ์ คุณต้องเข้าสู่ระบบด้วยรหัสใหม่`}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="outline" disabled={busy} onClick={() => dialog.current.close()}>
            ยกเลิก
          </Button>
          <Button disabled={busy} onClick={confirm}>
            {busy ? 'กำลังดำเนินการ…' : 'ยืนยัน'}
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
}
