import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getUserImpact, manageUser } from '../api.js';
export default function useAdminUserActions(target, onChanged) {
  const { user } = useAuth();
  const dialog = useRef(null);
  const [opened, setOpened] = useState(false);
  const [preview, setPreview] = useState(null);
  const [action, setAction] = useState('');
  const [role, setRole] = useState('user');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const protectedAccount =
    target.isPrimaryAdmin ||
    target.id === user.id ||
    (target.role === 'admin' && !user.isPrimaryAdmin);
  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    dialog.current.showModal();
    setPreview(null);
    setAction('');
    setEmail('');
    setError('');
    setPassword('');
    setDone(false);
    getUserImpact(target.id, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setPreview(data);
          setRole(data.user.role === 'admin' ? 'user' : 'admin');
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message || 'ยังโหลดข้อมูลไม่ได้');
      });
    return () => controller.abort();
  }, [opened, target.id]);
  async function confirm() {
    if (busy || !preview) return;
    setBusy(true);
    setError('');
    try {
      const result = await manageUser(target.id, {
        action,
        confirmed: true,
        version: preview.version,
        ...(action === 'change_role' ? { role } : {}),
        ...(action === 'delete_user'
          ? { emailConfirmation: email, linkCount: preview.linkCount }
          : {}),
      });
      if (result.temporaryPassword) {
        setPassword(result.temporaryPassword);
        setDone(true);
      } else {
        await dialog.current.close();
        onChanged();
      }
    } catch (err) {
      setError(err.message || 'ยังดำเนินการไม่ได้ กรุณาโหลดข้อมูลใหม่เพื่อตรวจสอบผล');
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  async function close() {
    await dialog.current.close();
    if (done) onChanged();
  }
  function closed() {
    setOpened(false);
    setPassword('');
  }
  return {
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
    open: () => setOpened(true),
  };
}
