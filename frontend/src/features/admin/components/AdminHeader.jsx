import { Button, Icon, IconButton } from '../../../shared/ui/index.js';
export default function AdminHeader({
  label,
  user,
  loggingOut,
  signOut,
  sidebarOpen,
  onOpenSidebar,
}) {
  return (
    <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-admin-line bg-admin-heading px-5 py-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <IconButton
          className="lg:hidden"
          label="เปิดเมนูผู้ดูแล"
          icon="menu"
          aria-controls="admin-sidebar"
          aria-expanded={sidebarOpen}
          onClick={onOpenSidebar}
        />
        <p className="flex items-center gap-2 text-15 text-text-muted">
          <span className="hidden sm:inline">Workspace</span>
          <Icon name="chevron" width="12" height="12" className="hidden sm:block" />
          <span className="font-semibold text-admin-heading-text">{label}</span>
        </p>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="hidden max-w-48 truncate text-14 text-text-muted sm:inline"
          title={user.email}
        >
          {user.email}
        </span>
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-admin-sidebar font-display text-15 font-semibold text-white"
          aria-label="บัญชีผู้ดูแลระบบ"
        >
          {user.email.charAt(0).toUpperCase()}
        </span>
        <Button
          variant="danger"
          className="[&&]:min-h-11 [&&]:rounded-xl [&&]:px-3 [&&]:py-1 [&&]:text-14"
          disabled={loggingOut}
          onClick={signOut}
        >
          {loggingOut ? 'กำลังออก…' : 'ออกจากระบบ'}
        </Button>
      </div>
    </header>
  );
}
