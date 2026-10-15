import { useEffect, useRef } from 'react';
import { Icon, IconButton, Modal } from '../../../shared/ui/index.js';
import useAdminLinks from '../hooks/useAdminLinks.js';
import AdminLinksContent from './AdminLinksContent.jsx';
export default function AdminOwnerLinksDialog({ owner, revision, onClose }) {
  const dialog = useRef(null);
  const model = useAdminLinks(revision, owner);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  return (
    <Modal
      ref={dialog}
      labelledBy="owner-links-title"
      onClose={onClose}
      className="[&&]:w-[min(1200px,calc(100%_-_32px))] [&&]:max-h-[calc(100svh_-_32px)] [&&_.ui-modal__body]:p-4 sm:[&&_.ui-modal__body]:p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-admin-line pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-admin-sidebar text-white">
            <Icon name="link" width="22" />
          </span>
          <div>
            <h2 id="owner-links-title" className="text-22 font-semibold text-admin-heading-text">
              ลิงก์ของผู้ใช้งาน
            </h2>
            <p className="text-13 text-text-muted">ดูและจัดการลิงก์ของบัญชีที่เลือก</p>
          </div>
        </div>
        <IconButton
          label="ปิดลิงก์ของผู้ใช้งาน"
          icon="close"
          onClick={() => dialog.current.close()}
        />
      </div>
      <div className="space-y-5">
        <AdminLinksContent model={model} />
      </div>
    </Modal>
  );
}
