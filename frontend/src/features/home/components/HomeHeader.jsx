import { paths } from '../../../app/navigation.js';
import { Brand, Button, Icon, IconButton } from '../../../shared/ui/index.js';
export default function HomeHeader({ model, activePage = 'home' }) {
  const { user, authStatus, loggingOut, signOut, openAuth, mobileMenu, setMobileMenu } = model;
  return (
    <header
      className="
      topbar w-[min(1360px,calc(100%_-_96px))] mx-[auto] relative grid grid-cols-[1fr_auto_1fr]
      items-center gap-(--space-32) min-h-27 py-(--space-20) z-[2] max-[1200px]:w-[calc(100%_-_64px)]
      max-[1200px]:gap-(--space-24) max-[960px]:grid-cols-[1fr_auto] max-[960px]:min-h-23
      max-[960px]:py-(--space-16) max-[600px]:w-[calc(100%_-_40px)] max-[600px]:min-h-21
     "
    >
      <Brand />
      <nav
        className="
      desktop-nav flex items-center justify-center gap-(--space-36) text-15 font-medium whitespace-nowrap
      [&_a]:relative [&_a]:p-[var(--space-10)_0] [&_a]:text-text-secondary [&_a:hover]:text-text-strong
      [&_.nav-active]:text-text [&_a_span]:ml-(--space-5) [&_a_span]:text-accent-muted
      [&_a[aria-current=page]]:text-text [&_a[aria-current=page]]:underline [&_a[aria-current=page]]:underline-offset-8
      max-[1200px]:gap-(--space-24) max-[960px]:hidden
     "
        aria-label="เมนูหลัก"
      >
        <a href={paths.home} aria-current={activePage === 'home' ? 'page' : undefined}>
          หน้าแรก
        </a>
        {user && (
          <>
            <a href={paths.myLinks} aria-current={activePage === 'my-links' ? 'page' : undefined}>
              ลิงก์ของฉัน
            </a>
            <a
              href={paths.dashboard}
              aria-current={activePage === 'dashboard' ? 'page' : undefined}
            >
              ภาพรวม
            </a>
          </>
        )}
        {!user && (
          <a href={`${paths.home}#how-it-works`}>
            วิธีใช้งาน <span>↗</span>
          </a>
        )}
      </nav>
      <div className="header-actions flex min-w-0 items-center gap-(--space-12) justify-self-end max-[1200px]:[&_.button]:px-(--space-20) max-[960px]:hidden">
        {user ? (
          <>
            <span className="max-w-36 truncate text-12 text-text-secondary" title={user.email}>
              {user.email}
            </span>
            <Button variant="outline" disabled={loggingOut} onClick={signOut}>
              {loggingOut ? 'กำลังออก…' : 'ออกจากระบบ'}
            </Button>
          </>
        ) : authStatus === 'loading' ? (
          <span className="text-12 text-text-muted" role="status">
            กำลังตรวจสอบบัญชี…
          </span>
        ) : (
          <>
            <Button variant="outline" onClick={() => openAuth('login')}>
              เข้าสู่ระบบ
            </Button>
            <Button onClick={() => openAuth('signup')}>
              สมัครสมาชิก <Icon name="arrow" width="16" />
            </Button>
          </>
        )}
      </div>
      <IconButton
        className="
      menu-toggle [&&]:hidden max-[960px]:[&&]:grid max-[960px]:[&&]:place-items-center
      max-[960px]:[&&]:w-[46px] max-[960px]:[&&]:h-[46px]
      max-[960px]:[&&]:[border:1px_solid_var(--color-border-strong)] max-[960px]:[&&]:rounded-full
      max-[960px]:[&&]:[background:var(--color-surface-outline-hover)]
     "
        label={mobileMenu ? 'ปิดเมนู' : 'เปิดเมนู'}
        icon={mobileMenu ? 'close' : 'menu'}
        aria-expanded={mobileMenu}
        aria-controls="mobile-navigation"
        onClick={() => setMobileMenu(!mobileMenu)}
      />
      {mobileMenu && (
        <nav
          id="mobile-navigation"
          className="
      mobile-nav hidden max-[960px]:flex max-[960px]:flex-col max-[960px]:absolute
      max-[960px]:top-[calc(100%_-_4px)] max-[960px]:left-0 max-[960px]:right-0 max-[960px]:z-[5]
      max-[960px]:p-(--space-14) max-[960px]:[border:1px_solid_var(--color-white)]
      max-[960px]:[background:var(--color-surface-menu)] max-[960px]:[backdrop-filter:blur(25px)]
      max-[960px]:rounded-18 max-[960px]:[box-shadow:0_15px_35px_var(--color-menu-shadow)]
      max-[960px]:[&_a]:text-left max-[960px]:[&_a]:p-[var(--space-13)_var(--space-15)]
      max-[960px]:[&_a]:[font:inherit] max-[960px]:[&_a]:text-15 max-[960px]:[&_a]:leading-[1.8]
      max-[960px]:[&_a]:[border:0] max-[960px]:[&_a]:[background:none] max-[960px]:[&_a]:rounded-9
      max-[960px]:[&_button]:text-left max-[960px]:[&_button]:p-[var(--space-13)_var(--space-15)]
      max-[960px]:[&_button]:[font:inherit] max-[960px]:[&_button]:text-15
      max-[960px]:[&_button]:leading-[1.8] max-[960px]:[&_button]:[border:0]
      max-[960px]:[&_button]:[background:none] max-[960px]:[&_button]:rounded-9
      max-[960px]:[&_a:hover]:[background:var(--color-surface-raised)]
      max-[960px]:[&_button:hover]:[background:var(--color-surface-raised)]
     "
          aria-label="เมนูมือถือ"
        >
          <a
            href={paths.home}
            aria-current={activePage === 'home' ? 'page' : undefined}
            onClick={() => setMobileMenu(false)}
          >
            หน้าแรก
          </a>
          {user && (
            <>
              <a
                href={paths.myLinks}
                aria-current={activePage === 'my-links' ? 'page' : undefined}
                onClick={() => setMobileMenu(false)}
              >
                ลิงก์ของฉัน
              </a>
              <a
                href={paths.dashboard}
                aria-current={activePage === 'dashboard' ? 'page' : undefined}
                onClick={() => setMobileMenu(false)}
              >
                ภาพรวม
              </a>
            </>
          )}
          {!user && (
            <a href={`${paths.home}#how-it-works`} onClick={() => setMobileMenu(false)}>
              วิธีใช้งาน
            </a>
          )}
          {user ? (
            <>
              <span className="break-all px-4 py-3 text-12 text-text-muted">{user.email}</span>
              <button disabled={loggingOut} onClick={signOut}>
                {loggingOut ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => openAuth('login')}>เข้าสู่ระบบ</button>
              <button onClick={() => openAuth('signup')}>สมัครสมาชิก ↗</button>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
