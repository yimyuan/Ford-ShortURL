import { useRef } from 'react';
import AdminLayout from '../../../app/layouts/AdminLayout.jsx';
import useAdminWorkspace from '../hooks/useAdminWorkspace.js';
import AdminPageHeading from '../components/AdminPageHeading.jsx';
import AdminOverview from '../components/AdminOverview.jsx';
import AdminRecords from '../components/AdminRecords.jsx';
import AdminInfoDialog from '../components/AdminInfoDialog.jsx';
import AdminHistory from '../components/AdminHistory.jsx';
import AdminLinksWorkspace from '../components/AdminLinksWorkspace.jsx';
export default function AdminDashboardPage() {
  const model = useAdminWorkspace();
  const dialog = useRef(null);
  return (
    <>
      <AdminLayout section={model.section} label={model.current.label} onSelect={model.navigate}>
        <AdminPageHeading model={model} onDetails={() => dialog.current.showModal()} />
        <div key={model.section} className="ui-view-enter space-y-7">
          {model.section === 'overview' ? (
            <AdminOverview model={model} />
          ) : model.section === 'history' ? (
            <AdminHistory revision={model.revision} />
          ) : model.section === 'links' ? (
            <AdminLinksWorkspace revision={model.revision} />
          ) : (
            <AdminRecords model={model} />
          )}
        </div>
      </AdminLayout>
      <AdminInfoDialog dialog={dialog} />
    </>
  );
}
