import { adminSections } from '../navigation.js';
import { Brand, Icon, cx } from '../../../shared/ui/index.js';
export default function AdminSidebar({ section, onSelect, open, onClose }) {
  return (
    <>
      {open && (
        <button
          className="ui-menu-backdrop fixed inset-0 z-30 bg-backdrop backdrop-blur-sm lg:hidden"
          aria-label="ปิดเมนูด้านข้าง"
          onClick={onClose}
        />
      )}
      <aside
        id="admin-sidebar"
        className={cx(
          'ui-admin-sidebar fixed inset-y-0 left-0 z-40 w-72 flex-col border-r border-white/10 bg-admin-sidebar px-6 py-7 text-white transition-transform duration-300 lg:translate-x-0',
          open ? 'flex translate-x-0' : 'hidden lg:flex',
        )}
      >
        <div className="[&_.brand]:text-23 [&_.brand]:text-white [&_.brand-mark]:h-12 [&_.brand-mark]:w-9 [&_.brand-mark]:text-47 [&_.brand-mark]:text-white">
          <Brand href="#/admin" label="ShortURL ผู้ดูแลระบบ" />
        </div>
        <div className="mt-2 pl-[52px] font-display text-13 font-semibold tracking-[1.5px] text-admin-sidebar-muted">
          ADMIN WORKSPACE
        </div>
        <p className="mb-4 mt-12 px-3 font-display text-13 font-semibold tracking-[2px] text-admin-sidebar-muted">
          WORKSPACE
        </p>
        <nav aria-label="เมนูผู้ดูแลระบบ" className="flex flex-col gap-2">
          {adminSections.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={section === item.id ? 'page' : undefined}
              className={cx(
                'flex min-h-14 items-center gap-3 rounded-xl px-4 py-3 text-16 text-left transition-colors',
                section === item.id
                  ? 'bg-admin-sidebar-active text-white shadow-md ring-1 ring-white/20'
                  : 'text-admin-sidebar-muted hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon name={item.icon} width="20" height="20" />
              {item.label}
              {section === item.id && <span className="ml-auto size-1.5 rounded-full bg-white" />}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/15 pt-6">
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-admin-sidebar-active text-white">
              <Icon name="shield" width="18" />
            </span>
            <div>
              <p className="text-15 font-semibold">พื้นที่ผู้ดูแลระบบ</p>
              <p className="text-13 text-admin-sidebar-muted">เข้าถึงข้อมูลด้วยสิทธิ์ Admin</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
