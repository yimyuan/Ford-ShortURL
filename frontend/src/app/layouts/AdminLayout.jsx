import { useState } from 'react';
import AdminSidebar from '../../features/admin/components/AdminSidebar.jsx';
import AdminHeader from '../../features/admin/components/AdminHeader.jsx';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import useSignOut from '../../features/auth/hooks/useSignOut.js';
export default function AdminLayout({ section, label, onSelect, children }) {
  const { user } = useAuth();
  const { busy: loggingOut, error: logoutNotice, signOut } = useSignOut();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-svh bg-admin-canvas text-16 leading-[1.8] text-text [--color-info:var(--color-admin-sidebar-active)] [--color-info-surface:var(--color-admin-soft)] [--color-role:var(--color-admin-heading-text)] [--color-role-surface:var(--color-admin-heading)]">
      <AdminSidebar
        section={section}
        onSelect={(next) => {
          onSelect(next);
          setSidebarOpen(false);
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="min-w-0 lg:ml-72">
        <AdminHeader
          label={label}
          user={user}
          loggingOut={loggingOut}
          signOut={signOut}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1600px] space-y-7 p-5 sm:p-8 xl:p-10">
          {logoutNotice && (
            <p
              role="alert"
              className="rounded-xl bg-warning-surface px-5 py-3 text-16 text-warning"
            >
              {logoutNotice}
            </p>
          )}
          {children}
          <footer className="flex flex-wrap justify-between gap-2 pb-2 pt-2 font-display text-13 text-text-muted">
            <span>© {new Date().getFullYear()} ShortURL</span>
            <span>One workspace. Every connection.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
