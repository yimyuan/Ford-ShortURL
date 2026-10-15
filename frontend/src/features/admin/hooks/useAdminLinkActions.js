import { useEffect, useRef, useState } from 'react';
import { getAdminLink, getAdminLinkQr, manageAdminLink } from '../api.js';
import useQrCode from '../../links/hooks/useQrCode.js';
export default function useAdminLinkActions(ownerId, target, onChanged) {
  const dialog = useRef(null);
  const [opened, setOpened] = useState(false);
  const [detail, setDetail] = useState(null);
  const [action, setAction] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const qr = useQrCode(target.id, (id, options) => getAdminLinkQr(ownerId, id, options));
  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    dialog.current.showModal();
    setDetail(null);
    setAction('');
    setCode('');
    setError('');
    getAdminLink(ownerId, target.id, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setDetail(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message || 'โหลดรายละเอียดไม่ได้');
      });
    return () => controller.abort();
  }, [opened, ownerId, target.id]);
  async function confirm() {
    if (busy || !detail || !action) return;
    setBusy(true);
    setError('');
    try {
      await manageAdminLink(ownerId, target.id, {
        action,
        confirmed: true,
        version: detail.link.version,
        ...(action === 'link_delete' ? { codeConfirmation: code } : {}),
      });
      await dialog.current.close();
      onChanged();
    } catch (err) {
      setError(err.message || 'ยังดำเนินการไม่ได้ กรุณาโหลดข้อมูลใหม่เพื่อตรวจสอบผล');
      setDetail(null);
    } finally {
      setBusy(false);
    }
  }
  function close() {
    dialog.current.close();
  }
  function closed() {
    setOpened(false);
    qr.clear();
  }
  return {
    dialog,
    detail,
    action,
    setAction,
    code,
    setCode,
    busy,
    error,
    qr,
    confirm,
    close,
    closed,
    open: () => setOpened(true),
  };
}
