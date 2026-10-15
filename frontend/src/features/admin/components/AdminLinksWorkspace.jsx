import { useState } from 'react';
import useAdminLinks from '../hooks/useAdminLinks.js';
import AdminLinksContent from './AdminLinksContent.jsx';
import AdminOwnerLinksDialog from './AdminOwnerLinksDialog.jsx';
export default function AdminLinksWorkspace({ revision }) {
  const model = useAdminLinks(revision);
  const [selectedOwner, setSelectedOwner] = useState(null);
  function close() {
    setSelectedOwner(null);
    model.reload();
  }
  return (
    <>
      <AdminLinksContent model={model} onSelectOwner={setSelectedOwner} />
      {selectedOwner && (
        <AdminOwnerLinksDialog owner={selectedOwner} revision={revision} onClose={close} />
      )}
    </>
  );
}
