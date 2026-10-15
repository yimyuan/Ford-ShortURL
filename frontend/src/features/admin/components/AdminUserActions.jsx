import { Button, Icon, Input, Modal } from '../../../shared/ui/index.js';
import useAdminUserActions from '../hooks/useAdminUserActions.js';
import AdminUserSummary from './AdminUserSummary.jsx';
const labels = {
  change_role: 'เปลี่ยนสิทธิ์',
  suspend: 'ระงับบัญชี',
  activate: 'เปิดใช้งานบัญชี',
  reset_password: 'รีเซ็ตรหัสผ่าน',
  delete_user: 'ลบบัญชีถาวร',
};
export default function AdminUserActions({ target, onChanged }) {
  const {
    user,
    dialog,
    preview,
    action,
    setAction,
    role,
    email,
    setEmail,
    error,
    busy,
    password,
    protectedAccount,
    confirm,
    close,
    closed,
    open,
  } = useAdminUserActions(target, onChanged);
  return (
    <>
      {protectedAccount ? (
        <span className="text-14 text-text-muted">
          {target.isPrimaryAdmin
            ? 'บัญชีหลักที่ป้องกันไว้'
            : target.id === user.id
              ? 'บัญชีของคุณ'
              : 'เฉพาะบัญชีหลัก'}
        </span>
      ) : (
        <Button
          variant="info"
          className="[&&]:rounded-xl [&&]:px-4 [&&]:py-2"
          aria-label={`จัดการ ${target.email}`}
          onClick={open}
        >
          จัดการ ⋯
        </Button>
      )}
      <Modal
        ref={dialog}
        labelledBy={`manage-${target.id}`}
        dismissible={!busy && !password}
        onClose={closed}
        className="[&&]:w-[min(560px,calc(100%_-_24px))] [&&_.ui-modal__body]:p-5 sm:[&&_.ui-modal__body]:p-6"
      >
        <div className="flex items-center gap-3 rounded-2xl bg-admin-sidebar px-4 py-4 text-white">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10">
            <Icon name={password ? 'key' : 'users'} width="21" />
          </span>
          <div>
            <h2 id={`manage-${target.id}`} className="text-20 font-semibold leading-8">
              {password
                ? 'รหัสผ่านชั่วคราว'
                : action
                  ? `ยืนยัน${labels[action]}`
                  : 'จัดการผู้ใช้งาน'}
            </h2>
            <p className="text-13 leading-6 text-admin-sidebar-muted">
              {action ? 'ตรวจสอบบัญชีและผลกระทบก่อนยืนยัน' : 'เลือกการจัดการสำหรับบัญชีนี้'}
            </p>
          </div>
        </div>
        <AdminUserSummary account={preview?.user || target} linkCount={preview?.linkCount} />
        {password ? (
          <>
            <p className="mt-5 text-15 leading-7">
              บันทึกรหัสนี้ก่อนปิด หน้านี้แสดงรหัสเพียงครั้งเดียว
              ผู้ใช้ต้องเปลี่ยนรหัสเมื่อเข้าสู่ระบบ และเซสชันเดิมถูกยกเลิกแล้ว
            </p>
            <output className="mt-4 block select-all break-all rounded-xl border border-admin-line bg-admin-soft p-4 font-mono text-20">
              {password}
            </output>
            <Button className="mt-6 w-full" onClick={close}>
              บันทึกรหัสแล้ว · ปิด
            </Button>
          </>
        ) : (
          <>
            {!preview && !error && (
              <p className="mt-5" role="status">
                กำลังตรวจสอบบัญชีและลิงก์…
              </p>
            )}
            {preview && !action && (
              <div className="mt-5 grid gap-3">
                {user.isPrimaryAdmin && (
                  <Button
                    variant="info"
                    onClick={() => setAction('change_role')}
                    className="w-full [&&]:justify-start [&&]:rounded-xl [&&]:px-4 [&&]:py-3 [&&]:whitespace-normal [&&]:text-left"
                  >
                    <Icon name="shield" width="20" className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-15 font-semibold">
                        เปลี่ยนสิทธิ์เป็น {role === 'admin' ? 'Admin' : 'User'}
                      </span>
                      <span className="mt-0.5 block text-13 font-normal text-text-secondary">
                        กำหนดระดับการเข้าถึงระบบ
                      </span>
                    </span>
                    <Icon name="chevron" width="16" className="shrink-0 opacity-60" />
                  </Button>
                )}
                {[
                  preview.user.isActive ? 'suspend' : 'activate',
                  'reset_password',
                  'delete_user',
                ].map((value) => (
                  <Button
                    key={value}
                    variant={
                      value === 'suspend'
                        ? 'warning'
                        : value === 'activate'
                          ? 'success'
                          : value === 'reset_password'
                            ? 'role'
                            : 'danger'
                    }
                    onClick={() => setAction(value)}
                    className="w-full [&&]:justify-start [&&]:rounded-xl [&&]:px-4 [&&]:py-3 [&&]:whitespace-normal [&&]:text-left"
                  >
                    <Icon
                      name={
                        value === 'suspend'
                          ? 'pause'
                          : value === 'activate'
                            ? 'check'
                            : value === 'reset_password'
                              ? 'key'
                              : 'trash'
                      }
                      width="20"
                      className="shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-15 font-semibold">{labels[value]}</span>
                      <span className="mt-0.5 block text-13 font-normal text-text-secondary">
                        {value === 'suspend'
                          ? 'หยุดการเข้าใช้และลิงก์ชั่วคราว'
                          : value === 'activate'
                            ? 'อนุญาตให้บัญชีและลิงก์กลับมาใช้งาน'
                            : value === 'reset_password'
                              ? 'ออกรหัสชั่วคราวให้ผู้ใช้ตั้งรหัสใหม่'
                              : 'ลบบัญชีพร้อมลิงก์ทั้งหมด กู้คืนไม่ได้'}
                      </span>
                    </span>
                    <Icon name="chevron" width="16" className="shrink-0 opacity-60" />
                  </Button>
                ))}
              </div>
            )}
            {preview && action && (
              <div className="mt-5 space-y-4 text-16 leading-7">
                <p
                  className={
                    action === 'delete_user'
                      ? 'rounded-xl border border-danger/20 bg-danger-surface px-4 py-3 font-medium text-danger'
                      : action === 'suspend'
                        ? 'rounded-xl border border-warning/20 bg-warning-surface px-4 py-3 font-medium text-warning'
                        : action === 'activate'
                          ? 'rounded-xl border border-success/20 bg-success-surface px-4 py-3 font-medium text-success'
                          : action === 'reset_password'
                            ? 'rounded-xl border border-role/20 bg-role-surface px-4 py-3 font-medium text-role'
                            : 'rounded-xl border border-info/20 bg-info-surface px-4 py-3 font-medium text-info'
                  }
                >
                  {labels[action]}
                </p>
                <p>
                  {action === 'change_role'
                    ? `เปลี่ยนสิทธิ์ ${preview.user.role === 'admin' ? 'Admin' : 'User'} → ${role === 'admin' ? 'Admin' : 'User'} และออกจากระบบทุกอุปกรณ์`
                    : action === 'suspend'
                      ? `ออกจากระบบทุกอุปกรณ์ และหยุดลิงก์ ${preview.linkCount} รายการชั่วคราว`
                      : action === 'activate'
                        ? 'เปิดให้เข้าสู่ระบบ และให้ลิงก์ที่ยังเปิดใช้งานกลับมาใช้ได้'
                        : action === 'reset_password'
                          ? 'สุ่มรหัสชั่วคราว บังคับเปลี่ยนรหัสเมื่อเข้าครั้งถัดไป และออกจากระบบทุกอุปกรณ์'
                          : `ลบบัญชีและลิงก์ทั้งหมด ${preview.linkCount} รายการถาวร กู้คืนผ่านระบบไม่ได้`}
                </p>
                {action === 'delete_user' && (
                  <label className="block text-15">
                    พิมพ์อีเมลบัญชีนี้เพื่อยืนยัน
                    <Input
                      autoComplete="off"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="mt-2"
                    />
                  </label>
                )}
              </div>
            )}
            {error && (
              <p className="mt-4 text-15 leading-7 text-warning" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-admin-line pt-4">
              <Button
                variant="outline"
                className="[&&]:rounded-xl [&&]:border-admin-line [&&]:bg-white [&&]:px-5"
                disabled={busy}
                onClick={close}
              >
                ยกเลิก
              </Button>
              {action && preview && (
                <Button
                  variant={
                    action === 'delete_user'
                      ? 'danger'
                      : action === 'suspend'
                        ? 'warning'
                        : action === 'activate'
                          ? 'success'
                          : action === 'reset_password'
                            ? 'role'
                            : 'info'
                  }
                  disabled={busy || (action === 'delete_user' && email !== preview.user.email)}
                  onClick={confirm}
                >
                  {busy ? 'กำลังดำเนินการ…' : `ยืนยัน${labels[action]}`}
                </Button>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
