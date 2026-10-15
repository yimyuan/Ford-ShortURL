import { Button, Icon, IconButton, Input, Modal } from '../../../shared/ui/index.js';
import useAuthForm from '../hooks/useAuthForm.js';

export default function AuthDialog({
  dialog,
  mode,
  setMode,
  pending = false,
  url,
  authNotice,
  setAuthNotice,
  onAuthenticated,
  adminOnly = false,
}) {
  const { busy, isLogin, changeMode, submit } = useAuthForm({
    dialog,
    mode,
    setMode,
    setAuthNotice,
    onAuthenticated,
  });
  return (
    <Modal ref={dialog} labelledBy="auth-title">
      <div
        className="
      auth-content [&_h2]:text-25 [&_h2]:leading-[1.8] [&_h2]:mb-(--space-8) [&_h2]:font-semibold
      [&_h2]:tracking-[normal] [&_form]:flex [&_form]:flex-col [&_form]:gap-(--space-9) [&_label]:text-14
      [&_label]:font-medium [&_label]:leading-[1.8] max-[600px]:[&_h2]:text-23
     "
      >
        <IconButton
          className="dialog-close [&&]:absolute [&&]:right-(--space-16) [&&]:top-(--space-16)"
          label="ปิดหน้าต่าง"
          icon="close"
          onClick={() => dialog.current.close()}
        />
        <span className="auth-brand block pr-(--space-36) font-display text-22 leading-[1.5] font-bold tracking-[-.6px]">
          ShortURL.
        </span>
        {!adminOnly && (
          <div
            className="
      auth-tabs flex gap-(--space-4) [background:var(--color-surface-raised)] rounded-12 p-(--space-4)
      m-[var(--space-26)_0] [&_button]:[flex:1] [&_button]:min-w-0 [&_button]:[border:0]
      [&_button]:rounded-9 [&_button]:p-[var(--space-11)_var(--space-6)] [&_button]:[background:none]
      [&_button]:text-14 [&_button]:leading-[1.8]
      [&_button[aria-pressed=true]]:[background:var(--color-white)]
      [&_button[aria-pressed=true]]:[box-shadow:0_2px_7px_var(--color-shadow-soft)]
     "
            role="group"
            aria-label="เลือกเข้าสู่ระบบหรือสมัครสมาชิก"
          >
            <button
              type="button"
              disabled={busy}
              aria-pressed={isLogin}
              onClick={() => changeMode('login')}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              disabled={busy}
              aria-pressed={!isLogin}
              onClick={() => changeMode('signup')}
            >
              สมัครสมาชิก
            </button>
          </div>
        )}
        <h2 id="auth-title" className={adminOnly ? 'mt-7' : ''}>
          {adminOnly
            ? 'เข้าสู่ระบบผู้ดูแล'
            : isLogin
              ? 'ยินดีต้อนรับกลับมา'
              : 'เริ่มต้นทุกความเป็นไปได้'}
        </h2>
        <p className="auth-description text-14 text-text-muted leading-[1.95] mb-(--space-22)">
          {adminOnly
            ? 'ใช้บัญชี Admin เพื่อเข้าจัดการระบบ ShortURL'
            : pending
              ? 'เข้าสู่ระบบเพื่อดำเนินการต่อ เราเก็บ URL ของคุณไว้แล้ว'
              : 'พื้นที่สำหรับทุกลิงก์และการแชร์ของคุณ'}
        </p>
        {pending && (
          <div
            className="
      pending-link flex items-start gap-(--space-10) p-(--space-14)
      [background:var(--color-surface-raised)] rounded-12 mb-(--space-22) text-13 leading-[1.8]
      text-text-secondary min-w-0 [&_svg]:mt-(--space-3) [&_span]:min-w-0
      [&_span]:[overflow-wrap:anywhere] [&_span]:[word-break:break-word]
     "
          >
            <Icon name="link" width="18" />
            <span>{url}</span>
          </div>
        )}
        <form onSubmit={submit} aria-busy={busy}>
          <label htmlFor="auth-email">อีเมล</label>
          <Input
            id="auth-email"
            type="email"
            name="email"
            autoComplete="username"
            placeholder="you@example.com"
            disabled={busy}
            required
          />
          <label htmlFor="auth-password">รหัสผ่าน</label>
          <Input
            key={mode}
            id="auth-password"
            name="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={isLogin ? 1 : 10}
            placeholder={isLogin ? 'รหัสผ่านของคุณ' : 'อย่างน้อย 10 ตัวอักษร'}
            disabled={busy}
            required
          />
          <Button
            className="auth-submit [&&]:mt-(--space-7) [&&]:min-h-13 [&&]:whitespace-normal [&&]:text-center"
            type="submit"
            disabled={busy}
          >
            {busy ? 'กำลังดำเนินการ…' : isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            <Icon name="arrow" width="18" />
          </Button>
          {authNotice && (
            <p
              role="status"
              className="auth-notice text-13 leading-[1.95] text-warning [background:var(--color-warning-surface)] p-(--space-13) rounded-10"
            >
              {authNotice}
            </p>
          )}
        </form>
        {!adminOnly && (
          <p
            className="
      auth-switch text-center text-14 leading-[2] text-text-muted mt-(--space-24) [&_button]:text-14
      [&_button]:leading-[1.8] [&_button]:[border:0] [&_button]:[background:none] [&_button]:font-semibold
      [&_button]:[text-decoration:underline] [&_button]:[text-underline-offset:4px]
     "
          >
            {isLogin ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'}{' '}
            <button
              type="button"
              disabled={busy}
              onClick={() => changeMode(isLogin ? 'signup' : 'login')}
            >
              {isLogin ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
            </button>
          </p>
        )}
      </div>
    </Modal>
  );
}
