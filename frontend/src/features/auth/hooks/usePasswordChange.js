import { useRef, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { changeOwnPassword } from '../api.js';
export default function usePasswordChange() {
  const { user, clearSession, logout } = useAuth();
  const dialog = useRef(null);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState('password');
  function prepare(event) {
    event.preventDefault();
    setError('');
    if (password !== repeat) {
      setError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }
    if (password === current) {
      setError('กรุณาตั้งรหัสผ่านใหม่ให้ต่างจากรหัสชั่วคราว');
      return;
    }
    setMode('password');
    dialog.current.showModal();
  }
  function prepareLogout() {
    setMode('logout');
    dialog.current.showModal();
  }
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'logout') await logout();
      else {
        await changeOwnPassword({
          confirmed: true,
          currentPassword: current,
          newPassword: password,
        });
        setCurrent('');
        setPassword('');
        setRepeat('');
        setNotice('เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบด้วยรหัสใหม่');
        clearSession();
      }
    } catch (err) {
      setError(err.message || 'ยังดำเนินการไม่ได้ กรุณาโหลดหน้าใหม่เพื่อตรวจสอบผลก่อนลองอีกครั้ง');
      dialog.current?.close();
      if (err.status === 401) clearSession();
    } finally {
      setBusy(false);
    }
  }
  return {
    user,
    dialog,
    current,
    setCurrent,
    password,
    setPassword,
    repeat,
    setRepeat,
    busy,
    error,
    notice,
    setNotice,
    mode,
    prepare,
    prepareLogout,
    confirm,
  };
}
